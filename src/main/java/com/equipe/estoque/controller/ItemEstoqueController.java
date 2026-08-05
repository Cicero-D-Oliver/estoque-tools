package com.equipe.estoque.controller;

import com.equipe.estoque.dto.item.ItemEstoqueRequestDTO;
import com.equipe.estoque.dto.item.ItemEstoqueResponseDTO;
import com.equipe.estoque.dto.movimentacao.MovimentacaoEstoqueRequestDTO;
import com.equipe.estoque.dto.movimentacao.MovimentacaoEstoqueResponseDTO;
import com.equipe.estoque.service.ItemEstoqueService;
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
@RequestMapping("/api/itens")
@RequiredArgsConstructor
@Validated
@Tag(name = "Itens de estoque")
@ApiResponses({
        @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest"),
        @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound"),
        @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict"),
        @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
})
public class ItemEstoqueController {

    private final ItemEstoqueService itemEstoqueService;

    @PostMapping
    @Operation(summary = "Criar item", description = "Cadastra um item consumível com saldo inicial opcional.")
    @ApiResponse(responseCode = "201", description = "Item criado",
            content = @Content(schema = @Schema(implementation = ItemEstoqueResponseDTO.class)))
    public ResponseEntity<ItemEstoqueResponseDTO> criar(@Valid @RequestBody ItemEstoqueRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(itemEstoqueService.criar(dto));
    }

    @GetMapping
    @Operation(summary = "Listar itens")
    @ApiResponse(responseCode = "200", description = "Lista retornada",
            content = @Content(array = @ArraySchema(schema = @Schema(implementation = ItemEstoqueResponseDTO.class))))
    public ResponseEntity<List<ItemEstoqueResponseDTO>> listarTodos() {
        return ResponseEntity.ok(itemEstoqueService.listarTodos());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar item por ID")
    @ApiResponse(responseCode = "200", description = "Item encontrado",
            content = @Content(schema = @Schema(implementation = ItemEstoqueResponseDTO.class)))
    public ResponseEntity<ItemEstoqueResponseDTO> buscarPorId(@PathVariable @Positive Long id) {
        return ResponseEntity.ok(itemEstoqueService.buscarPorId(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar item", description = "Atualiza dados cadastrais e estoque mínimo; o saldo não é alterado aqui.")
    @ApiResponse(responseCode = "200", description = "Item atualizado",
            content = @Content(schema = @Schema(implementation = ItemEstoqueResponseDTO.class)))
    public ResponseEntity<ItemEstoqueResponseDTO> atualizar(
            @PathVariable @Positive Long id,
            @Valid @RequestBody ItemEstoqueRequestDTO dto
    ) {
        return ResponseEntity.ok(itemEstoqueService.atualizar(id, dto));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Inativar item", description = "Realiza exclusão lógica e bloqueia novas movimentações.")
    @ApiResponse(responseCode = "204", description = "Item inativado", content = @Content)
    public ResponseEntity<Void> inativar(@PathVariable @Positive Long id) {
        itemEstoqueService.inativar(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/entrada")
    @Operation(summary = "Registrar entrada", description = "Soma uma quantidade positiva ao saldo e cria log imutável.")
    @ApiResponse(responseCode = "201", description = "Entrada registrada",
            content = @Content(schema = @Schema(implementation = MovimentacaoEstoqueResponseDTO.class)))
    public ResponseEntity<MovimentacaoEstoqueResponseDTO> registrarEntrada(
            @PathVariable @Positive Long id,
            @Valid @RequestBody MovimentacaoEstoqueRequestDTO dto
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(itemEstoqueService.registrarEntrada(id, dto));
    }

    @PostMapping("/{id}/saida")
    @Operation(summary = "Registrar saída", description = "Subtrai uma quantidade positiva quando há saldo suficiente.")
    @ApiResponse(responseCode = "201", description = "Saída registrada",
            content = @Content(schema = @Schema(implementation = MovimentacaoEstoqueResponseDTO.class)))
    public ResponseEntity<MovimentacaoEstoqueResponseDTO> registrarSaida(
            @PathVariable @Positive Long id,
            @Valid @RequestBody MovimentacaoEstoqueRequestDTO dto
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(itemEstoqueService.registrarSaida(id, dto));
    }

    @PostMapping("/{id}/correcao")
    @Operation(summary = "Corrigir saldo", description = "Define um novo saldo absoluto; exige justificativa e registra a diferença.")
    @ApiResponse(responseCode = "201", description = "Correção registrada",
            content = @Content(schema = @Schema(implementation = MovimentacaoEstoqueResponseDTO.class)))
    public ResponseEntity<MovimentacaoEstoqueResponseDTO> registrarCorrecao(
            @PathVariable @Positive Long id,
            @Valid @RequestBody MovimentacaoEstoqueRequestDTO dto
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(itemEstoqueService.registrarCorrecao(id, dto));
    }

    @GetMapping("/{id}/historico")
    @Operation(summary = "Consultar histórico do item", description = "Retorna movimentações da mais recente para a mais antiga.")
    @ApiResponse(responseCode = "200", description = "Histórico retornado",
            content = @Content(array = @ArraySchema(schema = @Schema(implementation = MovimentacaoEstoqueResponseDTO.class))))
    public ResponseEntity<List<MovimentacaoEstoqueResponseDTO>> consultarHistorico(@PathVariable @Positive Long id) {
        return ResponseEntity.ok(itemEstoqueService.consultarHistorico(id));
    }

    @GetMapping("/abaixo-minimo")
    @Operation(summary = "Listar itens abaixo do mínimo")
    @ApiResponse(responseCode = "200", description = "Itens ativos abaixo do mínimo",
            content = @Content(array = @ArraySchema(schema = @Schema(implementation = ItemEstoqueResponseDTO.class))))
    public ResponseEntity<List<ItemEstoqueResponseDTO>> listarAbaixoDoMinimo() {
        return ResponseEntity.ok(itemEstoqueService.listarAbaixoDoMinimo());
    }
}
