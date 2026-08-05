package com.equipe.estoque.controller;

import com.equipe.estoque.dto.usuario.UsuarioRequestDTO;
import com.equipe.estoque.dto.usuario.UsuarioResponseDTO;
import com.equipe.estoque.service.UsuarioService;
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
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
@Validated
@Tag(name = "Usuários")
@ApiResponses({
        @ApiResponse(responseCode = "400", ref = "#/components/responses/BadRequest"),
        @ApiResponse(responseCode = "404", ref = "#/components/responses/NotFound"),
        @ApiResponse(responseCode = "409", ref = "#/components/responses/Conflict"),
        @ApiResponse(responseCode = "500", ref = "#/components/responses/InternalError")
})
public class UsuarioController {

    private final UsuarioService usuarioService;

    @PostMapping
    @Operation(summary = "Criar usuário", description = "Cadastra um responsável interno; não cria autenticação.")
    @ApiResponse(responseCode = "201", description = "Usuário criado",
            content = @Content(schema = @Schema(implementation = UsuarioResponseDTO.class)))
    public ResponseEntity<UsuarioResponseDTO> criar(@Valid @RequestBody UsuarioRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(usuarioService.criar(dto));
    }

    @GetMapping
    @Operation(summary = "Listar usuários", description = "Retorna usuários ativos e inativos.")
    @ApiResponse(responseCode = "200", description = "Lista retornada",
            content = @Content(array = @ArraySchema(schema = @Schema(implementation = UsuarioResponseDTO.class))))
    public ResponseEntity<List<UsuarioResponseDTO>> listarTodos() {
        return ResponseEntity.ok(usuarioService.listarTodos());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar usuário por ID")
    @ApiResponse(responseCode = "200", description = "Usuário encontrado",
            content = @Content(schema = @Schema(implementation = UsuarioResponseDTO.class)))
    public ResponseEntity<UsuarioResponseDTO> buscarPorId(@PathVariable @Positive Long id) {
        return ResponseEntity.ok(usuarioService.buscarPorId(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar usuário", description = "Atualiza nome, e-mail e perfil sem alterar o estado ativo.")
    @ApiResponse(responseCode = "200", description = "Usuário atualizado",
            content = @Content(schema = @Schema(implementation = UsuarioResponseDTO.class)))
    public ResponseEntity<UsuarioResponseDTO> atualizar(
            @PathVariable @Positive Long id,
            @Valid @RequestBody UsuarioRequestDTO dto
    ) {
        return ResponseEntity.ok(usuarioService.atualizar(id, dto));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Inativar usuário", description = "Realiza exclusão lógica e preserva o histórico.")
    @ApiResponse(responseCode = "204", description = "Usuário inativado", content = @Content)
    public ResponseEntity<Void> inativar(@PathVariable @Positive Long id) {
        usuarioService.inativar(id);
        return ResponseEntity.noContent().build();
    }
}
