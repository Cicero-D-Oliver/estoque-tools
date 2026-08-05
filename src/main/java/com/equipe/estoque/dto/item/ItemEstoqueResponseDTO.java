package com.equipe.estoque.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(name = "ItemEstoqueResponse", description = "Item consumível com saldo atual")
public class ItemEstoqueResponseDTO {
    @Schema(example = "1") private Long id;
    @Schema(example = "PARAF-001") private String codigo;
    @Schema(example = "Parafuso sextavado 8 mm") private String nome;
    @Schema(example = "Fixadores") private String categoria;
    @Schema(example = "100") private Integer quantidadeAtual;
    @Schema(example = "20") private Integer quantidadeMinima;
    @Schema(example = "Corredor A, prateleira 3") private String localizacao;
    @Schema(example = "true") private Boolean ativo;
    @Schema(description = "Indica necessidade de reposição", example = "false") private Boolean abaixoMinimo;
}
