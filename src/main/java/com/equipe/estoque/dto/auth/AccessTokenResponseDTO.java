package com.equipe.estoque.dto.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

@Getter
@Builder
@Schema(name = "AccessTokenResponse", description = "Par de tokens sem perfis de organizações")
public class AccessTokenResponseDTO {
    @Schema(example = "Bearer") private String tokenType;
    @Schema(description = "JWT assinado", format = "password") private String accessToken;
    @Schema(example = "900") private Long expiresIn;
    @Schema(example = "2026-08-19T10:30:00Z") private Instant expiresAt;
    @Schema(description = "Token opaco rotacionado a cada renovação", format = "password")
    private String refreshToken;
    @Schema(example = "2026-09-18T10:15:00Z") private Instant refreshExpiresAt;
}
