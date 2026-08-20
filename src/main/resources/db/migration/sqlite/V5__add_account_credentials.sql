-- Credenciais são opcionais para preservar contas legadas sem inventar senhas.
-- Novas contas recebem hash BCrypt exclusivamente pela aplicação.

ALTER TABLE usuarios
    ADD COLUMN senha_hash VARCHAR(100)
        CONSTRAINT ck_usuarios_senha_hash_formato
        CHECK (senha_hash IS NULL OR length(senha_hash) BETWEEN 60 AND 100);

ALTER TABLE usuarios ADD COLUMN senha_alterada_em TIMESTAMP;
ALTER TABLE usuarios ADD COLUMN ultimo_login_em TIMESTAMP;
