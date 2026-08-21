package com.equipe.estoque.dto.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(name = "RefreshTokenRequest", description = "Token opaco usado para renovar ou encerrar uma sessão")
public class RefreshTokenRequestDTO {

    @NotBlank(message = "Refresh token é obrigatório")
    @Size(max = 256, message = "Refresh token possui tamanho inválido")
    @Schema(format = "password", maxLength = 256)
    private String refreshToken;
}
