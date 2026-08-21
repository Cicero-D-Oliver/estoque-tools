package com.equipe.estoque.controller;

import com.equipe.estoque.dto.movimentacao.MovimentacaoFerramentaResponseDTO;
import com.equipe.estoque.dto.movimentacao.ResumoMovimentacoesFerramentaResponseDTO;
import com.equipe.estoque.security.AuthenticatedAccount;
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
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
    private final AuthenticatedAccount authenticatedAccount;

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

    @GetMapping("/pendentes")
    @PreAuthorize("@organizationAuthorization.canAdmin(#organizacaoId, authentication)")
    @Operation(summary = "Listar movimentações pendentes de confirmação administrativa")
    public ResponseEntity<List<MovimentacaoFerramentaResponseDTO>> listarPendentes(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId
    ) {
        return ResponseEntity.ok(movimentacaoFerramentaService.listarPendentes(
                organizacaoId,
                authenticatedAccount.id()
        ));
    }

    @PostMapping("/{id}/confirmacao")
    @PreAuthorize("@organizationAuthorization.canAdmin(#organizacaoId, authentication)")
    @Operation(
            summary = "Confirmar movimentação",
            description = "Registra a revisão do ADMIN sem reexecutar o efeito operacional."
    )
    public ResponseEntity<MovimentacaoFerramentaResponseDTO> confirmar(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId,
            @PathVariable @Positive Long id
    ) {
        return ResponseEntity.ok(movimentacaoFerramentaService.confirmar(
                organizacaoId,
                id,
                authenticatedAccount.id()
        ));
    }

    @GetMapping("/resumo")
    @PreAuthorize("@organizationAuthorization.canAdmin(#organizacaoId, authentication)")
    @Operation(summary = "Consultar resumo incremental para o ADMIN")
    public ResponseEntity<ResumoMovimentacoesFerramentaResponseDTO> resumir(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId,
            @RequestParam(defaultValue = "0") @PositiveOrZero Long aposId,
            @RequestParam(defaultValue = "100") @Min(1) @Max(200) Integer limite
    ) {
        return ResponseEntity.ok(movimentacaoFerramentaService.resumir(
                organizacaoId,
                authenticatedAccount.id(),
                aposId,
                limite
        ));
    }
}
