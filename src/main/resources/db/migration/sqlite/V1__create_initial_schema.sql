-- Estado legado anterior ao Flyway. Bancos existentes só podem receber baseline
-- em V1 após a guarda beforeBaseline validar estrutura e conteúdo.

CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY,
    ativo BOOLEAN NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    nome VARCHAR(255) NOT NULL,
    perfil VARCHAR(255) NOT NULL CHECK (perfil IN ('ADMIN', 'OPERADOR', 'CONSULTA')),
    versao BIGINT DEFAULT 0 NOT NULL
);

CREATE TABLE itens_estoque (
    id INTEGER PRIMARY KEY,
    ativo BOOLEAN NOT NULL,
    categoria VARCHAR(255),
    codigo VARCHAR(255) NOT NULL UNIQUE,
    localizacao VARCHAR(255),
    nome VARCHAR(255) NOT NULL,
    quantidade_atual INTEGER NOT NULL,
    quantidade_minima INTEGER NOT NULL,
    versao BIGINT DEFAULT 0 NOT NULL
);

CREATE TABLE ferramentas (
    id INTEGER PRIMARY KEY,
    ativo BOOLEAN NOT NULL,
    categoria VARCHAR(255),
    localizacao VARCHAR(255),
    nome VARCHAR(255) NOT NULL,
    patrimonio VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(255) NOT NULL
        CHECK (status IN ('DISPONIVEL', 'EMPRESTADA', 'MANUTENCAO', 'PERDIDA')),
    responsavel_atual_id BIGINT,
    versao BIGINT DEFAULT 0 NOT NULL
);

CREATE TABLE movimentacoes_estoque (
    id INTEGER PRIMARY KEY,
    data_hora TIMESTAMP NOT NULL,
    observacao VARCHAR(255),
    quantidade INTEGER NOT NULL,
    tipo_movimentacao VARCHAR(255) NOT NULL
        CHECK (tipo_movimentacao IN ('ENTRADA', 'SAIDA', 'CORRECAO')),
    item_estoque_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL
);

CREATE TABLE movimentacoes_ferramenta (
    id INTEGER PRIMARY KEY,
    data_hora TIMESTAMP NOT NULL,
    observacao VARCHAR(255),
    tipo_movimentacao VARCHAR(255) NOT NULL
        CHECK (tipo_movimentacao IN ('RETIRADA', 'DEVOLUCAO', 'MANUTENCAO', 'PERDA', 'CORRECAO')),
    ferramenta_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL
);

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
