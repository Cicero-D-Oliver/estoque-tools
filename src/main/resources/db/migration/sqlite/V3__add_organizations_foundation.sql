-- Fundação multi-organização. Esta migração é aditiva e não altera os dados
-- nem as constraints das tabelas existentes.

CREATE TABLE organizacoes (
    id INTEGER PRIMARY KEY,
    versao BIGINT DEFAULT 0 NOT NULL,
    nome VARCHAR(120) NOT NULL,
    ativa BOOLEAN NOT NULL,
    criada_em TIMESTAMP NOT NULL,
    criada_por_usuario_id BIGINT NOT NULL,
    CONSTRAINT ck_organizacoes_ativa CHECK (ativa IN (0, 1)),
    CONSTRAINT fk_organizacoes_criada_por
        FOREIGN KEY (criada_por_usuario_id) REFERENCES usuarios (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE organizacao_membros (
    id INTEGER PRIMARY KEY,
    versao BIGINT DEFAULT 0 NOT NULL,
    organizacao_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,
    perfil VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    solicitado_em TIMESTAMP NOT NULL,
    aprovado_em TIMESTAMP,
    aprovado_por_usuario_id BIGINT,
    removido_em TIMESTAMP,
    ultima_visualizacao_movimentacoes_em TIMESTAMP,
    CONSTRAINT uk_organizacao_membros_organizacao_usuario
        UNIQUE (organizacao_id, usuario_id),
    CONSTRAINT ck_organizacao_membros_perfil
        CHECK (perfil IN ('ADMIN', 'OPERADOR', 'CONSULTA')),
    CONSTRAINT ck_organizacao_membros_status
        CHECK (status IN ('PENDENTE', 'ATIVO', 'REJEITADO', 'REMOVIDO')),
    CONSTRAINT fk_organizacao_membros_organizacao
        FOREIGN KEY (organizacao_id) REFERENCES organizacoes (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_organizacao_membros_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_organizacao_membros_aprovado_por
        FOREIGN KEY (aprovado_por_usuario_id) REFERENCES usuarios (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE INDEX idx_organizacoes_ativa ON organizacoes (ativa);
CREATE INDEX idx_organizacoes_criada_por ON organizacoes (criada_por_usuario_id);
CREATE INDEX idx_org_membros_organizacao_status
    ON organizacao_membros (organizacao_id, status);
CREATE INDEX idx_org_membros_usuario_status
    ON organizacao_membros (usuario_id, status);
CREATE INDEX idx_org_membros_aprovado_por
    ON organizacao_membros (aprovado_por_usuario_id);

-- Bancos já populados recebem uma única organização legada determinística.
-- O menor ID existente é usado somente como autoria técnica da incorporação.
INSERT INTO organizacoes (
    versao, nome, ativa, criada_em, criada_por_usuario_id
)
SELECT
    0, 'Organização Legada', 1, '2000-01-01 00:00:00', MIN(id)
FROM usuarios
HAVING COUNT(*) > 0;

-- O perfil global é preservado e copiado para o vínculo por organização.
INSERT INTO organizacao_membros (
    versao, organizacao_id, usuario_id, perfil, status,
    solicitado_em, aprovado_em, aprovado_por_usuario_id,
    removido_em, ultima_visualizacao_movimentacoes_em
)
SELECT
    0, organizacao.id, usuario.id, usuario.perfil, 'ATIVO',
    '2000-01-01 00:00:00', '2000-01-01 00:00:00',
    organizacao.criada_por_usuario_id, NULL, NULL
FROM usuarios usuario
CROSS JOIN organizacoes organizacao
WHERE organizacao.nome = 'Organização Legada'
  AND organizacao.criada_em = '2000-01-01 00:00:00';

PRAGMA foreign_key_check;
