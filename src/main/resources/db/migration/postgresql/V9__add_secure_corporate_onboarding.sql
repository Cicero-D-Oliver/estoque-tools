CREATE TABLE convites_onboarding (
    id BIGSERIAL PRIMARY KEY,
    versao BIGINT DEFAULT 0 NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    email VARCHAR(254) NOT NULL,
    organizacao_id BIGINT,
    perfil VARCHAR(20) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    criado_em TIMESTAMP NOT NULL,
    enviado_em TIMESTAMP NOT NULL,
    expira_em TIMESTAMP NOT NULL,
    reenvio_permitido_em TIMESTAMP NOT NULL,
    confirmado_em TIMESTAMP,
    criado_por_usuario_id BIGINT,
    usuario_confirmado_id BIGINT,
    CONSTRAINT uk_convites_onboarding_token_hash UNIQUE (token_hash),
    CONSTRAINT uk_convites_onboarding_organizacao_email UNIQUE (organizacao_id, email),
    CONSTRAINT ck_convites_onboarding_tipo CHECK (tipo IN ('BOOTSTRAP', 'ORGANIZACAO')),
    CONSTRAINT ck_convites_onboarding_status CHECK (status IN ('PENDENTE', 'CONFIRMADO', 'EXPIRADO', 'REVOGADO')),
    CONSTRAINT ck_convites_onboarding_perfil CHECK (perfil IN ('ADMIN', 'OPERADOR', 'CONSULTA')),
    CONSTRAINT ck_convites_onboarding_escopo CHECK (
        (tipo = 'BOOTSTRAP' AND organizacao_id IS NULL AND perfil = 'ADMIN' AND criado_por_usuario_id IS NULL)
        OR
        (tipo = 'ORGANIZACAO' AND organizacao_id IS NOT NULL
            AND perfil IN ('OPERADOR', 'CONSULTA') AND criado_por_usuario_id IS NOT NULL)
    ),
    CONSTRAINT ck_convites_onboarding_confirmacao CHECK (
        (status = 'CONFIRMADO' AND confirmado_em IS NOT NULL AND usuario_confirmado_id IS NOT NULL)
        OR
        (status <> 'CONFIRMADO' AND confirmado_em IS NULL AND usuario_confirmado_id IS NULL)
    ),
    CONSTRAINT fk_convites_onboarding_organizacao FOREIGN KEY (organizacao_id)
        REFERENCES organizacoes (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_convites_onboarding_criado_por FOREIGN KEY (criado_por_usuario_id)
        REFERENCES usuarios (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_convites_onboarding_usuario_confirmado FOREIGN KEY (usuario_confirmado_id)
        REFERENCES usuarios (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_convites_onboarding_criador_membro FOREIGN KEY (organizacao_id, criado_por_usuario_id)
        REFERENCES organizacao_membros (organizacao_id, usuario_id) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE INDEX idx_convites_onboarding_estado_expiracao
    ON convites_onboarding (status, expira_em);
CREATE INDEX idx_convites_onboarding_criado_por
    ON convites_onboarding (criado_por_usuario_id);

CREATE TABLE onboarding_bootstrap (
    id SMALLINT PRIMARY KEY,
    versao BIGINT DEFAULT 0 NOT NULL,
    concluido BOOLEAN DEFAULT FALSE NOT NULL,
    email_configurado VARCHAR(254),
    convite_id BIGINT,
    usuario_id BIGINT,
    organizacao_id BIGINT,
    concluido_em TIMESTAMP,
    CONSTRAINT ck_onboarding_bootstrap_singleton CHECK (id = 1),
    CONSTRAINT ck_onboarding_bootstrap_estado CHECK (
        (concluido = FALSE AND usuario_id IS NULL AND organizacao_id IS NULL AND concluido_em IS NULL)
        OR
        (concluido = TRUE AND email_configurado IS NOT NULL AND convite_id IS NOT NULL
            AND usuario_id IS NOT NULL AND organizacao_id IS NOT NULL AND concluido_em IS NOT NULL)
    ),
    CONSTRAINT fk_onboarding_bootstrap_convite FOREIGN KEY (convite_id)
        REFERENCES convites_onboarding (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_onboarding_bootstrap_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_onboarding_bootstrap_organizacao FOREIGN KEY (organizacao_id)
        REFERENCES organizacoes (id) ON UPDATE RESTRICT ON DELETE RESTRICT
);

INSERT INTO onboarding_bootstrap (id, versao, concluido) VALUES (1, 0, FALSE);
