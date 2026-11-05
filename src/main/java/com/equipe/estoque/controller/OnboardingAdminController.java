package com.equipe.estoque.controller;

import com.equipe.estoque.dto.onboarding.ConviteOnboardingResponseDTO;
import com.equipe.estoque.dto.onboarding.CriarConviteRequestDTO;
import com.equipe.estoque.security.AuthenticatedAccount;
import com.equipe.estoque.service.OnboardingService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/organizacoes/{organizacaoId}/convites")
@RequiredArgsConstructor
@Validated
public class OnboardingAdminController {

    private final OnboardingService onboardingService;
    private final AuthenticatedAccount authenticatedAccount;

    @PostMapping
    @PreAuthorize("@organizationAuthorization.canAdmin(#organizacaoId, authentication)")
    public ResponseEntity<ConviteOnboardingResponseDTO> create(
            @PathVariable @Positive Long organizacaoId,
            @Valid @RequestBody CriarConviteRequestDTO request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(onboardingService.createInvitation(
                organizacaoId,
                authenticatedAccount.id(),
                request.getEmail(),
                request.getPerfil()
        ));
    }

    @GetMapping
    @PreAuthorize("@organizationAuthorization.canAdmin(#organizacaoId, authentication)")
    public ResponseEntity<List<ConviteOnboardingResponseDTO>> list(
            @PathVariable @Positive Long organizacaoId
    ) {
        return ResponseEntity.ok(onboardingService.listInvitations(
                organizacaoId,
                authenticatedAccount.id()
        ));
    }
}
