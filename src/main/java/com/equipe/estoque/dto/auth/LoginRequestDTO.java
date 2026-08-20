package com.equipe.estoque.dto.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(name = "LoginRequest", description = "Credenciais da conta")
public class LoginRequestDTO {

    @NotBlank(message = "E-mail é obrigatório")
    @Email(message = "E-mail deve ter um formato válido")
    @Size(max = 254, message = "E-mail deve ter no máximo 254 caracteres")
    @Schema(example = "maria@empresa.com")
    private String email;

    @NotBlank(message = "Senha é obrigatória")
    @Size(max = 72, message = "Senha deve ter no máximo 72 caracteres")
    @Schema(example = "UmaSenhaLonga!2026", format = "password")
    private String senha;
}
