-- SQLite exige reconstrução para remover unicidades globais e adicionar
-- colunas NOT NULL com FKs compostas. O Flyway executa a migração em uma
-- transação, preservando IDs, versões, saldos e históricos.

CREATE TABLE itens_estoque_v4 (
    id INTEGER PRIMARY KEY,
    versao BIGINT DEFAULT 0 NOT NULL,
    organizacao_id BIGINT NOT NULL,
    codigo VARCHAR(60) NOT NULL,
    nome VARCHAR(120) NOT NULL,
    categoria VARCHAR(80),
    quantidade_atual INTEGER NOT NULL,
    quantidade_minima INTEGER NOT NULL,
    localizacao VARCHAR(120),
    ativo BOOLEAN NOT NULL,
    CONSTRAINT uk_itens_estoque_organizacao_codigo
        UNIQUE (organizacao_id, codigo),
    CONSTRAINT uk_itens_estoque_organizacao_id
        UNIQUE (organizacao_id, id),
    CONSTRAINT ck_itens_estoque_quantidades
        CHECK (quantidade_atual >= 0 AND quantidade_minima >= 0),
    CONSTRAINT ck_itens_estoque_ativo CHECK (ativo IN (0, 1)),
    CONSTRAINT fk_itens_estoque_organizacao
        FOREIGN KEY (organizacao_id) REFERENCES organizacoes (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE ferramentas_v4 (
    id INTEGER PRIMARY KEY,
    versao BIGINT DEFAULT 0 NOT NULL,
    organizacao_id BIGINT NOT NULL,
    patrimonio VARCHAR(60) NOT NULL,
    nome VARCHAR(120) NOT NULL,
    categoria VARCHAR(80),
    status VARCHAR(20) NOT NULL,
    responsavel_atual_id BIGINT,
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
    CONSTRAINT ck_ferramentas_ativo CHECK (ativo IN (0, 1)),
    CONSTRAINT fk_ferramentas_responsavel
        FOREIGN KEY (responsavel_atual_id) REFERENCES usuarios (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_ferramentas_organizacao
        FOREIGN KEY (organizacao_id) REFERENCES organizacoes (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE movimentacoes_estoque_v4 (
    id INTEGER PRIMARY KEY,
    organizacao_id BIGINT NOT NULL,
    item_estoque_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,
    tipo_movimentacao VARCHAR(20) NOT NULL,
    quantidade INTEGER NOT NULL,
    data_hora TIMESTAMP NOT NULL,
    observacao VARCHAR(700),
    CONSTRAINT ck_mov_estoque_tipo
        CHECK (tipo_movimentacao IN ('ENTRADA', 'SAIDA', 'CORRECAO')),
    CONSTRAINT fk_mov_estoque_organizacao
        FOREIGN KEY (organizacao_id) REFERENCES organizacoes (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_mov_estoque_item
        FOREIGN KEY (item_estoque_id) REFERENCES itens_estoque_v4 (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_mov_estoque_item_organizacao
        FOREIGN KEY (organizacao_id, item_estoque_id)
        REFERENCES itens_estoque_v4 (organizacao_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_mov_estoque_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE movimentacoes_ferramenta_v4 (
    id INTEGER PRIMARY KEY,
    organizacao_id BIGINT NOT NULL,
    ferramenta_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,
    tipo_movimentacao VARCHAR(20) NOT NULL,
    data_hora TIMESTAMP NOT NULL,
    observacao VARCHAR(700),
    CONSTRAINT ck_mov_ferramenta_tipo
        CHECK (tipo_movimentacao IN ('RETIRADA', 'DEVOLUCAO', 'MANUTENCAO', 'PERDA', 'CORRECAO')),
    CONSTRAINT fk_mov_ferramenta_organizacao
        FOREIGN KEY (organizacao_id) REFERENCES organizacoes (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_mov_ferramenta_ferramenta
        FOREIGN KEY (ferramenta_id) REFERENCES ferramentas_v4 (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_mov_ferramenta_ferramenta_organizacao
        FOREIGN KEY (organizacao_id, ferramenta_id)
        REFERENCES ferramentas_v4 (organizacao_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_mov_ferramenta_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
);

INSERT INTO itens_estoque_v4 (
    id, versao, organizacao_id, codigo, nome, categoria,
    quantidade_atual, quantidade_minima, localizacao, ativo
)
SELECT
    item.id, item.versao,
    (
        SELECT organizacao.id
          FROM organizacoes organizacao
         WHERE organizacao.nome = 'Organização Legada'
           AND organizacao.criada_em = '2000-01-01 00:00:00'
         ORDER BY organizacao.id
         LIMIT 1
    ),
    item.codigo, item.nome, item.categoria, item.quantidade_atual,
    item.quantidade_minima, item.localizacao, item.ativo
FROM itens_estoque item;

INSERT INTO ferramentas_v4 (
    id, versao, organizacao_id, patrimonio, nome, categoria,
    status, responsavel_atual_id, localizacao, ativo
)
SELECT
    ferramenta.id, ferramenta.versao,
    (
        SELECT organizacao.id
          FROM organizacoes organizacao
         WHERE organizacao.nome = 'Organização Legada'
           AND organizacao.criada_em = '2000-01-01 00:00:00'
         ORDER BY organizacao.id
         LIMIT 1
    ),
    ferramenta.patrimonio, ferramenta.nome, ferramenta.categoria,
    ferramenta.status, ferramenta.responsavel_atual_id,
    ferramenta.localizacao, ferramenta.ativo
FROM ferramentas ferramenta;

INSERT INTO movimentacoes_estoque_v4 (
    id, organizacao_id, item_estoque_id, usuario_id,
    tipo_movimentacao, quantidade, data_hora, observacao
)
SELECT
    movimentacao.id, item.organizacao_id, movimentacao.item_estoque_id,
    movimentacao.usuario_id, movimentacao.tipo_movimentacao,
    movimentacao.quantidade, movimentacao.data_hora, movimentacao.observacao
FROM movimentacoes_estoque movimentacao
JOIN itens_estoque_v4 item ON item.id = movimentacao.item_estoque_id;

INSERT INTO movimentacoes_ferramenta_v4 (
    id, organizacao_id, ferramenta_id, usuario_id,
    tipo_movimentacao, data_hora, observacao
)
SELECT
    movimentacao.id, ferramenta.organizacao_id, movimentacao.ferramenta_id,
    movimentacao.usuario_id, movimentacao.tipo_movimentacao,
    movimentacao.data_hora, movimentacao.observacao
FROM movimentacoes_ferramenta movimentacao
JOIN ferramentas_v4 ferramenta ON ferramenta.id = movimentacao.ferramenta_id;

DROP TABLE movimentacoes_estoque;
DROP TABLE movimentacoes_ferramenta;
DROP TABLE ferramentas;
DROP TABLE itens_estoque;

ALTER TABLE itens_estoque_v4 RENAME TO itens_estoque;
ALTER TABLE ferramentas_v4 RENAME TO ferramentas;
ALTER TABLE movimentacoes_estoque_v4 RENAME TO movimentacoes_estoque;
ALTER TABLE movimentacoes_ferramenta_v4 RENAME TO movimentacoes_ferramenta;

CREATE INDEX idx_itens_estoque_ativo ON itens_estoque (ativo);
CREATE INDEX idx_itens_estoque_categoria ON itens_estoque (categoria);
CREATE INDEX idx_itens_estoque_organizacao_ativo
    ON itens_estoque (organizacao_id, ativo);
CREATE INDEX idx_itens_estoque_organizacao_categoria
    ON itens_estoque (organizacao_id, categoria);
CREATE INDEX idx_ferramentas_status_ativo ON ferramentas (status, ativo);
CREATE INDEX idx_ferramentas_responsavel ON ferramentas (responsavel_atual_id);
CREATE INDEX idx_ferramentas_organizacao_status_ativo
    ON ferramentas (organizacao_id, status, ativo);
CREATE INDEX idx_mov_estoque_item_data
    ON movimentacoes_estoque (item_estoque_id, data_hora);
CREATE INDEX idx_mov_estoque_usuario ON movimentacoes_estoque (usuario_id);
CREATE INDEX idx_mov_estoque_organizacao_data
    ON movimentacoes_estoque (organizacao_id, data_hora);
CREATE INDEX idx_mov_ferramenta_ferramenta_data
    ON movimentacoes_ferramenta (ferramenta_id, data_hora);
CREATE INDEX idx_mov_ferramenta_usuario ON movimentacoes_ferramenta (usuario_id);
CREATE INDEX idx_mov_ferramenta_tipo_data
    ON movimentacoes_ferramenta (tipo_movimentacao, data_hora);
CREATE INDEX idx_mov_ferramenta_organizacao_data
    ON movimentacoes_ferramenta (organizacao_id, data_hora);

PRAGMA foreign_key_check;
