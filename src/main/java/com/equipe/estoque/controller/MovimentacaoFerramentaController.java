package com.equipe.estoque.controller;

import com.equipe.estoque.dto.movimentacao.MovimentacaoFerramentaResponseDTO;
import com.equipe.estoque.service.MovimentacaoFerramentaService;
import com.equipe.estoque.security.OrganizationAuthorization;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;

import java.util.List;

@RestController
@RequestMapping("/api/movimentacoes-ferramenta")
@RequiredArgsConstructor
@Tag(name = "Auditoria de ferramentas")
@Validated
@SecurityRequirement(name = "bearerAuth")
public class MovimentacaoFerramentaController {

    private final MovimentacaoFerramentaService movimentacaoFerramentaService;

    @GetMapping
    @PreAuthorize("@organizationAuthorization.canRead(#organizacaoId, authentication)")
    @Operation(summary = "Listar todas as movimentações de ferramentas", description = "Consulta somente leitura para auditoria geral.")
    @ApiResponse(responseCode = "200", description = "Movimentações retornadas",
            content = @Content(array = @ArraySchema(schema = @Schema(implementation = MovimentacaoFerramentaResponseDTO.class))))
    @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
    public ResponseEntity<List<MovimentacaoFerramentaResponseDTO>> listarTodas(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId
    ) {
        return ResponseEntity.ok(movimentacaoFerramentaService.listarTodas(organizacaoId));
    }
}
