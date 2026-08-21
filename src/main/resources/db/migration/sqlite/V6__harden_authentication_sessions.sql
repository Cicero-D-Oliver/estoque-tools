-- Sessões opacas, revogação de access tokens e proteção persistente de login.
-- Nenhum token ou senha em texto puro é armazenado.

ALTER TABLE usuarios ADD COLUMN token_version BIGINT NOT NULL DEFAULT 0
    CHECK (token_version >= 0);
ALTER TABLE usuarios ADD COLUMN tentativas_login_falhas INTEGER NOT NULL DEFAULT 0
    CHECK (tentativas_login_falhas >= 0);
ALTER TABLE usuarios ADD COLUMN login_bloqueado_ate TIMESTAMP;
ALTER TABLE usuarios ADD COLUMN ultima_falha_login_em TIMESTAMP;

CREATE TABLE refresh_tokens (
    id INTEGER PRIMARY KEY,
    versao BIGINT NOT NULL DEFAULT 0,
    usuario_id BIGINT NOT NULL,
    familia_id VARCHAR(36) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    token_version BIGINT NOT NULL,
    emitido_em TIMESTAMP NOT NULL,
    expira_em TIMESTAMP NOT NULL,
    revogado_em TIMESTAMP,
    motivo_revogacao VARCHAR(30),
    substituido_por_id BIGINT,
    CONSTRAINT uk_refresh_tokens_hash UNIQUE (token_hash),
    CONSTRAINT uk_refresh_tokens_substituto UNIQUE (substituido_por_id),
    CONSTRAINT fk_refresh_tokens_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_refresh_tokens_substituto FOREIGN KEY (substituido_por_id)
        REFERENCES refresh_tokens (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT ck_refresh_tokens_hash_tamanho CHECK (length(token_hash) = 64),
    CONSTRAINT ck_refresh_tokens_token_version CHECK (token_version >= 0),
    CONSTRAINT ck_refresh_tokens_expiracao CHECK (expira_em > emitido_em),
    CONSTRAINT ck_refresh_tokens_revogacao CHECK (
        (revogado_em IS NULL AND motivo_revogacao IS NULL)
        OR (revogado_em IS NOT NULL AND motivo_revogacao IS NOT NULL)
    ),
    CONSTRAINT ck_refresh_tokens_motivo CHECK (
        motivo_revogacao IS NULL OR motivo_revogacao IN (
            'ROTACIONADO', 'REUTILIZACAO_DETECTADA', 'LOGOUT', 'LOGOUT_TODOS',
            'TROCA_SENHA', 'RECUPERACAO_SENHA', 'CONTA_INATIVA', 'EXPIRADO',
            'ROTACAO_CHAVE'
        )
    )
);

CREATE INDEX idx_refresh_tokens_usuario_revogado
    ON refresh_tokens (usuario_id, revogado_em);
CREATE INDEX idx_refresh_tokens_familia ON refresh_tokens (familia_id);
CREATE INDEX idx_refresh_tokens_expiracao ON refresh_tokens (expira_em);

CREATE TABLE tokens_recuperacao_senha (
    id INTEGER PRIMARY KEY,
    versao BIGINT NOT NULL DEFAULT 0,
    usuario_id BIGINT NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    emitido_em TIMESTAMP NOT NULL,
    expira_em TIMESTAMP NOT NULL,
    usado_em TIMESTAMP,
    revogado_em TIMESTAMP,
    CONSTRAINT uk_tokens_recuperacao_senha_hash UNIQUE (token_hash),
    CONSTRAINT fk_tokens_recuperacao_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT ck_tokens_recuperacao_hash_tamanho CHECK (length(token_hash) = 64),
    CONSTRAINT ck_tokens_recuperacao_expiracao CHECK (expira_em > emitido_em),
    CONSTRAINT ck_tokens_recuperacao_estado CHECK (
        usado_em IS NULL OR revogado_em IS NULL
    )
);

CREATE INDEX idx_tokens_recuperacao_usuario_estado
    ON tokens_recuperacao_senha (usuario_id, usado_em, revogado_em);
CREATE INDEX idx_tokens_recuperacao_expiracao
    ON tokens_recuperacao_senha (expira_em);
