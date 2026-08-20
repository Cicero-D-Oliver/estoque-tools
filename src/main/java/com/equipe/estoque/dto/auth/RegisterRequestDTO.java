package com.equipe.estoque.dto.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(name = "RegisterRequest", description = "Dados para criação de uma conta comum")
public class RegisterRequestDTO {

    @NotBlank(message = "Nome é obrigatório")
    @Size(max = 120, message = "Nome deve ter no máximo 120 caracteres")
    @Schema(example = "Maria Oliveira", maxLength = 120)
    private String nome;

    @NotBlank(message = "E-mail é obrigatório")
    @Email(message = "E-mail deve ter um formato válido")
    @Size(max = 254, message = "E-mail deve ter no máximo 254 caracteres")
    @Schema(example = "maria@empresa.com", maxLength = 254)
    private String email;

    @NotBlank(message = "Senha é obrigatória")
    @Size(min = 12, max = 72, message = "Senha deve ter entre 12 e 72 caracteres")
    @Schema(example = "UmaSenhaLonga!2026", minLength = 12, maxLength = 72, format = "password")
    private String senha;
}
