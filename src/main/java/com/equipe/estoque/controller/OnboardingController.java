package com.equipe.estoque.controller;

import com.equipe.estoque.dto.onboarding.AtivacaoConcluidaResponseDTO;
import com.equipe.estoque.dto.onboarding.AtivacaoPreviewResponseDTO;
import com.equipe.estoque.dto.onboarding.BootstrapStatusResponseDTO;
import com.equipe.estoque.dto.onboarding.ConcluirAtivacaoRequestDTO;
import com.equipe.estoque.dto.onboarding.SolicitarBootstrapRequestDTO;
import com.equipe.estoque.service.OnboardingService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/onboarding")
@RequiredArgsConstructor
@Validated
public class OnboardingController {

    private final OnboardingService onboardingService;

    @GetMapping("/bootstrap/status")
    public ResponseEntity<BootstrapStatusResponseDTO> bootstrapStatus() {
        return ResponseEntity.ok(onboardingService.bootstrapStatus());
    }

    @PostMapping("/bootstrap")
    public ResponseEntity<Map<String, String>> requestBootstrap(
            @Valid @RequestBody SolicitarBootstrapRequestDTO request
    ) {
        onboardingService.requestBootstrap(request.getEmail());
        return ResponseEntity.accepted().body(Map.of(
                "mensagem",
                "Se o e-mail estiver autorizado, enviaremos as instruções de ativação."
        ));
    }

    @GetMapping("/ativacao")
    public ResponseEntity<AtivacaoPreviewResponseDTO> preview(
            @RequestParam @NotBlank @Size(max = 200) String token
    ) {
        return ResponseEntity.ok(onboardingService.preview(token));
    }

    @PostMapping("/ativacao")
    public ResponseEntity<AtivacaoConcluidaResponseDTO> complete(
            @Valid @RequestBody ConcluirAtivacaoRequestDTO request
    ) {
        return ResponseEntity.ok(onboardingService.complete(request));
    }
}
