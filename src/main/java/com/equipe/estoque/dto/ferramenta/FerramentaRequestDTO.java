package com.equipe.estoque.dto.ferramenta;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(name = "FerramentaRequest", description = "Dados cadastrais de uma ferramenta patrimonial")
public class FerramentaRequestDTO {

    @NotBlank(message = "Número de patrimônio é obrigatório")
    @Size(max = 60, message = "Patrimônio deve ter no máximo 60 caracteres")
    @Schema(description = "Identificador patrimonial único", example = "PAT-2026-001", maxLength = 60)
    private String patrimonio;

    @NotBlank(message = "Nome da ferramenta é obrigatório")
    @Size(max = 120, message = "Nome deve ter no máximo 120 caracteres")
    @Schema(description = "Nome da ferramenta", example = "Furadeira de impacto", maxLength = 120)
    private String nome;

    @Size(max = 80, message = "Categoria deve ter no máximo 80 caracteres")
    @Schema(description = "Categoria opcional", example = "Elétrica", maxLength = 80)
    private String categoria;

    @Size(max = 120, message = "Localização deve ter no máximo 120 caracteres")
    @Schema(description = "Localização quando armazenada", example = "Armário 2", maxLength = 120)
    private String localizacao;
}
