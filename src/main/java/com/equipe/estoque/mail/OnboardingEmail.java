package com.equipe.estoque.mail;

import com.equipe.estoque.enums.TipoConviteOnboarding;

import java.time.LocalDateTime;

public record OnboardingEmail(
        String destination,
        String activationUrl,
        LocalDateTime expiresAt,
        TipoConviteOnboarding type
) {
}
