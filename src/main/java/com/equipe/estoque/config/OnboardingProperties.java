package com.equipe.estoque.config;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "app.onboarding")
public class OnboardingProperties {

    private String initialAdminEmail = "";
    private String initialOrganizationName = "";
    private String publicBaseUrl = "";

    @NotNull
    private Duration emailVerificationTokenTtl = Duration.ofMinutes(30);

    @NotNull
    private Duration invitationResendCooldown = Duration.ofMinutes(5);

    @AssertTrue(message = "O token de confirmação deve durar entre 5 minutos e 24 horas")
    public boolean isTokenTtlSafe() {
        return emailVerificationTokenTtl != null
                && emailVerificationTokenTtl.compareTo(Duration.ofMinutes(5)) >= 0
                && emailVerificationTokenTtl.compareTo(Duration.ofHours(24)) <= 0;
    }

    @AssertTrue(message = "O intervalo de reenvio deve ficar entre 30 segundos e 24 horas")
    public boolean isResendCooldownSafe() {
        return invitationResendCooldown != null
                && invitationResendCooldown.compareTo(Duration.ofSeconds(30)) >= 0
                && invitationResendCooldown.compareTo(Duration.ofHours(24)) <= 0;
    }
}
