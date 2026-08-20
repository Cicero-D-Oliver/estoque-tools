package com.equipe.estoque.dto.movimentacao;

import com.equipe.estoque.enums.StatusFerramenta;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(name = "MovimentacaoFerramentaRequest", description = "Operação que altera o estado de uma ferramenta")
public class MovimentacaoFerramentaRequestDTO {

    @Deprecated
    @Schema(description = "Campo legado aceito por compatibilidade e ignorado; a autoria vem do token",
            example = "1", deprecated = true)
    private Long usuarioId;

    @Schema(description = "Novo estado, usado somente em correção", example = "DISPONIVEL")
    private StatusFerramenta novoStatus;

    @Size(max = 500, message = "Observação deve ter no máximo 500 caracteres")
    @Schema(description = "Justificativa; obrigatória em correções", example = "Ferramenta localizada", maxLength = 500)
    private String observacao;
}
