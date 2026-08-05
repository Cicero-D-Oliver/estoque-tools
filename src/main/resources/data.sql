-- ============================================================
-- DADOS INICIAIS DE TESTE
-- ============================================================
-- O Spring Boot executa este arquivo automaticamente ao iniciar
-- (precisa estar em src/main/resources e se chamar exatamente "data.sql").
--
-- O Hibernate sincroniza o schema antes deste script porque
-- spring.jpa.defer-datasource-initialization=true está configurado.
-- Cada registro verifica sua chave natural antes da inserção. Isso mantém o
-- seed idempotente mesmo em um SQLite novo, no qual o dialect do Hibernate não
-- materializa as constraints UNIQUE declaradas pelas entidades.

-- Usuários
INSERT INTO usuarios (nome, email, perfil, ativo)
SELECT 'Junão (Admin)', 'junao@equipe.com', 'ADMIN', true
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'junao@equipe.com');

INSERT INTO usuarios (nome, email, perfil, ativo)
SELECT 'Carlos Operador', 'carlos@equipe.com', 'OPERADOR', true
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'carlos@equipe.com');

INSERT INTO usuarios (nome, email, perfil, ativo)
SELECT 'Ana Consulta', 'ana@equipe.com', 'CONSULTA', true
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'ana@equipe.com');

-- Itens de estoque (consumíveis)
INSERT INTO itens_estoque (codigo, nome, categoria, quantidade_atual, quantidade_minima, localizacao, ativo)
SELECT 'ITEM-001', 'Luva de Proteção (par)', 'EPI', 50, 10, 'Almoxarifado A - Prateleira 1', true
WHERE NOT EXISTS (SELECT 1 FROM itens_estoque WHERE codigo = 'ITEM-001');

INSERT INTO itens_estoque (codigo, nome, categoria, quantidade_atual, quantidade_minima, localizacao, ativo)
SELECT 'ITEM-002', 'Fita Isolante', 'Elétrica', 8, 15, 'Almoxarifado A - Prateleira 2', true
WHERE NOT EXISTS (SELECT 1 FROM itens_estoque WHERE codigo = 'ITEM-002');

INSERT INTO itens_estoque (codigo, nome, categoria, quantidade_atual, quantidade_minima, localizacao, ativo)
SELECT 'ITEM-003', 'Parafuso Sextavado M8', 'Fixação', 200, 50, 'Almoxarifado B - Gaveta 3', true
WHERE NOT EXISTS (SELECT 1 FROM itens_estoque WHERE codigo = 'ITEM-003');

-- Ferramentas
INSERT INTO ferramentas (patrimonio, nome, categoria, status, localizacao, ativo)
SELECT 'PAT-1001', 'Furadeira de Impacto Bosch', 'Elétrica', 'DISPONIVEL', 'Almoxarifado A - Armário 1', true
WHERE NOT EXISTS (SELECT 1 FROM ferramentas WHERE patrimonio = 'PAT-1001');

INSERT INTO ferramentas (patrimonio, nome, categoria, status, localizacao, ativo)
SELECT 'PAT-1002', 'Chave de Torque', 'Manual', 'DISPONIVEL', 'Almoxarifado A - Armário 2', true
WHERE NOT EXISTS (SELECT 1 FROM ferramentas WHERE patrimonio = 'PAT-1002');

INSERT INTO ferramentas (patrimonio, nome, categoria, status, localizacao, ativo)
SELECT 'PAT-1003', 'Multímetro Digital', 'Eletrônica', 'DISPONIVEL', 'Almoxarifado B - Armário 1', true
WHERE NOT EXISTS (SELECT 1 FROM ferramentas WHERE patrimonio = 'PAT-1003');
