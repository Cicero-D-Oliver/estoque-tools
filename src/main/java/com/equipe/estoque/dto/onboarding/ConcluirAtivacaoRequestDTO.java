package com.equipe.estoque.dto.onboarding;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ConcluirAtivacaoRequestDTO {

    @NotBlank(message = "Token é obrigatório")
    @Size(max = 200, message = "Token inválido")
    private String token;

    @Size(max = 120, message = "Nome deve ter no máximo 120 caracteres")
    private String nome;

    @Size(max = 72, message = "Senha deve ter no máximo 72 caracteres")
    private String senha;

    @Size(max = 72, message = "Confirmação deve ter no máximo 72 caracteres")
    private String confirmacaoSenha;
}
