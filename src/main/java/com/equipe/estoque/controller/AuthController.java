package com.equipe.estoque.controller;

import com.equipe.estoque.dto.auth.AccessTokenResponseDTO;
import com.equipe.estoque.dto.auth.AccountResponseDTO;
import com.equipe.estoque.dto.auth.LoginRequestDTO;
import com.equipe.estoque.dto.auth.RegisterRequestDTO;
import com.equipe.estoque.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Autenticação")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @Operation(summary = "Criar conta", description = "Cria uma conta comum sem acesso automático a organizações.")
    @ApiResponse(responseCode = "201", description = "Conta criada",
            content = @Content(schema = @Schema(implementation = AccountResponseDTO.class)))
    public ResponseEntity<AccountResponseDTO> register(@Valid @RequestBody RegisterRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    @Operation(summary = "Autenticar", description = "Retorna JWT curto que identifica somente a conta.")
    @ApiResponse(responseCode = "200", description = "Login realizado",
            content = @Content(schema = @Schema(implementation = AccessTokenResponseDTO.class)))
    public ResponseEntity<AccessTokenResponseDTO> login(@Valid @RequestBody LoginRequestDTO request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me")
    @Operation(summary = "Consultar conta autenticada")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponse(responseCode = "200", description = "Conta autenticada",
            content = @Content(schema = @Schema(implementation = AccountResponseDTO.class)))
    public ResponseEntity<AccountResponseDTO> me() {
        return ResponseEntity.ok(authService.me());
    }
}
