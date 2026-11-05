package com.equipe.estoque.dto.onboarding;

import com.equipe.estoque.enums.PerfilMembroOrganizacao;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CriarConviteRequestDTO {

    @NotBlank(message = "E-mail é obrigatório")
    @Email(message = "E-mail deve ter um formato válido")
    @Size(max = 254, message = "E-mail deve ter no máximo 254 caracteres")
    private String email;

    @NotNull(message = "Perfil é obrigatório")
    private PerfilMembroOrganizacao perfil;
}
