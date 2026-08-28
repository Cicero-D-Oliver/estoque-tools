package com.equipe.estoque.dto.auth;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

@Getter
@Builder
@Schema(name = "AccessTokenResponse", description = "JWT curto sem perfis de organizações")
public class AccessTokenResponseDTO {
    @Schema(example = "Bearer") private String tokenType;
    @Schema(description = "JWT assinado", format = "password") private String accessToken;
    @Schema(example = "900") private Long expiresIn;
    @Schema(example = "2026-08-19T10:30:00Z") private Instant expiresAt;
    @JsonIgnore
    @Schema(hidden = true)
    private String refreshToken;
    @JsonIgnore
    @Schema(hidden = true)
    private Instant refreshExpiresAt;
}
