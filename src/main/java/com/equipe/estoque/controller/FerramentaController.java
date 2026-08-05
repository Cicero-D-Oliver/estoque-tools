package com.equipe.estoque.controller;

import com.equipe.estoque.dto.ferramenta.FerramentaRequestDTO;
import com.equipe.estoque.dto.ferramenta.FerramentaResponseDTO;
import com.equipe.estoque.dto.movimentacao.MovimentacaoFerramentaRequestDTO;
import com.equipe.estoque.dto.movimentacao.MovimentacaoFerramentaResponseDTO;
import com.equipe.estoque.service.FerramentaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ferramentas")
@RequiredArgsConstructor
@Validated
@Tag(name = "Ferramentas")
@ApiResponses({
        @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest"),
        @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound"),
        @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict"),
        @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
})
public class FerramentaController {

    private final FerramentaService ferramentaService;

    @PostMapping
    @Operation(summary = "Criar ferramenta", description = "Cadastra uma ferramenta inicialmente disponível.")
    @ApiResponse(responseCode = "201", description = "Ferramenta criada",
            content = @Content(schema = @Schema(implementation = FerramentaResponseDTO.class)))
    public ResponseEntity<FerramentaResponseDTO> criar(@Valid @RequestBody FerramentaRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ferramentaService.criar(dto));
    }

    @GetMapping
    @Operation(summary = "Listar ferramentas")
    @ApiResponse(responseCode = "200", description = "Lista retornada",
            content = @Content(array = @ArraySchema(schema = @Schema(implementation = FerramentaResponseDTO.class))))
    public ResponseEntity<List<FerramentaResponseDTO>> listarTodas() {
        return ResponseEntity.ok(ferramentaService.listarTodas());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar ferramenta por ID")
    @ApiResponse(responseCode = "200", description = "Ferramenta encontrada",
            content = @Content(schema = @Schema(implementation = FerramentaResponseDTO.class)))
    public ResponseEntity<FerramentaResponseDTO> buscarPorId(@PathVariable @Positive Long id) {
        return ResponseEntity.ok(ferramentaService.buscarPorId(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar ferramenta", description = "Atualiza somente dados cadastrais, sem alterar o estado.")
    @ApiResponse(responseCode = "200", description = "Ferramenta atualizada",
            content = @Content(schema = @Schema(implementation = FerramentaResponseDTO.class)))
    public ResponseEntity<FerramentaResponseDTO> atualizar(
            @PathVariable @Positive Long id,
            @Valid @RequestBody FerramentaRequestDTO dto
    ) {
        return ResponseEntity.ok(ferramentaService.atualizar(id, dto));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Inativar ferramenta", description = "Bloqueia novas operações; ferramenta emprestada deve ser devolvida antes.")
    @ApiResponse(responseCode = "204", description = "Ferramenta inativada", content = @Content)
    public ResponseEntity<Void> inativar(@PathVariable @Positive Long id) {
        ferramentaService.inativar(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/retirada")
    @Operation(summary = "Retirar ferramenta", description = "Muda DISPONIVEL para EMPRESTADA e registra o responsável atual.")
    @ApiResponse(responseCode = "201", description = "Retirada registrada",
            content = @Content(schema = @Schema(implementation = MovimentacaoFerramentaResponseDTO.class)))
    public ResponseEntity<MovimentacaoFerramentaResponseDTO> registrarRetirada(
            @PathVariable @Positive Long id,
            @Valid @RequestBody MovimentacaoFerramentaRequestDTO dto
    ) {
        return created(ferramentaService.registrarRetirada(id, dto));
    }

    @PostMapping("/{id}/devolucao")
    @Operation(summary = "Devolver ferramenta", description = "Muda EMPRESTADA para DISPONIVEL e remove o responsável atual.")
    @ApiResponse(responseCode = "201", description = "Devolução registrada",
            content = @Content(schema = @Schema(implementation = MovimentacaoFerramentaResponseDTO.class)))
    public ResponseEntity<MovimentacaoFerramentaResponseDTO> registrarDevolucao(
            @PathVariable @Positive Long id,
            @Valid @RequestBody MovimentacaoFerramentaRequestDTO dto
    ) {
        return created(ferramentaService.registrarDevolucao(id, dto));
    }

    @PostMapping("/{id}/manutencao")
    @Operation(summary = "Enviar para manutenção", description = "Muda para MANUTENCAO e remove o responsável atual.")
    @ApiResponse(responseCode = "201", description = "Manutenção registrada",
            content = @Content(schema = @Schema(implementation = MovimentacaoFerramentaResponseDTO.class)))
    public ResponseEntity<MovimentacaoFerramentaResponseDTO> registrarManutencao(
            @PathVariable @Positive Long id,
            @Valid @RequestBody MovimentacaoFerramentaRequestDTO dto
    ) {
        return created(ferramentaService.registrarManutencao(id, dto));
    }

    @PostMapping("/{id}/perda")
    @Operation(summary = "Registrar perda", description = "Muda para PERDIDA e remove o responsável atual.")
    @ApiResponse(responseCode = "201", description = "Perda registrada",
            content = @Content(schema = @Schema(implementation = MovimentacaoFerramentaResponseDTO.class)))
    public ResponseEntity<MovimentacaoFerramentaResponseDTO> registrarPerda(
            @PathVariable @Positive Long id,
            @Valid @RequestBody MovimentacaoFerramentaRequestDTO dto
    ) {
        return created(ferramentaService.registrarPerda(id, dto));
    }

    @PostMapping("/{id}/correcao")
    @Operation(summary = "Corrigir estado", description = "Corrige para DISPONIVEL, MANUTENCAO ou PERDIDA com justificativa. "
            + "EMPRESTADA exige o fluxo de retirada.")
    @ApiResponse(responseCode = "201", description = "Correção registrada",
            content = @Content(schema = @Schema(implementation = MovimentacaoFerramentaResponseDTO.class)))
    public ResponseEntity<MovimentacaoFerramentaResponseDTO> registrarCorrecao(
            @PathVariable @Positive Long id,
            @Valid @RequestBody MovimentacaoFerramentaRequestDTO dto
    ) {
        return created(ferramentaService.registrarCorrecao(id, dto));
    }

    @GetMapping("/{id}/historico")
    @Operation(summary = "Consultar histórico da ferramenta", description = "Retorna operações da mais recente para a mais antiga.")
    @ApiResponse(responseCode = "200", description = "Histórico retornado",
            content = @Content(array = @ArraySchema(schema = @Schema(implementation = MovimentacaoFerramentaResponseDTO.class))))
    public ResponseEntity<List<MovimentacaoFerramentaResponseDTO>> consultarHistorico(
            @PathVariable @Positive Long id
    ) {
        return ResponseEntity.ok(ferramentaService.consultarHistorico(id));
    }

    @GetMapping("/emprestadas")
    @Operation(summary = "Listar ferramentas emprestadas")
    @ApiResponse(responseCode = "200", description = "Ferramentas emprestadas",
            content = @Content(array = @ArraySchema(schema = @Schema(implementation = FerramentaResponseDTO.class))))
    public ResponseEntity<List<FerramentaResponseDTO>> listarEmprestadas() {
        return ResponseEntity.ok(ferramentaService.listarEmprestadas());
    }

    @GetMapping("/{id}/ultimo-responsavel")
    @Operation(summary = "Consultar último responsável", description = "Retorna a retirada mais recente, mesmo após devolução.")
    @ApiResponse(responseCode = "200", description = "Última retirada encontrada",
            content = @Content(schema = @Schema(implementation = MovimentacaoFerramentaResponseDTO.class)))
    public ResponseEntity<MovimentacaoFerramentaResponseDTO> consultarUltimoResponsavel(
            @PathVariable @Positive Long id
    ) {
        return ResponseEntity.ok(ferramentaService.consultarUltimoResponsavel(id));
    }

    private ResponseEntity<MovimentacaoFerramentaResponseDTO> created(
            MovimentacaoFerramentaResponseDTO response
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
