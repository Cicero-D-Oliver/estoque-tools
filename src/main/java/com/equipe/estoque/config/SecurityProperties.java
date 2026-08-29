package com.equipe.estoque.config;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.Valid;
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

    @NotNull
    private Duration refreshTokenTtl = Duration.ofDays(30);

    @NotNull
    private Duration passwordResetTokenTtl = Duration.ofMinutes(30);

    @Min(2)
    @Max(20)
    private int maxFailedLoginAttempts = 5;

    @NotNull
    private Duration loginLockDuration = Duration.ofMinutes(15);

    @Valid
    @NotNull
    private RefreshCookie refreshCookie = new RefreshCookie();

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

    @AssertTrue(message = "A duração do refresh token deve ficar entre 1 e 90 dias")
    public boolean isRefreshTokenTtlSafe() {
        return refreshTokenTtl != null
                && refreshTokenTtl.compareTo(Duration.ofDays(1)) >= 0
                && refreshTokenTtl.compareTo(Duration.ofDays(90)) <= 0;
    }

    @AssertTrue(message = "A duração do token de recuperação deve ficar entre 5 minutos e 2 horas")
    public boolean isPasswordResetTokenTtlSafe() {
        return passwordResetTokenTtl != null
                && passwordResetTokenTtl.compareTo(Duration.ofMinutes(5)) >= 0
                && passwordResetTokenTtl.compareTo(Duration.ofHours(2)) <= 0;
    }

    @AssertTrue(message = "O bloqueio de login deve ficar entre 1 minuto e 24 horas")
    public boolean isLoginLockDurationSafe() {
        return loginLockDuration != null
                && loginLockDuration.compareTo(Duration.ofMinutes(1)) >= 0
                && loginLockDuration.compareTo(Duration.ofHours(24)) <= 0;
    }

    public byte[] decodedSecret() {
        return Base64.getDecoder().decode(jwtSecret);
    }

    @Getter
    @Setter
    public static class RefreshCookie {

        @NotBlank
        private String sameSite = "Lax";

        @NotBlank
        private String path = "/api/auth";

        private boolean secure;

        @AssertTrue(message = "SameSite do cookie de refresh deve ser Strict, Lax ou None")
        public boolean isSameSiteValid() {
            return "Strict".equalsIgnoreCase(sameSite)
                    || "Lax".equalsIgnoreCase(sameSite)
                    || "None".equalsIgnoreCase(sameSite);
        }

        @AssertTrue(message = "Cookie SameSite=None exige Secure")
        public boolean isCrossSiteCookieSafe() {
            return !"None".equalsIgnoreCase(sameSite) || secure;
        }

        @AssertTrue(message = "O cookie de refresh deve ficar restrito a /api/auth")
        public boolean isPathRestricted() {
            return "/api/auth".equals(path);
        }
    }
}
