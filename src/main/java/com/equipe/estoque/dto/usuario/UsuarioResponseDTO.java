package com.equipe.estoque.dto.usuario;

import com.equipe.estoque.enums.PerfilUsuario;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(name = "UsuarioResponse", description = "Usuário cadastrado")
public class UsuarioResponseDTO {
    @Schema(example = "1") private Long id;
    @Schema(example = "Maria Oliveira") private String nome;
    @Schema(example = "maria@empresa.com") private String email;
    @Schema(example = "OPERADOR") private PerfilUsuario perfil;
    @Schema(example = "true") private Boolean ativo;
}
