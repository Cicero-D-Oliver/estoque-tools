package com.equipe.estoque.dto.movimentacao;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
@Schema(name = "ResumoMovimentacoesFerramentaResponse",
        description = "Resumo incremental e operacional para administradores")
public class ResumoMovimentacoesFerramentaResponseDTO {
    private Long cursorAnterior;
    private Long proximoCursor;
    private Long quantidadeNovas;
    private Integer quantidadeRetornada;
    private Boolean temMais;
    private Long quantidadePendentes;
    private Long ferramentasEmUso;
    private Long ferramentasEmManutencao;
    private Long ferramentasPerdidas;
    private List<MovimentacaoFerramentaResponseDTO> movimentacoes;
}
