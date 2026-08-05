package com.equipe.estoque.dto.movimentacao;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(name = "MovimentacaoEstoqueRequest", description = "Entrada, saída ou correção de saldo")
public class MovimentacaoEstoqueRequestDTO {

    @NotNull(message = "ID do usuário responsável é obrigatório")
    @Positive(message = "ID do usuário deve ser positivo")
    @Schema(description = "Usuário ativo que registra a operação", example = "1")
    private Long usuarioId;

    @NotNull(message = "Quantidade é obrigatória")
    @Min(value = 0, message = "Quantidade não pode ser negativa")
    @Max(value = 1_000_000_000, message = "Quantidade excede o limite permitido")
    @Schema(description = "Entrada/saída: quantidade movimentada; correção: novo saldo absoluto", example = "10")
    private Integer quantidade;

    @Size(max = 500, message = "Observação deve ter no máximo 500 caracteres")
    @Schema(description = "Justificativa; obrigatória em correções", example = "Conferência do inventário", maxLength = 500)
    private String observacao;
}
