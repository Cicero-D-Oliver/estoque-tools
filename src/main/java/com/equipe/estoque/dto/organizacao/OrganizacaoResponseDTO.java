package com.equipe.estoque.dto.organizacao;

import com.equipe.estoque.enums.PerfilMembroOrganizacao;
import com.equipe.estoque.enums.StatusMembroOrganizacao;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
@Schema(name = "OrganizacaoResponse", description = "Organização e vínculo da conta atual")
public class OrganizacaoResponseDTO {
    @Schema(example = "1") private Long id;
    @Schema(example = "Almoxarifado Central") private String nome;
    @Schema(example = "true") private Boolean ativa;
    @Schema(example = "2026-08-19T10:00:00") private LocalDateTime criadaEm;
    @Schema(example = "ADMIN") private PerfilMembroOrganizacao perfil;
    @Schema(example = "ATIVO") private StatusMembroOrganizacao status;
}
