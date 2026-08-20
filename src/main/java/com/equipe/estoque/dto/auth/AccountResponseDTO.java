package com.equipe.estoque.dto.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
@Schema(name = "AccountResponse", description = "Conta global sem dados de credencial")
public class AccountResponseDTO {
    @Schema(example = "1") private Long id;
    @Schema(example = "Maria Oliveira") private String nome;
    @Schema(example = "maria@empresa.com") private String email;
    @Schema(example = "true") private Boolean ativo;
    @Schema(example = "2026-08-19T10:15:30") private LocalDateTime senhaAlteradaEm;
    @Schema(nullable = true, example = "2026-08-19T11:00:00") private LocalDateTime ultimoLoginEm;
}
