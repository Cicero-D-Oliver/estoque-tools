-- SQLite nao permite alterar um CHECK existente. A tabela de movimentos e
-- reconstruida preservando integralmente o contrato introduzido pela V7.

CREATE TABLE movimentacoes_ferramenta_v8 (
    id INTEGER PRIMARY KEY,
    versao BIGINT DEFAULT 0 NOT NULL,
    organizacao_id BIGINT NOT NULL,
    ferramenta_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,
    responsavel_usuario_id BIGINT,
    responsavel_anterior_usuario_id BIGINT,
    tipo_movimentacao VARCHAR(20) NOT NULL,
    data_hora TIMESTAMP NOT NULL,
    observacao VARCHAR(700),
    destino VARCHAR(160),
    status_revisao VARCHAR(20) DEFAULT 'PENDENTE' NOT NULL,
    confirmado_por_usuario_id BIGINT,
    confirmado_em TIMESTAMP,
    CONSTRAINT ck_mov_ferramenta_tipo
        CHECK (tipo_movimentacao IN (
            'RETIRADA', 'DEVOLUCAO', 'TRANSFERENCIA',
            'MANUTENCAO', 'CONCLUSAO_MANUTENCAO', 'PERDA', 'CORRECAO'
        )),
    CONSTRAINT ck_mov_ferramenta_responsabilidade
        CHECK (
            (tipo_movimentacao NOT IN ('RETIRADA', 'TRANSFERENCIA')
                OR responsavel_usuario_id IS NOT NULL)
            AND (tipo_movimentacao <> 'TRANSFERENCIA'
                OR responsavel_anterior_usuario_id IS NOT NULL)
        ),
    CONSTRAINT ck_mov_ferramenta_revisao
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
    CONSTRAINT fk_mov_ferramenta_organizacao
        FOREIGN KEY (organizacao_id) REFERENCES organizacoes (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_mov_ferramenta_ferramenta
        FOREIGN KEY (ferramenta_id) REFERENCES ferramentas (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_mov_ferramenta_ferramenta_organizacao
        FOREIGN KEY (organizacao_id, ferramenta_id)
        REFERENCES ferramentas (organizacao_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_mov_ferramenta_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_mov_ferramenta_responsavel
        FOREIGN KEY (responsavel_usuario_id) REFERENCES usuarios (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_mov_ferramenta_responsavel_anterior
        FOREIGN KEY (responsavel_anterior_usuario_id) REFERENCES usuarios (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_mov_ferramenta_confirmado_por
        FOREIGN KEY (confirmado_por_usuario_id) REFERENCES usuarios (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_mov_ferramenta_executor_membro
        FOREIGN KEY (organizacao_id, usuario_id)
        REFERENCES organizacao_membros (organizacao_id, usuario_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_mov_ferramenta_responsavel_membro
        FOREIGN KEY (organizacao_id, responsavel_usuario_id)
        REFERENCES organizacao_membros (organizacao_id, usuario_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_mov_ferramenta_responsavel_anterior_membro
        FOREIGN KEY (organizacao_id, responsavel_anterior_usuario_id)
        REFERENCES organizacao_membros (organizacao_id, usuario_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_mov_ferramenta_confirmador_membro
        FOREIGN KEY (organizacao_id, confirmado_por_usuario_id)
        REFERENCES organizacao_membros (organizacao_id, usuario_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
);

INSERT INTO movimentacoes_ferramenta_v8 (
    id, versao, organizacao_id, ferramenta_id, usuario_id,
    responsavel_usuario_id, responsavel_anterior_usuario_id,
    tipo_movimentacao, data_hora, observacao, destino,
    status_revisao, confirmado_por_usuario_id, confirmado_em
)
SELECT
    id, versao, organizacao_id, ferramenta_id, usuario_id,
    responsavel_usuario_id, responsavel_anterior_usuario_id,
    tipo_movimentacao, data_hora, observacao, destino,
    status_revisao, confirmado_por_usuario_id, confirmado_em
FROM movimentacoes_ferramenta;

DROP TABLE movimentacoes_ferramenta;
ALTER TABLE movimentacoes_ferramenta_v8 RENAME TO movimentacoes_ferramenta;

CREATE INDEX idx_mov_ferramenta_ferramenta_data
    ON movimentacoes_ferramenta (ferramenta_id, data_hora);
CREATE INDEX idx_mov_ferramenta_usuario
    ON movimentacoes_ferramenta (usuario_id);
CREATE INDEX idx_mov_ferramenta_responsavel
    ON movimentacoes_ferramenta (responsavel_usuario_id);
CREATE INDEX idx_mov_ferramenta_confirmado_por
    ON movimentacoes_ferramenta (confirmado_por_usuario_id);
CREATE INDEX idx_mov_ferramenta_tipo_data
    ON movimentacoes_ferramenta (tipo_movimentacao, data_hora);
CREATE INDEX idx_mov_ferramenta_organizacao_data
    ON movimentacoes_ferramenta (organizacao_id, data_hora);
CREATE INDEX idx_mov_ferramenta_organizacao_revisao_id
    ON movimentacoes_ferramenta (organizacao_id, status_revisao, id);

PRAGMA foreign_key_check;
