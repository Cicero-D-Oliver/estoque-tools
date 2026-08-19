ALTER TABLE usuarios
    ALTER COLUMN nome TYPE VARCHAR(120),
    ALTER COLUMN email TYPE VARCHAR(254),
    ALTER COLUMN perfil TYPE VARCHAR(20),
    ADD CONSTRAINT ck_usuarios_perfil
        CHECK (perfil IN ('ADMIN', 'OPERADOR', 'CONSULTA'));

ALTER TABLE itens_estoque
    ALTER COLUMN codigo TYPE VARCHAR(60),
    ALTER COLUMN nome TYPE VARCHAR(120),
    ALTER COLUMN categoria TYPE VARCHAR(80),
    ALTER COLUMN localizacao TYPE VARCHAR(120),
    ADD CONSTRAINT ck_itens_estoque_quantidades
        CHECK (quantidade_atual >= 0 AND quantidade_minima >= 0);

ALTER TABLE ferramentas
    ALTER COLUMN patrimonio TYPE VARCHAR(60),
    ALTER COLUMN nome TYPE VARCHAR(120),
    ALTER COLUMN categoria TYPE VARCHAR(80),
    ALTER COLUMN status TYPE VARCHAR(20),
    ALTER COLUMN localizacao TYPE VARCHAR(120),
    ADD CONSTRAINT ck_ferramentas_status
        CHECK (status IN ('DISPONIVEL', 'EMPRESTADA', 'MANUTENCAO', 'PERDIDA')),
    ADD CONSTRAINT ck_ferramentas_responsavel
        CHECK (
            (status = 'EMPRESTADA' AND responsavel_atual_id IS NOT NULL)
            OR (status <> 'EMPRESTADA' AND responsavel_atual_id IS NULL)
        ),
    ADD CONSTRAINT fk_ferramentas_responsavel
        FOREIGN KEY (responsavel_atual_id) REFERENCES usuarios (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE movimentacoes_estoque
    ALTER COLUMN tipo_movimentacao TYPE VARCHAR(20),
    ALTER COLUMN observacao TYPE VARCHAR(700),
    ADD CONSTRAINT ck_mov_estoque_tipo
        CHECK (tipo_movimentacao IN ('ENTRADA', 'SAIDA', 'CORRECAO')),
    ADD CONSTRAINT fk_mov_estoque_item
        FOREIGN KEY (item_estoque_id) REFERENCES itens_estoque (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    ADD CONSTRAINT fk_mov_estoque_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE movimentacoes_ferramenta
    ALTER COLUMN tipo_movimentacao TYPE VARCHAR(20),
    ALTER COLUMN observacao TYPE VARCHAR(700),
    ADD CONSTRAINT ck_mov_ferramenta_tipo
        CHECK (tipo_movimentacao IN ('RETIRADA', 'DEVOLUCAO', 'MANUTENCAO', 'PERDA', 'CORRECAO')),
    ADD CONSTRAINT fk_mov_ferramenta_ferramenta
        FOREIGN KEY (ferramenta_id) REFERENCES ferramentas (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    ADD CONSTRAINT fk_mov_ferramenta_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT;

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
