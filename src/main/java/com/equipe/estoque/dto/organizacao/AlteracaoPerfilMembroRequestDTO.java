package com.equipe.estoque.dto.organizacao;

import com.equipe.estoque.enums.PerfilMembroOrganizacao;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(name = "AlteracaoPerfilMembroRequest", description = "Alteração administrativa explícita de perfil")
public class AlteracaoPerfilMembroRequestDTO {

    @NotNull(message = "Perfil é obrigatório")
    @Schema(example = "CONSULTA")
    private PerfilMembroOrganizacao perfil;
}
