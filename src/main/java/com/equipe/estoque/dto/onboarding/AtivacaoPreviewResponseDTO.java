package com.equipe.estoque.dto.onboarding;

public record AtivacaoPreviewResponseDTO(
        String estado,
        String email,
        String organizacao,
        boolean requerCriacaoConta
) {
}
