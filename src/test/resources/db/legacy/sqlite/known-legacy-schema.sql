CREATE TABLE usuarios (
    id integer,
    ativo boolean not null,
    email varchar(255) not null unique,
    nome varchar(255) not null,
    perfil varchar(255) not null
        check (perfil in ('ADMIN','OPERADOR','CONSULTA')),
    versao BIGINT DEFAULT 0 not null,
    primary key (id)
);

CREATE TABLE itens_estoque (
    id integer,
    ativo boolean not null,
    categoria varchar(255),
    codigo varchar(255) not null unique,
    localizacao varchar(255),
    nome varchar(255) not null,
    quantidade_atual integer not null,
    quantidade_minima integer not null,
    versao BIGINT DEFAULT 0 not null,
    primary key (id)
);

CREATE TABLE ferramentas (
    id integer,
    ativo boolean not null,
    categoria varchar(255),
    localizacao varchar(255),
    nome varchar(255) not null,
    patrimonio varchar(255) not null unique,
    status varchar(255) not null
        check (status in ('DISPONIVEL','EMPRESTADA','MANUTENCAO','PERDIDA')),
    responsavel_atual_id bigint,
    versao BIGINT DEFAULT 0 not null,
    primary key (id)
);

CREATE TABLE movimentacoes_estoque (
    id integer,
    data_hora timestamp not null,
    observacao varchar(255),
    quantidade integer not null,
    tipo_movimentacao varchar(255) not null
        check (tipo_movimentacao in ('ENTRADA','SAIDA','CORRECAO')),
    item_estoque_id bigint not null,
    usuario_id bigint not null,
    primary key (id)
);

CREATE TABLE movimentacoes_ferramenta (
    id integer,
    data_hora timestamp not null,
    observacao varchar(255),
    tipo_movimentacao varchar(255) not null
        check (tipo_movimentacao in ('RETIRADA','DEVOLUCAO','MANUTENCAO','PERDA','CORRECAO')),
    ferramenta_id bigint not null,
    usuario_id bigint not null,
    primary key (id)
);

CREATE INDEX idx_usuarios_ativo on usuarios (ativo);
CREATE INDEX idx_itens_estoque_ativo on itens_estoque (ativo);
CREATE INDEX idx_itens_estoque_categoria on itens_estoque (categoria);
CREATE INDEX idx_ferramentas_status_ativo on ferramentas (status, ativo);
CREATE INDEX idx_ferramentas_responsavel on ferramentas (responsavel_atual_id);
CREATE INDEX idx_mov_estoque_item_data
    on movimentacoes_estoque (item_estoque_id, data_hora);
CREATE INDEX idx_mov_estoque_usuario on movimentacoes_estoque (usuario_id);
CREATE INDEX idx_mov_ferramenta_ferramenta_data
    on movimentacoes_ferramenta (ferramenta_id, data_hora);
CREATE INDEX idx_mov_ferramenta_usuario on movimentacoes_ferramenta (usuario_id);
CREATE INDEX idx_mov_ferramenta_tipo_data
    on movimentacoes_ferramenta (tipo_movimentacao, data_hora);

INSERT INTO usuarios (id, ativo, email, nome, perfil, versao) VALUES
    (1, 1, 'admin@example.com', 'Administrador', 'ADMIN', 0),
    (2, 1, 'operador@example.com', 'Operador', 'OPERADOR', 2),
    (3, 0, 'consulta@example.com', 'Consulta', 'CONSULTA', 1);

INSERT INTO itens_estoque (
    id, ativo, categoria, codigo, localizacao, nome,
    quantidade_atual, quantidade_minima, versao
) VALUES
    (1, 1, 'EPI', 'ITEM-001', 'A1', 'Capacete', 10, 2, 0),
    (2, 1, NULL, 'ITEM-002', NULL, 'Luva', 5, 1, 3);

INSERT INTO ferramentas (
    id, ativo, categoria, localizacao, nome, patrimonio,
    status, responsavel_atual_id, versao
) VALUES
    (1, 1, 'Eletrica', 'Oficina', 'Furadeira', 'PAT-001', 'DISPONIVEL', NULL, 0),
    (2, 1, NULL, NULL, 'Multimetro', 'PAT-002', 'EMPRESTADA', 2, 4);

INSERT INTO movimentacoes_estoque (
    id, data_hora, observacao, quantidade, tipo_movimentacao,
    item_estoque_id, usuario_id
) VALUES
    (1, '2026-08-01 10:00:00', 'Entrada inicial', 10, 'ENTRADA', 1, 1);

INSERT INTO movimentacoes_ferramenta (
    id, data_hora, observacao, tipo_movimentacao,
    ferramenta_id, usuario_id
) VALUES
    (1, '2026-08-02 11:30:00', 'Retirada controlada', 'RETIRADA', 2, 2);
