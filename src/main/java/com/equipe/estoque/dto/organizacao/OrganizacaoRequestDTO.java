package com.equipe.estoque.dto.organizacao;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(name = "OrganizacaoRequest", description = "Dados mínimos para uma nova organização")
public class OrganizacaoRequestDTO {

    @NotBlank(message = "Nome da organização é obrigatório")
    @Size(max = 120, message = "Nome da organização deve ter no máximo 120 caracteres")
    @Schema(example = "Almoxarifado Central", maxLength = 120)
    private String nome;
}
