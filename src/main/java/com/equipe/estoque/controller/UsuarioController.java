package com.equipe.estoque.controller;

import com.equipe.estoque.dto.usuario.UsuarioResponseDTO;
import com.equipe.estoque.security.OrganizationAuthorization;
import com.equipe.estoque.service.UsuarioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
@Validated
@Tag(name = "Usuários")
@SecurityRequirement(name = "bearerAuth")
public class UsuarioController {

    private final UsuarioService usuarioService;

    @GetMapping
    @PreAuthorize("@organizationAuthorization.canAdmin(#organizacaoId, authentication)")
    @Operation(summary = "Listar usuários da organização",
            description = "Retorna somente membros ativos da organização selecionada.")
    @ApiResponse(responseCode = "200", description = "Lista retornada",
            content = @Content(array = @ArraySchema(schema = @Schema(implementation = UsuarioResponseDTO.class))))
    public ResponseEntity<List<UsuarioResponseDTO>> listar(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId
    ) {
        return ResponseEntity.ok(usuarioService.listarDaOrganizacao(organizacaoId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@organizationAuthorization.canAdmin(#organizacaoId, authentication)")
    @Operation(summary = "Buscar usuário na organização")
    public ResponseEntity<UsuarioResponseDTO> buscar(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId,
            @PathVariable @Positive Long id
    ) {
        return ResponseEntity.ok(usuarioService.buscarNaOrganizacao(organizacaoId, id));
    }
}
