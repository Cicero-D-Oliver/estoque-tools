package com.equipe.estoque.security;

import com.equipe.estoque.exception.BusinessException;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

@Component
public class PasswordPolicy {

    private static final int MINIMUM_CHARACTERS = 12;
    private static final int MAXIMUM_CHARACTERS = 72;
    private static final int BCRYPT_MAXIMUM_BYTES = 72;

    public void validate(String password) {
        if (password == null
                || password.isBlank()
                || password.length() < MINIMUM_CHARACTERS
                || password.length() > MAXIMUM_CHARACTERS) {
            throw new BusinessException("A senha deve ter entre 12 e 72 caracteres");
        }
        if (exceedsBcryptLimit(password)) {
            throw new BusinessException("A senha excede o limite seguro permitido");
        }
    }

    public boolean exceedsBcryptLimit(String password) {
        return password != null
                && password.getBytes(StandardCharsets.UTF_8).length > BCRYPT_MAXIMUM_BYTES;
    }
}
