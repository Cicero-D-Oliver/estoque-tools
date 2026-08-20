package com.equipe.estoque.controller;

import com.equipe.estoque.dto.item.ItemEstoqueRequestDTO;
import com.equipe.estoque.dto.item.ItemEstoqueResponseDTO;
import com.equipe.estoque.dto.movimentacao.MovimentacaoEstoqueRequestDTO;
import com.equipe.estoque.dto.movimentacao.MovimentacaoEstoqueResponseDTO;
import com.equipe.estoque.security.AuthenticatedAccount;
import com.equipe.estoque.security.OrganizationAuthorization;
import com.equipe.estoque.service.ItemEstoqueService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/itens")
@RequiredArgsConstructor
@Validated
@Tag(name = "Itens de estoque")
@SecurityRequirement(name = "bearerAuth")
@ApiResponses({
        @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest"),
        @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized"),
        @ApiResponse(responseCode = "403", ref = "#/components/responses/Forbidden"),
        @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound"),
        @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict"),
        @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
})
public class ItemEstoqueController {

    private final ItemEstoqueService itemEstoqueService;
    private final AuthenticatedAccount authenticatedAccount;

    @PostMapping
    @PreAuthorize("@organizationAuthorization.canAdmin(#organizacaoId, authentication)")
    @Operation(summary = "Criar item")
    public ResponseEntity<ItemEstoqueResponseDTO> criar(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId,
            @Valid @RequestBody ItemEstoqueRequestDTO dto
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(itemEstoqueService.criar(organizacaoId, dto));
    }

    @GetMapping
    @PreAuthorize("@organizationAuthorization.canRead(#organizacaoId, authentication)")
    @Operation(summary = "Listar itens")
    public ResponseEntity<List<ItemEstoqueResponseDTO>> listarTodos(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId
    ) {
        return ResponseEntity.ok(itemEstoqueService.listarTodos(organizacaoId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@organizationAuthorization.canRead(#organizacaoId, authentication)")
    @Operation(summary = "Buscar item por ID")
    public ResponseEntity<ItemEstoqueResponseDTO> buscarPorId(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId,
            @PathVariable @Positive Long id
    ) {
        return ResponseEntity.ok(itemEstoqueService.buscarPorId(organizacaoId, id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@organizationAuthorization.canAdmin(#organizacaoId, authentication)")
    @Operation(summary = "Atualizar item")
    public ResponseEntity<ItemEstoqueResponseDTO> atualizar(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId,
            @PathVariable @Positive Long id,
            @Valid @RequestBody ItemEstoqueRequestDTO dto
    ) {
        return ResponseEntity.ok(itemEstoqueService.atualizar(organizacaoId, id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@organizationAuthorization.canAdmin(#organizacaoId, authentication)")
    @Operation(summary = "Inativar item")
    public ResponseEntity<Void> inativar(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId,
            @PathVariable @Positive Long id
    ) {
        itemEstoqueService.inativar(organizacaoId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/entrada")
    @PreAuthorize("@organizationAuthorization.canOperate(#organizacaoId, authentication)")
    @Operation(summary = "Registrar entrada", description = "A autoria é sempre a conta autenticada.")
    public ResponseEntity<MovimentacaoEstoqueResponseDTO> registrarEntrada(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId,
            @PathVariable @Positive Long id,
            @Valid @RequestBody MovimentacaoEstoqueRequestDTO dto
    ) {
        return created(itemEstoqueService.registrarEntrada(
                organizacaoId, id, authenticatedAccount.id(), dto));
    }

    @PostMapping("/{id}/saida")
    @PreAuthorize("@organizationAuthorization.canOperate(#organizacaoId, authentication)")
    @Operation(summary = "Registrar saída", description = "A autoria é sempre a conta autenticada.")
    public ResponseEntity<MovimentacaoEstoqueResponseDTO> registrarSaida(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId,
            @PathVariable @Positive Long id,
            @Valid @RequestBody MovimentacaoEstoqueRequestDTO dto
    ) {
        return created(itemEstoqueService.registrarSaida(
                organizacaoId, id, authenticatedAccount.id(), dto));
    }

    @PostMapping("/{id}/correcao")
    @PreAuthorize("@organizationAuthorization.canAdmin(#organizacaoId, authentication)")
    @Operation(summary = "Corrigir saldo", description = "Exclusiva de ADMIN; autoria da conta autenticada.")
    public ResponseEntity<MovimentacaoEstoqueResponseDTO> registrarCorrecao(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId,
            @PathVariable @Positive Long id,
            @Valid @RequestBody MovimentacaoEstoqueRequestDTO dto
    ) {
        return created(itemEstoqueService.registrarCorrecao(
                organizacaoId, id, authenticatedAccount.id(), dto));
    }

    @GetMapping("/{id}/historico")
    @PreAuthorize("@organizationAuthorization.canRead(#organizacaoId, authentication)")
    @Operation(summary = "Consultar histórico do item")
    public ResponseEntity<List<MovimentacaoEstoqueResponseDTO>> consultarHistorico(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId,
            @PathVariable @Positive Long id
    ) {
        return ResponseEntity.ok(itemEstoqueService.consultarHistorico(organizacaoId, id));
    }

    @GetMapping("/abaixo-minimo")
    @PreAuthorize("@organizationAuthorization.canRead(#organizacaoId, authentication)")
    @Operation(summary = "Listar itens abaixo do mínimo")
    public ResponseEntity<List<ItemEstoqueResponseDTO>> listarAbaixoDoMinimo(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId
    ) {
        return ResponseEntity.ok(itemEstoqueService.listarAbaixoDoMinimo(organizacaoId));
    }

    private ResponseEntity<MovimentacaoEstoqueResponseDTO> created(
            MovimentacaoEstoqueResponseDTO response
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
