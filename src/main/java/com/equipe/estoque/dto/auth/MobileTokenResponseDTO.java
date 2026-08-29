package com.equipe.estoque.dto.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

@Getter
@Builder
@Schema(name = "MobileTokenResponse", description = "Sessão rotativa para cliente mobile nativo")
public class MobileTokenResponseDTO {

    @Schema(example = "Bearer")
    private String tokenType;

    @Schema(description = "JWT curto usado no cabeçalho Authorization", format = "password")
    private String accessToken;

    @Schema(example = "900")
    private Long expiresIn;

    @Schema(example = "2026-08-28T12:15:00Z")
    private Instant expiresAt;

    @Schema(description = "Token opaco rotativo; deve permanecer no armazenamento seguro do sistema", format = "password")
    private String refreshToken;

    @Schema(example = "2026-09-27T12:00:00Z")
    private Instant refreshExpiresAt;

    public static MobileTokenResponseDTO from(AccessTokenResponseDTO session) {
        return MobileTokenResponseDTO.builder()
                .tokenType(session.getTokenType())
                .accessToken(session.getAccessToken())
                .expiresIn(session.getExpiresIn())
                .expiresAt(session.getExpiresAt())
                .refreshToken(session.getRefreshToken())
                .refreshExpiresAt(session.getRefreshExpiresAt())
                .build();
    }
}
