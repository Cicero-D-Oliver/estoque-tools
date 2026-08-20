package com.equipe.estoque.controller;

import com.equipe.estoque.dto.organizacao.AlteracaoPerfilMembroRequestDTO;
import com.equipe.estoque.dto.organizacao.AprovacaoMembroRequestDTO;
import com.equipe.estoque.dto.organizacao.MembroOrganizacaoResponseDTO;
import com.equipe.estoque.dto.organizacao.OrganizacaoRequestDTO;
import com.equipe.estoque.dto.organizacao.OrganizacaoResponseDTO;
import com.equipe.estoque.entity.Organizacao;
import com.equipe.estoque.security.AuthenticatedAccount;
import com.equipe.estoque.service.OrganizacaoMembroService;
import com.equipe.estoque.service.OrganizacaoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/organizacoes")
@RequiredArgsConstructor
@Validated
@Tag(name = "Organizações")
@SecurityRequirement(name = "bearerAuth")
public class OrganizacaoController {

    private final OrganizacaoService organizacaoService;
    private final OrganizacaoMembroService membroService;
    private final AuthenticatedAccount authenticatedAccount;

    @PostMapping
    @Operation(summary = "Criar organização", description = "O backend torna a conta autenticada ADMIN/ATIVO.")
    @ApiResponse(responseCode = "201", description = "Organização criada",
            content = @Content(schema = @Schema(implementation = OrganizacaoResponseDTO.class)))
    public ResponseEntity<OrganizacaoResponseDTO> criar(
            @Valid @RequestBody OrganizacaoRequestDTO request
    ) {
        Long accountId = authenticatedAccount.id();
        Organizacao organization = organizacaoService.criar(request.getNome(), accountId);
        MembroOrganizacaoResponseDTO member = membroService.buscarVinculo(
                organization.getId(),
                accountId
        );
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(OrganizacaoResponseDTO.builder()
                        .id(organization.getId())
                        .nome(organization.getNome())
                        .ativa(organization.getAtiva())
                        .criadaEm(organization.getCriadaEm())
                        .perfil(member.getPerfil())
                        .status(member.getStatus())
                        .build());
    }

    @GetMapping
    @Operation(summary = "Listar organizações da conta")
    @ApiResponse(responseCode = "200", description = "Organizações retornadas",
            content = @Content(array = @ArraySchema(schema = @Schema(implementation = OrganizacaoResponseDTO.class))))
    public ResponseEntity<List<OrganizacaoResponseDTO>> listar() {
        return ResponseEntity.ok(membroService.listarOrganizacoesDoUsuario(authenticatedAccount.id()));
    }

    @PostMapping("/{organizacaoId}/solicitacoes")
    @Operation(summary = "Solicitar participação", description = "Cria vínculo PENDENTE sem permitir escolha de perfil.")
    public ResponseEntity<MembroOrganizacaoResponseDTO> solicitar(
            @PathVariable @Positive Long organizacaoId
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(membroService.solicitarParticipacao(organizacaoId, authenticatedAccount.id()));
    }

    @GetMapping("/{organizacaoId}/solicitacoes")
    @PreAuthorize("@organizationAuthorization.canAdmin(#organizacaoId, authentication)")
    @Operation(summary = "Listar solicitações pendentes")
    public ResponseEntity<List<MembroOrganizacaoResponseDTO>> listarSolicitacoes(
            @PathVariable @Positive Long organizacaoId
    ) {
        return ResponseEntity.ok(membroService.listarSolicitacoes(organizacaoId, authenticatedAccount.id()));
    }

    @PutMapping("/{organizacaoId}/solicitacoes/{membroId}/aprovacao")
    @PreAuthorize("@organizationAuthorization.canAdmin(#organizacaoId, authentication)")
    @Operation(summary = "Aprovar solicitação", description = "Aceita somente OPERADOR ou CONSULTA.")
    public ResponseEntity<MembroOrganizacaoResponseDTO> aprovar(
            @PathVariable @Positive Long organizacaoId,
            @PathVariable @Positive Long membroId,
            @Valid @RequestBody AprovacaoMembroRequestDTO request
    ) {
        return ResponseEntity.ok(membroService.aprovar(
                organizacaoId,
                membroId,
                authenticatedAccount.id(),
                request.getPerfil()
        ));
    }

    @GetMapping("/{organizacaoId}/membros")
    @PreAuthorize("@organizationAuthorization.canAdmin(#organizacaoId, authentication)")
    @Operation(summary = "Listar membros")
    public ResponseEntity<List<MembroOrganizacaoResponseDTO>> listarMembros(
            @PathVariable @Positive Long organizacaoId
    ) {
        return ResponseEntity.ok(membroService.listarMembros(organizacaoId, authenticatedAccount.id()));
    }

    @PutMapping("/{organizacaoId}/membros/{membroId}/perfil")
    @PreAuthorize("@organizationAuthorization.canAdmin(#organizacaoId, authentication)")
    @Operation(summary = "Alterar perfil", description = "Somente ADMIN ativo; preserva o último ADMIN.")
    public ResponseEntity<MembroOrganizacaoResponseDTO> alterarPerfil(
            @PathVariable @Positive Long organizacaoId,
            @PathVariable @Positive Long membroId,
            @Valid @RequestBody AlteracaoPerfilMembroRequestDTO request
    ) {
        return ResponseEntity.ok(membroService.alterarPerfil(
                organizacaoId,
                membroId,
                authenticatedAccount.id(),
                request.getPerfil()
        ));
    }

    @DeleteMapping("/{organizacaoId}/membros/{membroId}")
    @PreAuthorize("@organizationAuthorization.canAdmin(#organizacaoId, authentication)")
    @Operation(summary = "Remover membro", description = "Remoção lógica; preserva o último ADMIN.")
    public ResponseEntity<Void> remover(
            @PathVariable @Positive Long organizacaoId,
            @PathVariable @Positive Long membroId
    ) {
        membroService.remover(organizacaoId, membroId, authenticatedAccount.id());
        return ResponseEntity.noContent().build();
    }
}
