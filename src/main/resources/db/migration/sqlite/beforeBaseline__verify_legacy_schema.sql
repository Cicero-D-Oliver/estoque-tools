-- Interrompe a baseline antes de gravar V1 quando o banco legado não é o
-- schema conhecido ou contém dados que não cabem nas constraints de V2.
CREATE TEMP TABLE flyway_baseline_guard (
    valid INTEGER NOT NULL,
    CONSTRAINT ck_flyway_legacy_schema_matches_v1 CHECK (valid = 1)
);

INSERT INTO flyway_baseline_guard (valid)
SELECT CASE WHEN
    (SELECT COUNT(*) FROM sqlite_master
        WHERE type = 'table'
          AND name IN ('usuarios', 'itens_estoque', 'ferramentas',
                       'movimentacoes_estoque', 'movimentacoes_ferramenta')) = 5
    AND (SELECT group_concat(name || ':' || lower(type) || ':' || "notnull" || ':' || pk, ',')
         FROM pragma_table_info('usuarios')) =
        'id:integer:0:1,ativo:boolean:1:0,email:varchar(255):1:0,nome:varchar(255):1:0,perfil:varchar(255):1:0,versao:bigint:1:0'
    AND (SELECT group_concat(name || ':' || lower(type) || ':' || "notnull" || ':' || pk, ',')
         FROM pragma_table_info('itens_estoque')) =
        'id:integer:0:1,ativo:boolean:1:0,categoria:varchar(255):0:0,codigo:varchar(255):1:0,localizacao:varchar(255):0:0,nome:varchar(255):1:0,quantidade_atual:integer:1:0,quantidade_minima:integer:1:0,versao:bigint:1:0'
    AND (SELECT group_concat(name || ':' || lower(type) || ':' || "notnull" || ':' || pk, ',')
         FROM pragma_table_info('ferramentas')) =
        'id:integer:0:1,ativo:boolean:1:0,categoria:varchar(255):0:0,localizacao:varchar(255):0:0,nome:varchar(255):1:0,patrimonio:varchar(255):1:0,status:varchar(255):1:0,responsavel_atual_id:bigint:0:0,versao:bigint:1:0'
    AND (SELECT group_concat(name || ':' || lower(type) || ':' || "notnull" || ':' || pk, ',')
         FROM pragma_table_info('movimentacoes_estoque')) =
        'id:integer:0:1,data_hora:timestamp:1:0,observacao:varchar(255):0:0,quantidade:integer:1:0,tipo_movimentacao:varchar(255):1:0,item_estoque_id:bigint:1:0,usuario_id:bigint:1:0'
    AND (SELECT group_concat(name || ':' || lower(type) || ':' || "notnull" || ':' || pk, ',')
         FROM pragma_table_info('movimentacoes_ferramenta')) =
        'id:integer:0:1,data_hora:timestamp:1:0,observacao:varchar(255):0:0,tipo_movimentacao:varchar(255):1:0,ferramenta_id:bigint:1:0,usuario_id:bigint:1:0'
    AND (SELECT COUNT(*) FROM sqlite_master
         WHERE type = 'index' AND name IN (
             'idx_usuarios_ativo', 'idx_itens_estoque_ativo',
             'idx_itens_estoque_categoria', 'idx_ferramentas_status_ativo',
             'idx_ferramentas_responsavel', 'idx_mov_estoque_item_data',
             'idx_mov_estoque_usuario', 'idx_mov_ferramenta_ferramenta_data',
             'idx_mov_ferramenta_usuario', 'idx_mov_ferramenta_tipo_data'
         )) = 10
    AND EXISTS (
        SELECT 1 FROM pragma_index_list('usuarios') indexes
        JOIN pragma_index_info(indexes.name) columns ON columns.name = 'email'
        WHERE indexes."unique" = 1
    )
    AND EXISTS (
        SELECT 1 FROM pragma_index_list('itens_estoque') indexes
        JOIN pragma_index_info(indexes.name) columns ON columns.name = 'codigo'
        WHERE indexes."unique" = 1
    )
    AND EXISTS (
        SELECT 1 FROM pragma_index_list('ferramentas') indexes
        JOIN pragma_index_info(indexes.name) columns ON columns.name = 'patrimonio'
        WHERE indexes."unique" = 1
    )
    AND NOT EXISTS (SELECT email FROM usuarios GROUP BY email HAVING COUNT(*) > 1)
    AND NOT EXISTS (SELECT codigo FROM itens_estoque GROUP BY codigo HAVING COUNT(*) > 1)
    AND NOT EXISTS (SELECT patrimonio FROM ferramentas GROUP BY patrimonio HAVING COUNT(*) > 1)
    AND NOT EXISTS (
        SELECT 1 FROM usuarios
        WHERE perfil NOT IN ('ADMIN', 'OPERADOR', 'CONSULTA')
           OR ativo NOT IN (0, 1) OR versao < 0
           OR length(nome) > 120 OR length(email) > 254
    )
    AND NOT EXISTS (
        SELECT 1 FROM itens_estoque
        WHERE quantidade_atual < 0 OR quantidade_minima < 0
           OR ativo NOT IN (0, 1) OR versao < 0
           OR length(codigo) > 60 OR length(nome) > 120
           OR length(categoria) > 80 OR length(localizacao) > 120
    )
    AND NOT EXISTS (
        SELECT 1 FROM ferramentas
        WHERE status NOT IN ('DISPONIVEL', 'EMPRESTADA', 'MANUTENCAO', 'PERDIDA')
           OR ativo NOT IN (0, 1) OR versao < 0
           OR length(patrimonio) > 60 OR length(nome) > 120
           OR length(categoria) > 80 OR length(localizacao) > 120
           OR NOT (
               (status = 'EMPRESTADA' AND responsavel_atual_id IS NOT NULL)
               OR (status <> 'EMPRESTADA' AND responsavel_atual_id IS NULL)
           )
    )
    AND NOT EXISTS (
        SELECT 1 FROM movimentacoes_estoque
        WHERE tipo_movimentacao NOT IN ('ENTRADA', 'SAIDA', 'CORRECAO')
           OR length(observacao) > 700
    )
    AND NOT EXISTS (
        SELECT 1 FROM movimentacoes_ferramenta
        WHERE tipo_movimentacao NOT IN ('RETIRADA', 'DEVOLUCAO', 'MANUTENCAO', 'PERDA', 'CORRECAO')
           OR length(observacao) > 700
    )
    AND NOT EXISTS (
        SELECT 1 FROM ferramentas f
        LEFT JOIN usuarios u ON u.id = f.responsavel_atual_id
        WHERE f.responsavel_atual_id IS NOT NULL AND u.id IS NULL
    )
    AND NOT EXISTS (
        SELECT 1 FROM movimentacoes_estoque m
        LEFT JOIN itens_estoque i ON i.id = m.item_estoque_id
        LEFT JOIN usuarios u ON u.id = m.usuario_id
        WHERE i.id IS NULL OR u.id IS NULL
    )
    AND NOT EXISTS (
        SELECT 1 FROM movimentacoes_ferramenta m
        LEFT JOIN ferramentas f ON f.id = m.ferramenta_id
        LEFT JOIN usuarios u ON u.id = m.usuario_id
        WHERE f.id IS NULL OR u.id IS NULL
    )
THEN 1 ELSE 0 END;

DROP TABLE flyway_baseline_guard;
