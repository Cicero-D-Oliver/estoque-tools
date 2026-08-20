package com.equipe.estoque.config;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;
import java.util.Base64;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "app.security")
public class SecurityProperties {

    private static final int MINIMUM_KEY_BYTES = 32;

    @NotBlank
    private String jwtSecret;

    @NotBlank
    private String issuer = "estoque-tools";

    @NotNull
    private Duration accessTokenTtl = Duration.ofMinutes(15);

    @AssertTrue(message = "A chave JWT deve estar em Base64 e conter pelo menos 32 bytes")
    public boolean isJwtSecretStrong() {
        try {
            return jwtSecret != null
                    && Base64.getDecoder().decode(jwtSecret).length >= MINIMUM_KEY_BYTES;
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    @AssertTrue(message = "A duração do access token deve ficar entre 1 e 60 minutos")
    public boolean isAccessTokenTtlSafe() {
        return accessTokenTtl != null
                && accessTokenTtl.compareTo(Duration.ofMinutes(1)) >= 0
                && accessTokenTtl.compareTo(Duration.ofMinutes(60)) <= 0;
    }

    public byte[] decodedSecret() {
        return Base64.getDecoder().decode(jwtSecret);
    }
}
