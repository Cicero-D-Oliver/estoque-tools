package com.equipe.estoque.controller;

import com.equipe.estoque.dto.ferramenta.FerramentaRequestDTO;
import com.equipe.estoque.dto.ferramenta.FerramentaResponseDTO;
import com.equipe.estoque.dto.ferramenta.ResponsavelTransferenciaResponseDTO;
import com.equipe.estoque.dto.movimentacao.MovimentacaoFerramentaRequestDTO;
import com.equipe.estoque.dto.movimentacao.MovimentacaoFerramentaResponseDTO;
import com.equipe.estoque.security.AuthenticatedAccount;
import com.equipe.estoque.security.OrganizationAuthorization;
import com.equipe.estoque.service.FerramentaService;
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
@RequestMapping("/api/ferramentas")
@RequiredArgsConstructor
@Validated
@Tag(name = "Ferramentas")
@SecurityRequirement(name = "bearerAuth")
@ApiResponses({
        @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest"),
        @ApiResponse(responseCode = "401", ref = "#/components/responses/Unauthorized"),
        @ApiResponse(responseCode = "403", ref = "#/components/responses/Forbidden"),
        @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound"),
        @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict"),
        @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
})
public class FerramentaController {

    private final FerramentaService ferramentaService;
    private final AuthenticatedAccount authenticatedAccount;

    @PostMapping
    @PreAuthorize("@organizationAuthorization.canAdmin(#organizacaoId, authentication)")
    @Operation(summary = "Criar ferramenta")
    public ResponseEntity<FerramentaResponseDTO> criar(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId,
            @Valid @RequestBody FerramentaRequestDTO dto
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ferramentaService.criar(organizacaoId, dto));
    }

    @GetMapping
    @PreAuthorize("@organizationAuthorization.canRead(#organizacaoId, authentication)")
    @Operation(summary = "Listar ferramentas")
    public ResponseEntity<List<FerramentaResponseDTO>> listarTodas(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId
    ) {
        return ResponseEntity.ok(ferramentaService.listarTodas(organizacaoId));
    }

    @GetMapping("/responsaveis-transferencia")
    @PreAuthorize("@organizationAuthorization.canOperate(#organizacaoId, authentication)")
    @Operation(
            summary = "Listar responsáveis para transferência",
            description = "Retorna somente membros ADMIN ou OPERADOR ativos da organização selecionada."
    )
    public ResponseEntity<List<ResponsavelTransferenciaResponseDTO>> listarResponsaveisTransferencia(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId
    ) {
        return ResponseEntity.ok(ferramentaService.listarResponsaveisTransferencia(organizacaoId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@organizationAuthorization.canRead(#organizacaoId, authentication)")
    @Operation(summary = "Buscar ferramenta por ID")
    public ResponseEntity<FerramentaResponseDTO> buscarPorId(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId,
            @PathVariable @Positive Long id
    ) {
        return ResponseEntity.ok(ferramentaService.buscarPorId(organizacaoId, id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@organizationAuthorization.canAdmin(#organizacaoId, authentication)")
    @Operation(summary = "Atualizar ferramenta")
    public ResponseEntity<FerramentaResponseDTO> atualizar(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId,
            @PathVariable @Positive Long id,
            @Valid @RequestBody FerramentaRequestDTO dto
    ) {
        return ResponseEntity.ok(ferramentaService.atualizar(organizacaoId, id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@organizationAuthorization.canAdmin(#organizacaoId, authentication)")
    @Operation(summary = "Inativar ferramenta")
    public ResponseEntity<Void> inativar(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId,
            @PathVariable @Positive Long id
    ) {
        ferramentaService.inativar(organizacaoId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/retirada")
    @PreAuthorize("@organizationAuthorization.canOperate(#organizacaoId, authentication)")
    @Operation(summary = "Retirar ferramenta", description = "A autoria e o responsável são a conta autenticada.")
    public ResponseEntity<MovimentacaoFerramentaResponseDTO> registrarRetirada(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId,
            @PathVariable @Positive Long id,
            @Valid @RequestBody MovimentacaoFerramentaRequestDTO dto
    ) {
        return created(ferramentaService.registrarRetirada(
                organizacaoId, id, authenticatedAccount.id(), dto));
    }

    @PostMapping("/{id}/devolucao")
    @PreAuthorize("@organizationAuthorization.canOperate(#organizacaoId, authentication)")
    @Operation(summary = "Devolver ferramenta", description = "A autoria é sempre a conta autenticada.")
    public ResponseEntity<MovimentacaoFerramentaResponseDTO> registrarDevolucao(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId,
            @PathVariable @Positive Long id,
            @Valid @RequestBody MovimentacaoFerramentaRequestDTO dto
    ) {
        return created(ferramentaService.registrarDevolucao(
                organizacaoId, id, authenticatedAccount.id(), dto));
    }

    @PostMapping("/{id}/transferencia")
    @PreAuthorize("@organizationAuthorization.canOperate(#organizacaoId, authentication)")
    @Operation(
            summary = "Transferir responsabilidade",
            description = "Registra a passagem explícita para outro membro operacional ativo da mesma organização."
    )
    public ResponseEntity<MovimentacaoFerramentaResponseDTO> registrarTransferencia(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId,
            @PathVariable @Positive Long id,
            @Valid @RequestBody MovimentacaoFerramentaRequestDTO dto
    ) {
        return created(ferramentaService.registrarTransferencia(
                organizacaoId, id, authenticatedAccount.id(), dto));
    }

    @PostMapping("/{id}/manutencao")
    @PreAuthorize("@organizationAuthorization.canOperate(#organizacaoId, authentication)")
    @Operation(summary = "Enviar para manutenção", description = "A autoria é sempre a conta autenticada.")
    public ResponseEntity<MovimentacaoFerramentaResponseDTO> registrarManutencao(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId,
            @PathVariable @Positive Long id,
            @Valid @RequestBody MovimentacaoFerramentaRequestDTO dto
    ) {
        return created(ferramentaService.registrarManutencao(
                organizacaoId, id, authenticatedAccount.id(), dto));
    }

    @PostMapping("/{id}/conclusao-manutencao")
    @PreAuthorize("@organizationAuthorization.canOperate(#organizacaoId, authentication)")
    @Operation(
            summary = "Concluir manutenção",
            description = "Retorna a ferramenta ao estado disponível e registra um novo evento imutável."
    )
    public ResponseEntity<MovimentacaoFerramentaResponseDTO> registrarConclusaoManutencao(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId,
            @PathVariable @Positive Long id,
            @Valid @RequestBody MovimentacaoFerramentaRequestDTO dto
    ) {
        return created(ferramentaService.registrarConclusaoManutencao(
                organizacaoId, id, authenticatedAccount.id(), dto));
    }

    @PostMapping("/{id}/perda")
    @PreAuthorize("@organizationAuthorization.canOperate(#organizacaoId, authentication)")
    @Operation(summary = "Registrar perda", description = "A autoria é sempre a conta autenticada.")
    public ResponseEntity<MovimentacaoFerramentaResponseDTO> registrarPerda(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId,
            @PathVariable @Positive Long id,
            @Valid @RequestBody MovimentacaoFerramentaRequestDTO dto
    ) {
        return created(ferramentaService.registrarPerda(
                organizacaoId, id, authenticatedAccount.id(), dto));
    }

    @PostMapping("/{id}/correcao")
    @PreAuthorize("@organizationAuthorization.canAdmin(#organizacaoId, authentication)")
    @Operation(summary = "Corrigir estado", description = "Exclusiva de ADMIN; autoria da conta autenticada.")
    public ResponseEntity<MovimentacaoFerramentaResponseDTO> registrarCorrecao(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId,
            @PathVariable @Positive Long id,
            @Valid @RequestBody MovimentacaoFerramentaRequestDTO dto
    ) {
        return created(ferramentaService.registrarCorrecao(
                organizacaoId, id, authenticatedAccount.id(), dto));
    }

    @GetMapping("/{id}/historico")
    @PreAuthorize("@organizationAuthorization.canRead(#organizacaoId, authentication)")
    @Operation(summary = "Consultar histórico da ferramenta")
    public ResponseEntity<List<MovimentacaoFerramentaResponseDTO>> consultarHistorico(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId,
            @PathVariable @Positive Long id
    ) {
        return ResponseEntity.ok(ferramentaService.consultarHistorico(organizacaoId, id));
    }

    @GetMapping("/emprestadas")
    @PreAuthorize("@organizationAuthorization.canRead(#organizacaoId, authentication)")
    @Operation(summary = "Listar ferramentas emprestadas")
    public ResponseEntity<List<FerramentaResponseDTO>> listarEmprestadas(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId
    ) {
        return ResponseEntity.ok(ferramentaService.listarEmprestadas(organizacaoId));
    }

    @GetMapping("/{id}/ultimo-responsavel")
    @PreAuthorize("@organizationAuthorization.canRead(#organizacaoId, authentication)")
    @Operation(summary = "Consultar último responsável")
    public ResponseEntity<MovimentacaoFerramentaResponseDTO> consultarUltimoResponsavel(
            @RequestHeader(OrganizationAuthorization.HEADER_NAME) @Positive Long organizacaoId,
            @PathVariable @Positive Long id
    ) {
        return ResponseEntity.ok(ferramentaService.consultarUltimoResponsavel(organizacaoId, id));
    }

    private ResponseEntity<MovimentacaoFerramentaResponseDTO> created(
            MovimentacaoFerramentaResponseDTO response
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
