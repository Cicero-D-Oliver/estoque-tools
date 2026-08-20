package com.equipe.estoque.dto.organizacao;

import com.equipe.estoque.enums.PerfilMembroOrganizacao;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(name = "AprovacaoMembroRequest", description = "Perfil concedido ao aprovar uma solicitação")
public class AprovacaoMembroRequestDTO {

    @NotNull(message = "Perfil é obrigatório")
    @Schema(description = "Somente OPERADOR ou CONSULTA", example = "OPERADOR")
    private PerfilMembroOrganizacao perfil;
}
