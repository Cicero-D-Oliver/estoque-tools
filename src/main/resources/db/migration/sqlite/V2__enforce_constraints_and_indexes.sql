-- SQLite não suporta ADD CONSTRAINT. As tabelas são reconstruídas dentro da
-- transação controlada pelo Flyway, preservando IDs e todos os registros.

CREATE TABLE usuarios_v2 (
    id INTEGER PRIMARY KEY,
    versao BIGINT DEFAULT 0 NOT NULL,
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL,
    perfil VARCHAR(20) NOT NULL,
    ativo BOOLEAN NOT NULL,
    CONSTRAINT uk_usuarios_email UNIQUE (email),
    CONSTRAINT ck_usuarios_perfil
        CHECK (perfil IN ('ADMIN', 'OPERADOR', 'CONSULTA')),
    CONSTRAINT ck_usuarios_ativo CHECK (ativo IN (0, 1))
);

CREATE TABLE itens_estoque_v2 (
    id INTEGER PRIMARY KEY,
    versao BIGINT DEFAULT 0 NOT NULL,
    codigo VARCHAR(60) NOT NULL,
    nome VARCHAR(120) NOT NULL,
    categoria VARCHAR(80),
    quantidade_atual INTEGER NOT NULL,
    quantidade_minima INTEGER NOT NULL,
    localizacao VARCHAR(120),
    ativo BOOLEAN NOT NULL,
    CONSTRAINT uk_itens_estoque_codigo UNIQUE (codigo),
    CONSTRAINT ck_itens_estoque_quantidades
        CHECK (quantidade_atual >= 0 AND quantidade_minima >= 0),
    CONSTRAINT ck_itens_estoque_ativo CHECK (ativo IN (0, 1))
);

CREATE TABLE ferramentas_v2 (
    id INTEGER PRIMARY KEY,
    versao BIGINT DEFAULT 0 NOT NULL,
    patrimonio VARCHAR(60) NOT NULL,
    nome VARCHAR(120) NOT NULL,
    categoria VARCHAR(80),
    status VARCHAR(20) NOT NULL,
    responsavel_atual_id BIGINT,
    localizacao VARCHAR(120),
    ativo BOOLEAN NOT NULL,
    CONSTRAINT uk_ferramentas_patrimonio UNIQUE (patrimonio),
    CONSTRAINT ck_ferramentas_status
        CHECK (status IN ('DISPONIVEL', 'EMPRESTADA', 'MANUTENCAO', 'PERDIDA')),
    CONSTRAINT ck_ferramentas_responsavel
        CHECK (
            (status = 'EMPRESTADA' AND responsavel_atual_id IS NOT NULL)
            OR (status <> 'EMPRESTADA' AND responsavel_atual_id IS NULL)
        ),
    CONSTRAINT ck_ferramentas_ativo CHECK (ativo IN (0, 1)),
    CONSTRAINT fk_ferramentas_responsavel
        FOREIGN KEY (responsavel_atual_id) REFERENCES usuarios_v2 (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE movimentacoes_estoque_v2 (
    id INTEGER PRIMARY KEY,
    item_estoque_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,
    tipo_movimentacao VARCHAR(20) NOT NULL,
    quantidade INTEGER NOT NULL,
    data_hora TIMESTAMP NOT NULL,
    observacao VARCHAR(700),
    CONSTRAINT ck_mov_estoque_tipo
        CHECK (tipo_movimentacao IN ('ENTRADA', 'SAIDA', 'CORRECAO')),
    CONSTRAINT fk_mov_estoque_item
        FOREIGN KEY (item_estoque_id) REFERENCES itens_estoque_v2 (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_mov_estoque_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios_v2 (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE movimentacoes_ferramenta_v2 (
    id INTEGER PRIMARY KEY,
    ferramenta_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,
    tipo_movimentacao VARCHAR(20) NOT NULL,
    data_hora TIMESTAMP NOT NULL,
    observacao VARCHAR(700),
    CONSTRAINT ck_mov_ferramenta_tipo
        CHECK (tipo_movimentacao IN ('RETIRADA', 'DEVOLUCAO', 'MANUTENCAO', 'PERDA', 'CORRECAO')),
    CONSTRAINT fk_mov_ferramenta_ferramenta
        FOREIGN KEY (ferramenta_id) REFERENCES ferramentas_v2 (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_mov_ferramenta_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios_v2 (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
);

INSERT INTO usuarios_v2 (id, versao, nome, email, perfil, ativo)
SELECT id, versao, nome, email, perfil, ativo FROM usuarios;

INSERT INTO itens_estoque_v2 (
    id, versao, codigo, nome, categoria, quantidade_atual,
    quantidade_minima, localizacao, ativo
)
SELECT
    id, versao, codigo, nome, categoria, quantidade_atual,
    quantidade_minima, localizacao, ativo
FROM itens_estoque;

INSERT INTO ferramentas_v2 (
    id, versao, patrimonio, nome, categoria, status,
    responsavel_atual_id, localizacao, ativo
)
SELECT
    id, versao, patrimonio, nome, categoria, status,
    responsavel_atual_id, localizacao, ativo
FROM ferramentas;

INSERT INTO movimentacoes_estoque_v2 (
    id, item_estoque_id, usuario_id, tipo_movimentacao,
    quantidade, data_hora, observacao
)
SELECT
    id, item_estoque_id, usuario_id, tipo_movimentacao,
    quantidade, data_hora, observacao
FROM movimentacoes_estoque;

INSERT INTO movimentacoes_ferramenta_v2 (
    id, ferramenta_id, usuario_id, tipo_movimentacao, data_hora, observacao
)
SELECT
    id, ferramenta_id, usuario_id, tipo_movimentacao, data_hora, observacao
FROM movimentacoes_ferramenta;

DROP TABLE movimentacoes_estoque;
DROP TABLE movimentacoes_ferramenta;
DROP TABLE ferramentas;
DROP TABLE itens_estoque;
DROP TABLE usuarios;

ALTER TABLE usuarios_v2 RENAME TO usuarios;
ALTER TABLE itens_estoque_v2 RENAME TO itens_estoque;
ALTER TABLE ferramentas_v2 RENAME TO ferramentas;
ALTER TABLE movimentacoes_estoque_v2 RENAME TO movimentacoes_estoque;
ALTER TABLE movimentacoes_ferramenta_v2 RENAME TO movimentacoes_ferramenta;

CREATE INDEX idx_usuarios_ativo ON usuarios (ativo);
CREATE INDEX idx_itens_estoque_ativo ON itens_estoque (ativo);
CREATE INDEX idx_itens_estoque_categoria ON itens_estoque (categoria);
CREATE INDEX idx_ferramentas_status_ativo ON ferramentas (status, ativo);
CREATE INDEX idx_ferramentas_responsavel ON ferramentas (responsavel_atual_id);
CREATE INDEX idx_mov_estoque_item_data ON movimentacoes_estoque (item_estoque_id, data_hora);
CREATE INDEX idx_mov_estoque_usuario ON movimentacoes_estoque (usuario_id);
CREATE INDEX idx_mov_ferramenta_ferramenta_data
    ON movimentacoes_ferramenta (ferramenta_id, data_hora);
CREATE INDEX idx_mov_ferramenta_usuario ON movimentacoes_ferramenta (usuario_id);
CREATE INDEX idx_mov_ferramenta_tipo_data
    ON movimentacoes_ferramenta (tipo_movimentacao, data_hora);

PRAGMA foreign_key_check;
