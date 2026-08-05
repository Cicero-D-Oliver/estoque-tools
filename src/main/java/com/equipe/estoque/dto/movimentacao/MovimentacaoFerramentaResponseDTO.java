package com.equipe.estoque.dto.movimentacao;

import com.equipe.estoque.enums.TipoMovimentacaoFerramenta;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
@Schema(name = "MovimentacaoFerramentaResponse", description = "Registro imutável de operação patrimonial")
public class MovimentacaoFerramentaResponseDTO {
    @Schema(example = "20") private Long id;
    @Schema(example = "1") private Long ferramentaId;
    @Schema(example = "Furadeira de impacto") private String ferramentaNome;
    @Schema(example = "PAT-2026-001") private String ferramentaPatrimonio;
    @Schema(example = "2") private Long usuarioId;
    @Schema(example = "João Silva") private String usuarioNome;
    @Schema(example = "RETIRADA") private TipoMovimentacaoFerramenta tipoMovimentacao;
    @Schema(example = "2026-08-04T10:15:30") private LocalDateTime dataHora;
    @Schema(example = "Uso na manutenção preventiva") private String observacao;
}
