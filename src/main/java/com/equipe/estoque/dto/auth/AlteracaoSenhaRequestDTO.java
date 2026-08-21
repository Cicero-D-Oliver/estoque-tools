package com.equipe.estoque.dto.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(name = "AlteracaoSenhaRequest", description = "Troca autenticada de senha")
public class AlteracaoSenhaRequestDTO {

    @NotBlank(message = "Senha atual é obrigatória")
    @Size(max = 72, message = "Senha atual deve ter no máximo 72 caracteres")
    @Schema(format = "password", maxLength = 72)
    private String senhaAtual;

    @NotBlank(message = "Nova senha é obrigatória")
    @Size(min = 12, max = 72, message = "Nova senha deve ter entre 12 e 72 caracteres")
    @Schema(format = "password", minLength = 12, maxLength = 72)
    private String novaSenha;
}
