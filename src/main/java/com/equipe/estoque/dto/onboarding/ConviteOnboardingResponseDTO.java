package com.equipe.estoque.dto.onboarding;

import com.equipe.estoque.enums.PerfilMembroOrganizacao;
import com.equipe.estoque.enums.StatusConviteOnboarding;

import java.time.LocalDateTime;

public record ConviteOnboardingResponseDTO(
        Long id,
        String email,
        PerfilMembroOrganizacao perfil,
        StatusConviteOnboarding status,
        LocalDateTime enviadoEm,
        LocalDateTime expiraEm,
        LocalDateTime confirmadoEm
) {
}
