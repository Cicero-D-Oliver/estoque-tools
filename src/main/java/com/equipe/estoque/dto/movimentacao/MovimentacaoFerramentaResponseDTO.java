package com.equipe.estoque.dto.movimentacao;

import com.equipe.estoque.enums.TipoMovimentacaoFerramenta;
import com.equipe.estoque.enums.StatusRevisaoMovimentacao;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
@Schema(
        name = "MovimentacaoFerramentaResponse",
        description = "Evento operacional imutável com metadados posteriores de revisão administrativa"
)
public class MovimentacaoFerramentaResponseDTO {
    @Schema(example = "20") private Long id;
    @Schema(example = "1") private Long ferramentaId;
    @Schema(example = "Furadeira de impacto") private String ferramentaNome;
    @Schema(example = "PAT-2026-001") private String ferramentaPatrimonio;
    @Schema(description = "Executor autenticado da operação", example = "2") private Long usuarioId;
    @Schema(description = "Nome do executor autenticado", example = "João Silva") private String usuarioNome;
    @Schema(nullable = true, example = "3") private Long responsavelUsuarioId;
    @Schema(nullable = true, example = "William Souza") private String responsavelUsuarioNome;
    @Schema(nullable = true, example = "2") private Long responsavelAnteriorUsuarioId;
    @Schema(nullable = true, example = "Jorge Lima") private String responsavelAnteriorUsuarioNome;
    @Schema(example = "RETIRADA") private TipoMovimentacaoFerramenta tipoMovimentacao;
    @Schema(example = "2026-08-04T10:15:30") private LocalDateTime dataHora;
    @Schema(example = "Uso na manutenção preventiva") private String observacao;
    @Schema(nullable = true, example = "Linha 3") private String destino;
    @Schema(example = "PENDENTE") private StatusRevisaoMovimentacao statusRevisao;
    @Schema(nullable = true, example = "1") private Long confirmadoPorUsuarioId;
    @Schema(nullable = true, example = "Cícero") private String confirmadoPorUsuarioNome;
    @Schema(nullable = true, example = "2026-08-20T10:30:00") private LocalDateTime confirmadoEm;
}
