package com.equipe.estoque.dto.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(name = "MobileRefreshTokenRequest", description = "Credencial rotativa mantida pelo cofre seguro do aparelho")
public class MobileRefreshTokenRequestDTO {

    @NotBlank(message = "Refresh token é obrigatório")
    @Size(max = 512, message = "Refresh token inválido")
    @Schema(format = "password", maxLength = 512)
    private String refreshToken;
}
