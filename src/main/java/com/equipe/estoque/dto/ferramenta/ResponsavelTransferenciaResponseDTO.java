package com.equipe.estoque.dto.ferramenta;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(
        name = "ResponsavelTransferenciaResponse",
        description = "Identificação mínima de um membro apto a receber uma ferramenta"
)
public class ResponsavelTransferenciaResponseDTO {

    @Schema(description = "Identificador de usuário aceito pela transferência", example = "12")
    private Long id;

    @Schema(description = "Nome do membro", example = "João Silva")
    private String nome;
}
