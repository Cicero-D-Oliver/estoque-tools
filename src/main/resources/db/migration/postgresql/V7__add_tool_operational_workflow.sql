-- Estado operacional imediato, transferência explícita e revisão administrativa.
-- V1-V6 permanecem imutáveis; registros anteriores entram como CONFIRMADA sem
-- inventar revisor, enquanto novas movimentações nascem PENDENTE pela aplicação.

ALTER TABLE ferramentas
    ADD COLUMN responsavel_desde TIMESTAMP WITHOUT TIME ZONE,
    ADD COLUMN destino_atual VARCHAR(160);

UPDATE ferramentas ferramenta
   SET responsavel_desde = (
       SELECT MAX(movimentacao.data_hora)
         FROM movimentacoes_ferramenta movimentacao
        WHERE movimentacao.organizacao_id = ferramenta.organizacao_id
          AND movimentacao.ferramenta_id = ferramenta.id
          AND movimentacao.tipo_movimentacao = 'RETIRADA'
   )
 WHERE ferramenta.status = 'EMPRESTADA';

ALTER TABLE movimentacoes_ferramenta
    ADD COLUMN versao BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN responsavel_usuario_id BIGINT,
    ADD COLUMN responsavel_anterior_usuario_id BIGINT,
    ADD COLUMN destino VARCHAR(160),
    ADD COLUMN status_revisao VARCHAR(20),
    ADD COLUMN confirmado_por_usuario_id BIGINT,
    ADD COLUMN confirmado_em TIMESTAMP WITHOUT TIME ZONE;

UPDATE movimentacoes_ferramenta
   SET responsavel_usuario_id = CASE
           WHEN tipo_movimentacao = 'RETIRADA' THEN usuario_id
           ELSE NULL
       END,
       status_revisao = 'CONFIRMADA';

ALTER TABLE movimentacoes_ferramenta
    ALTER COLUMN status_revisao SET DEFAULT 'PENDENTE',
    ALTER COLUMN status_revisao SET NOT NULL,
    DROP CONSTRAINT ck_mov_ferramenta_tipo,
    ADD CONSTRAINT ck_mov_ferramenta_tipo
        CHECK (tipo_movimentacao IN (
            'RETIRADA', 'DEVOLUCAO', 'TRANSFERENCIA',
            'MANUTENCAO', 'PERDA', 'CORRECAO'
        )),
    ADD CONSTRAINT ck_mov_ferramenta_responsabilidade
        CHECK (
            (tipo_movimentacao NOT IN ('RETIRADA', 'TRANSFERENCIA')
                OR responsavel_usuario_id IS NOT NULL)
            AND (tipo_movimentacao <> 'TRANSFERENCIA'
                OR responsavel_anterior_usuario_id IS NOT NULL)
        ),
    ADD CONSTRAINT ck_mov_ferramenta_revisao
        CHECK (
            (status_revisao = 'PENDENTE'
                AND confirmado_por_usuario_id IS NULL
                AND confirmado_em IS NULL)
            OR
            (status_revisao = 'CONFIRMADA'
                AND (
                    (confirmado_por_usuario_id IS NULL AND confirmado_em IS NULL)
                    OR
                    (confirmado_por_usuario_id IS NOT NULL AND confirmado_em IS NOT NULL)
                ))
        ),
    ADD CONSTRAINT fk_mov_ferramenta_responsavel
        FOREIGN KEY (responsavel_usuario_id) REFERENCES usuarios (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    ADD CONSTRAINT fk_mov_ferramenta_responsavel_anterior
        FOREIGN KEY (responsavel_anterior_usuario_id) REFERENCES usuarios (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    ADD CONSTRAINT fk_mov_ferramenta_confirmado_por
        FOREIGN KEY (confirmado_por_usuario_id) REFERENCES usuarios (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    ADD CONSTRAINT fk_mov_ferramenta_executor_membro
        FOREIGN KEY (organizacao_id, usuario_id)
        REFERENCES organizacao_membros (organizacao_id, usuario_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    ADD CONSTRAINT fk_mov_ferramenta_responsavel_membro
        FOREIGN KEY (organizacao_id, responsavel_usuario_id)
        REFERENCES organizacao_membros (organizacao_id, usuario_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    ADD CONSTRAINT fk_mov_ferramenta_responsavel_anterior_membro
        FOREIGN KEY (organizacao_id, responsavel_anterior_usuario_id)
        REFERENCES organizacao_membros (organizacao_id, usuario_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    ADD CONSTRAINT fk_mov_ferramenta_confirmador_membro
        FOREIGN KEY (organizacao_id, confirmado_por_usuario_id)
        REFERENCES organizacao_membros (organizacao_id, usuario_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ferramentas
    ADD CONSTRAINT ck_ferramentas_contexto_operacional
        CHECK (
            status = 'EMPRESTADA'
            OR (responsavel_desde IS NULL AND destino_atual IS NULL)
        ),
    ADD CONSTRAINT fk_ferramentas_responsavel_membro
        FOREIGN KEY (organizacao_id, responsavel_atual_id)
        REFERENCES organizacao_membros (organizacao_id, usuario_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX idx_ferramentas_organizacao_responsavel
    ON ferramentas (organizacao_id, responsavel_atual_id);
CREATE INDEX idx_mov_ferramenta_responsavel
    ON movimentacoes_ferramenta (responsavel_usuario_id);
CREATE INDEX idx_mov_ferramenta_confirmado_por
    ON movimentacoes_ferramenta (confirmado_por_usuario_id);
CREATE INDEX idx_mov_ferramenta_organizacao_revisao_id
    ON movimentacoes_ferramenta (organizacao_id, status_revisao, id);
