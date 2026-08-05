package com.equipe.estoque.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(name = "ItemEstoqueRequest", description = "Dados cadastrais de um item consumível")
public class ItemEstoqueRequestDTO {

    @NotBlank(message = "Código é obrigatório")
    @Size(max = 60, message = "Código deve ter no máximo 60 caracteres")
    @Schema(description = "Código único do item", example = "PARAF-001", maxLength = 60)
    private String codigo;

    @NotBlank(message = "Nome é obrigatório")
    @Size(max = 120, message = "Nome deve ter no máximo 120 caracteres")
    @Schema(description = "Nome do item", example = "Parafuso sextavado 8 mm", maxLength = 120)
    private String nome;

    @Size(max = 80, message = "Categoria deve ter no máximo 80 caracteres")
    @Schema(description = "Categoria opcional", example = "Fixadores", maxLength = 80)
    private String categoria;

    @Min(value = 0, message = "Quantidade atual não pode ser negativa")
    @Max(value = 1_000_000_000, message = "Quantidade atual excede o limite permitido")
    @Schema(description = "Saldo inicial; alterações posteriores usam movimentações", example = "100", minimum = "0")
    private Integer quantidadeAtual = 0;

    @Min(value = 0, message = "Quantidade mínima não pode ser negativa")
    @Max(value = 1_000_000_000, message = "Quantidade mínima excede o limite permitido")
    @Schema(description = "Limite para alerta de reposição", example = "20", minimum = "0")
    private Integer quantidadeMinima = 0;

    @Size(max = 120, message = "Localização deve ter no máximo 120 caracteres")
    @Schema(description = "Localização física", example = "Corredor A, prateleira 3", maxLength = 120)
    private String localizacao;
}
