package com.equipe.estoque.dto.movimentacao;

import com.equipe.estoque.enums.TipoMovimentacaoEstoque;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
@Schema(name = "MovimentacaoEstoqueResponse", description = "Registro imutável de alteração de saldo")
public class MovimentacaoEstoqueResponseDTO {
    @Schema(example = "10") private Long id;
    @Schema(example = "1") private Long itemEstoqueId;
    @Schema(example = "Parafuso sextavado 8 mm") private String itemEstoqueNome;
    @Schema(example = "2") private Long usuarioId;
    @Schema(example = "João Silva") private String usuarioNome;
    @Schema(example = "SAIDA") private TipoMovimentacaoEstoque tipoMovimentacao;
    @Schema(example = "5") private Integer quantidade;
    @Schema(example = "2026-08-04T10:15:30") private LocalDateTime dataHora;
    @Schema(example = "Uso na ordem de serviço 123") private String observacao;
}
