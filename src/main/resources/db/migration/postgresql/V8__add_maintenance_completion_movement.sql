-- Permite registrar a conclusao normal de uma manutencao sem reutilizar
-- CORRECAO e sem alterar os eventos operacionais existentes.

ALTER TABLE movimentacoes_ferramenta
    DROP CONSTRAINT ck_mov_ferramenta_tipo,
    ADD CONSTRAINT ck_mov_ferramenta_tipo
        CHECK (tipo_movimentacao IN (
            'RETIRADA', 'DEVOLUCAO', 'TRANSFERENCIA',
            'MANUTENCAO', 'CONCLUSAO_MANUTENCAO', 'PERDA', 'CORRECAO'
        ));
