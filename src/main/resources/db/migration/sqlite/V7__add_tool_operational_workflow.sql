-- SQLite exige reconstrução para ampliar os CHECKs e adicionar FKs compostas.
-- IDs, versões e histórico existente são preservados dentro da transação Flyway.

CREATE TABLE ferramentas_v7 (
    id INTEGER PRIMARY KEY,
    versao BIGINT DEFAULT 0 NOT NULL,
    organizacao_id BIGINT NOT NULL,
    patrimonio VARCHAR(60) NOT NULL,
    nome VARCHAR(120) NOT NULL,
    categoria VARCHAR(80),
    status VARCHAR(20) NOT NULL,
    responsavel_atual_id BIGINT,
    responsavel_desde TIMESTAMP,
    destino_atual VARCHAR(160),
    localizacao VARCHAR(120),
    ativo BOOLEAN NOT NULL,
    CONSTRAINT uk_ferramentas_organizacao_patrimonio
        UNIQUE (organizacao_id, patrimonio),
    CONSTRAINT uk_ferramentas_organizacao_id
        UNIQUE (organizacao_id, id),
    CONSTRAINT ck_ferramentas_status
        CHECK (status IN ('DISPONIVEL', 'EMPRESTADA', 'MANUTENCAO', 'PERDIDA')),
    CONSTRAINT ck_ferramentas_responsavel
        CHECK (
            (status = 'EMPRESTADA' AND responsavel_atual_id IS NOT NULL)
            OR (status <> 'EMPRESTADA' AND responsavel_atual_id IS NULL)
        ),
    CONSTRAINT ck_ferramentas_contexto_operacional
        CHECK (
            status = 'EMPRESTADA'
            OR (responsavel_desde IS NULL AND destino_atual IS NULL)
        ),
    CONSTRAINT ck_ferramentas_ativo CHECK (ativo IN (0, 1)),
    CONSTRAINT fk_ferramentas_responsavel
        FOREIGN KEY (responsavel_atual_id) REFERENCES usuarios (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_ferramentas_organizacao
        FOREIGN KEY (organizacao_id) REFERENCES organizacoes (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_ferramentas_responsavel_membro
        FOREIGN KEY (organizacao_id, responsavel_atual_id)
        REFERENCES organizacao_membros (organizacao_id, usuario_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
);

INSERT INTO ferramentas_v7 (
    id, versao, organizacao_id, patrimonio, nome, categoria, status,
    responsavel_atual_id, responsavel_desde, destino_atual, localizacao, ativo
)
SELECT
    ferramenta.id, ferramenta.versao, ferramenta.organizacao_id,
    ferramenta.patrimonio, ferramenta.nome, ferramenta.categoria,
    ferramenta.status, ferramenta.responsavel_atual_id,
    CASE WHEN ferramenta.status = 'EMPRESTADA' THEN (
        SELECT MAX(movimentacao.data_hora)
          FROM movimentacoes_ferramenta movimentacao
         WHERE movimentacao.organizacao_id = ferramenta.organizacao_id
           AND movimentacao.ferramenta_id = ferramenta.id
           AND movimentacao.tipo_movimentacao = 'RETIRADA'
    ) ELSE NULL END,
    NULL, ferramenta.localizacao, ferramenta.ativo
FROM ferramentas ferramenta;

CREATE TABLE movimentacoes_ferramenta_v7 (
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
            'MANUTENCAO', 'PERDA', 'CORRECAO'
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
        FOREIGN KEY (ferramenta_id) REFERENCES ferramentas_v7 (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_mov_ferramenta_ferramenta_organizacao
        FOREIGN KEY (organizacao_id, ferramenta_id)
        REFERENCES ferramentas_v7 (organizacao_id, id)
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

INSERT INTO movimentacoes_ferramenta_v7 (
    id, versao, organizacao_id, ferramenta_id, usuario_id,
    responsavel_usuario_id, responsavel_anterior_usuario_id,
    tipo_movimentacao, data_hora, observacao, destino,
    status_revisao, confirmado_por_usuario_id, confirmado_em
)
SELECT
    movimentacao.id, 0, movimentacao.organizacao_id,
    movimentacao.ferramenta_id, movimentacao.usuario_id,
    CASE WHEN movimentacao.tipo_movimentacao = 'RETIRADA'
        THEN movimentacao.usuario_id ELSE NULL END,
    NULL, movimentacao.tipo_movimentacao, movimentacao.data_hora,
    movimentacao.observacao, NULL, 'CONFIRMADA', NULL, NULL
FROM movimentacoes_ferramenta movimentacao;

DROP TABLE movimentacoes_ferramenta;
DROP TABLE ferramentas;

ALTER TABLE ferramentas_v7 RENAME TO ferramentas;
ALTER TABLE movimentacoes_ferramenta_v7 RENAME TO movimentacoes_ferramenta;

CREATE INDEX idx_ferramentas_status_ativo ON ferramentas (status, ativo);
CREATE INDEX idx_ferramentas_responsavel ON ferramentas (responsavel_atual_id);
CREATE INDEX idx_ferramentas_organizacao_status_ativo
    ON ferramentas (organizacao_id, status, ativo);
CREATE INDEX idx_ferramentas_organizacao_responsavel
    ON ferramentas (organizacao_id, responsavel_atual_id);
CREATE INDEX idx_mov_ferramenta_ferramenta_data
    ON movimentacoes_ferramenta (ferramenta_id, data_hora);
CREATE INDEX idx_mov_ferramenta_usuario ON movimentacoes_ferramenta (usuario_id);
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
