package com.equipe.estoque.controller;

import com.equipe.estoque.dto.auth.LoginRequestDTO;
import com.equipe.estoque.dto.auth.MobileRefreshTokenRequestDTO;
import com.equipe.estoque.dto.auth.MobileTokenResponseDTO;
import com.equipe.estoque.security.AuthenticatedAccount;
import com.equipe.estoque.service.AuthService;
import com.equipe.estoque.service.AuthSessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/mobile/auth")
@RequiredArgsConstructor
@Tag(name = "Autenticação mobile")
public class MobileAuthController {

    private final AuthService authService;
    private final AuthSessionService authSessionService;
    private final AuthenticatedAccount authenticatedAccount;

    @PostMapping("/login")
    @Operation(
            summary = "Autenticar aplicativo nativo",
            description = "Entrega access token curto e refresh token rotativo para o cofre seguro do aparelho."
    )
    @ApiResponse(responseCode = "200", description = "Login realizado",
            content = @Content(schema = @Schema(implementation = MobileTokenResponseDTO.class)))
    public ResponseEntity<MobileTokenResponseDTO> login(@Valid @RequestBody LoginRequestDTO request) {
        return ResponseEntity.ok(MobileTokenResponseDTO.from(authService.login(request)));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Renovar sessão mobile", description = "Rotaciona o refresh token a cada uso.")
    @ApiResponse(responseCode = "200", description = "Sessão renovada",
            content = @Content(schema = @Schema(implementation = MobileTokenResponseDTO.class)))
    public ResponseEntity<MobileTokenResponseDTO> refresh(
            @Valid @RequestBody MobileRefreshTokenRequestDTO request
    ) {
        return ResponseEntity.ok(MobileTokenResponseDTO.from(
                authSessionService.refresh(request.getRefreshToken())
        ));
    }

    @PostMapping("/logout")
    @Operation(summary = "Encerrar sessão mobile atual")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<Void> logout(@Valid @RequestBody MobileRefreshTokenRequestDTO request) {
        authSessionService.logout(authenticatedAccount.id(), request.getRefreshToken());
        return ResponseEntity.noContent().build();
    }
}
