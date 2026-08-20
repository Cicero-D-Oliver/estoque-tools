-- Isolamento estrutural dos dados operacionais por organização.
-- Colunas são preenchidas antes de se tornarem obrigatórias para preservar
-- integralmente bancos existentes administrados pelas versões V1-V3.

ALTER TABLE itens_estoque ADD COLUMN organizacao_id BIGINT;
ALTER TABLE ferramentas ADD COLUMN organizacao_id BIGINT;
ALTER TABLE movimentacoes_estoque ADD COLUMN organizacao_id BIGINT;
ALTER TABLE movimentacoes_ferramenta ADD COLUMN organizacao_id BIGINT;

UPDATE itens_estoque
   SET organizacao_id = (
       SELECT id
         FROM organizacoes
        WHERE nome = 'Organização Legada'
          AND criada_em = TIMESTAMP '2000-01-01 00:00:00'
        ORDER BY id
        LIMIT 1
   )
 WHERE organizacao_id IS NULL;

UPDATE ferramentas
   SET organizacao_id = (
       SELECT id
         FROM organizacoes
        WHERE nome = 'Organização Legada'
          AND criada_em = TIMESTAMP '2000-01-01 00:00:00'
        ORDER BY id
        LIMIT 1
   )
 WHERE organizacao_id IS NULL;

UPDATE movimentacoes_estoque movimentacao
   SET organizacao_id = item.organizacao_id
  FROM itens_estoque item
 WHERE movimentacao.item_estoque_id = item.id
   AND movimentacao.organizacao_id IS NULL;

UPDATE movimentacoes_ferramenta movimentacao
   SET organizacao_id = ferramenta.organizacao_id
  FROM ferramentas ferramenta
 WHERE movimentacao.ferramenta_id = ferramenta.id
   AND movimentacao.organizacao_id IS NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM itens_estoque WHERE organizacao_id IS NULL
        UNION ALL
        SELECT 1 FROM ferramentas WHERE organizacao_id IS NULL
        UNION ALL
        SELECT 1 FROM movimentacoes_estoque WHERE organizacao_id IS NULL
        UNION ALL
        SELECT 1 FROM movimentacoes_ferramenta WHERE organizacao_id IS NULL
    ) THEN
        RAISE EXCEPTION
            'V4 não encontrou a Organização Legada para todos os dados operacionais';
    END IF;
END $$;

ALTER TABLE itens_estoque
    ALTER COLUMN organizacao_id SET NOT NULL,
    DROP CONSTRAINT uk_itens_estoque_codigo,
    ADD CONSTRAINT uk_itens_estoque_organizacao_codigo
        UNIQUE (organizacao_id, codigo),
    ADD CONSTRAINT uk_itens_estoque_organizacao_id
        UNIQUE (organizacao_id, id),
    ADD CONSTRAINT fk_itens_estoque_organizacao
        FOREIGN KEY (organizacao_id) REFERENCES organizacoes (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ferramentas
    ALTER COLUMN organizacao_id SET NOT NULL,
    DROP CONSTRAINT uk_ferramentas_patrimonio,
    ADD CONSTRAINT uk_ferramentas_organizacao_patrimonio
        UNIQUE (organizacao_id, patrimonio),
    ADD CONSTRAINT uk_ferramentas_organizacao_id
        UNIQUE (organizacao_id, id),
    ADD CONSTRAINT fk_ferramentas_organizacao
        FOREIGN KEY (organizacao_id) REFERENCES organizacoes (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE movimentacoes_estoque
    ALTER COLUMN organizacao_id SET NOT NULL,
    ADD CONSTRAINT fk_mov_estoque_organizacao
        FOREIGN KEY (organizacao_id) REFERENCES organizacoes (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    ADD CONSTRAINT fk_mov_estoque_item_organizacao
        FOREIGN KEY (organizacao_id, item_estoque_id)
        REFERENCES itens_estoque (organizacao_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE movimentacoes_ferramenta
    ALTER COLUMN organizacao_id SET NOT NULL,
    ADD CONSTRAINT fk_mov_ferramenta_organizacao
        FOREIGN KEY (organizacao_id) REFERENCES organizacoes (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    ADD CONSTRAINT fk_mov_ferramenta_ferramenta_organizacao
        FOREIGN KEY (organizacao_id, ferramenta_id)
        REFERENCES ferramentas (organizacao_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX idx_itens_estoque_organizacao_ativo
    ON itens_estoque (organizacao_id, ativo);
CREATE INDEX idx_itens_estoque_organizacao_categoria
    ON itens_estoque (organizacao_id, categoria);
CREATE INDEX idx_ferramentas_organizacao_status_ativo
    ON ferramentas (organizacao_id, status, ativo);
CREATE INDEX idx_mov_estoque_organizacao_data
    ON movimentacoes_estoque (organizacao_id, data_hora);
CREATE INDEX idx_mov_ferramenta_organizacao_data
    ON movimentacoes_ferramenta (organizacao_id, data_hora);
