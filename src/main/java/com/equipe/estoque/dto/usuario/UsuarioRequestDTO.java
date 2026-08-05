package com.equipe.estoque.dto.usuario;

import com.equipe.estoque.enums.PerfilUsuario;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(name = "UsuarioRequest", description = "Dados cadastrais de um usuário interno do estoque")
public class UsuarioRequestDTO {

    @NotBlank(message = "Nome é obrigatório")
    @Size(max = 120, message = "Nome deve ter no máximo 120 caracteres")
    @Schema(description = "Nome completo", example = "Maria Oliveira", maxLength = 120)
    private String nome;

    @Email(message = "E-mail deve ter um formato válido (ex: nome@dominio.com)")
    @NotBlank(message = "E-mail é obrigatório")
    @Size(max = 254, message = "E-mail deve ter no máximo 254 caracteres")
    @Schema(description = "E-mail corporativo único", example = "maria@empresa.com", maxLength = 254)
    private String email;

    @NotNull(message = "Perfil é obrigatório (ADMIN, OPERADOR ou CONSULTA)")
    @Schema(description = "Perfil cadastral para uso futuro em autorização", example = "OPERADOR")
    private PerfilUsuario perfil;
}
