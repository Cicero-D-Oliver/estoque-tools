package com.equipe.estoque.dto.ferramenta;

import com.equipe.estoque.enums.StatusFerramenta;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
@Schema(name = "FerramentaResponse", description = "Ferramenta patrimonial e seu estado atual")
public class FerramentaResponseDTO {
    @Schema(example = "1") private Long id;
    @Schema(example = "PAT-2026-001") private String patrimonio;
    @Schema(example = "Furadeira de impacto") private String nome;
    @Schema(example = "Elétrica") private String categoria;
    @Schema(example = "DISPONIVEL") private StatusFerramenta status;
    @Schema(nullable = true, example = "2") private Long responsavelAtualId;
    @Schema(nullable = true, example = "João Silva") private String responsavelAtualNome;
    @Schema(nullable = true, example = "2026-08-20T09:15:00") private LocalDateTime responsavelDesde;
    @Schema(nullable = true, example = "Instalação das câmeras — Linha 3") private String destinoAtual;
    @Schema(example = "Armário 2") private String localizacao;
    @Schema(example = "true") private Boolean ativo;
}
