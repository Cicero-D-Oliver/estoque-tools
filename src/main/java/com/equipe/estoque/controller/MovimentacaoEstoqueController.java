package com.equipe.estoque.controller;

import com.equipe.estoque.dto.movimentacao.MovimentacaoEstoqueResponseDTO;
import com.equipe.estoque.service.MovimentacaoEstoqueService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/movimentacoes-estoque")
@RequiredArgsConstructor
@Tag(name = "Auditoria de estoque")
public class MovimentacaoEstoqueController {

    private final MovimentacaoEstoqueService movimentacaoEstoqueService;

    @GetMapping
    @Operation(summary = "Listar todas as movimentações de estoque", description = "Consulta somente leitura para auditoria geral.")
    @ApiResponse(responseCode = "200", description = "Movimentações retornadas",
            content = @Content(array = @ArraySchema(schema = @Schema(implementation = MovimentacaoEstoqueResponseDTO.class))))
    @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
    public ResponseEntity<List<MovimentacaoEstoqueResponseDTO>> listarTodas() {
        return ResponseEntity.ok(movimentacaoEstoqueService.listarTodas());
    }
}
