package com.equipe.estoque.dto.organizacao;

import com.equipe.estoque.enums.PerfilMembroOrganizacao;
import com.equipe.estoque.enums.StatusMembroOrganizacao;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
@Schema(name = "MembroOrganizacaoResponse", description = "Vínculo de uma conta com uma organização")
public class MembroOrganizacaoResponseDTO {
    @Schema(example = "10") private Long id;
    @Schema(example = "1") private Long organizacaoId;
    @Schema(example = "2") private Long usuarioId;
    @Schema(example = "João Silva") private String usuarioNome;
    @Schema(example = "joao@empresa.com") private String usuarioEmail;
    @Schema(example = "OPERADOR") private PerfilMembroOrganizacao perfil;
    @Schema(example = "ATIVO") private StatusMembroOrganizacao status;
    @Schema(example = "2026-08-19T10:00:00") private LocalDateTime solicitadoEm;
    @Schema(nullable = true, example = "2026-08-19T11:00:00") private LocalDateTime aprovadoEm;
    @Schema(nullable = true, example = "1") private Long aprovadoPorUsuarioId;
    @Schema(nullable = true, example = "2026-08-20T09:00:00") private LocalDateTime removidoEm;
}
