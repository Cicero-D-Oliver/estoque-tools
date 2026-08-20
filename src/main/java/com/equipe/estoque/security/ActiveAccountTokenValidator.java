package com.equipe.estoque.security;

import com.equipe.estoque.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ActiveAccountTokenValidator implements OAuth2TokenValidator<Jwt> {

    private static final OAuth2Error INVALID_ACCOUNT = new OAuth2Error(
            "invalid_token",
            "Token inválido",
            null
    );

    private final UsuarioRepository usuarioRepository;

    @Override
    public OAuth2TokenValidatorResult validate(Jwt token) {
        try {
            Long usuarioId = Long.valueOf(token.getSubject());
            if (usuarioRepository.existsByIdAndAtivoTrueAndSenhaHashIsNotNull(usuarioId)) {
                return OAuth2TokenValidatorResult.success();
            }
        } catch (NumberFormatException exception) {
            return OAuth2TokenValidatorResult.failure(INVALID_ACCOUNT);
        }
        return OAuth2TokenValidatorResult.failure(INVALID_ACCOUNT);
    }
}
