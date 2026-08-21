package com.equipe.estoque.service;

import com.equipe.estoque.config.SecurityProperties;
import com.equipe.estoque.dto.auth.AccessTokenResponseDTO;
import com.equipe.estoque.entity.RefreshToken;
import com.equipe.estoque.entity.Usuario;
import com.equipe.estoque.enums.MotivoRevogacaoRefresh;
import com.equipe.estoque.exception.InvalidSessionException;
import com.equipe.estoque.exception.ResourceNotFoundException;
import com.equipe.estoque.repository.RefreshTokenRepository;
import com.equipe.estoque.repository.UsuarioRepository;
import com.equipe.estoque.security.JwtService;
import com.equipe.estoque.security.OpaqueTokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AuthSessionService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final UsuarioRepository usuarioRepository;
    private final OpaqueTokenService opaqueTokenService;
    private final JwtService jwtService;
    private final SecurityProperties securityProperties;

    @Transactional
    public AccessTokenResponseDTO issueSession(Usuario usuario) {
        LocalDateTime issuedAt = now();
        LocalDateTime refreshExpiresAt = issuedAt.plus(securityProperties.getRefreshTokenTtl());
        OpaqueTokenService.TokenMaterial token = opaqueTokenService.issue();
        refreshTokenRepository.save(RefreshToken.builder()
                .usuario(usuario)
                .familiaId(UUID.randomUUID().toString())
                .tokenHash(token.hash())
                .tokenVersion(usuario.getTokenVersion())
                .emitidoEm(issuedAt)
                .expiraEm(refreshExpiresAt)
                .build());
        return tokenResponse(usuario, token.raw(), refreshExpiresAt);
    }

    @Transactional(noRollbackFor = InvalidSessionException.class)
    public AccessTokenResponseDTO refresh(String rawToken) {
        RefreshToken current = refreshTokenRepository.findByTokenHashForUpdate(
                opaqueTokenService.hash(rawToken)
        ).orElseThrow(InvalidSessionException::new);
        LocalDateTime currentTime = now();

        if (isRotatedToken(current)) {
            revokeFamily(current.getFamiliaId(), currentTime, MotivoRevogacaoRefresh.REUTILIZACAO_DETECTADA);
            log.warn("Reutilização de refresh token detectada usuarioId={}",
                    current.getUsuario().getId());
            throw new InvalidSessionException();
        }
        if (current.getRevogadoEm() != null) {
            throw new InvalidSessionException();
        }
        if (!current.getExpiraEm().isAfter(currentTime)) {
            revoke(current, currentTime, MotivoRevogacaoRefresh.EXPIRADO);
            throw new InvalidSessionException();
        }

        Usuario usuario = current.getUsuario();
        if (!Boolean.TRUE.equals(usuario.getAtivo())
                || usuario.getSenhaHash() == null
                || !current.getTokenVersion().equals(usuario.getTokenVersion())) {
            revokeFamily(current.getFamiliaId(), currentTime, MotivoRevogacaoRefresh.CONTA_INATIVA);
            throw new InvalidSessionException();
        }

        OpaqueTokenService.TokenMaterial replacementMaterial = opaqueTokenService.issue();
        RefreshToken replacement = refreshTokenRepository.save(RefreshToken.builder()
                .usuario(usuario)
                .familiaId(current.getFamiliaId())
                .tokenHash(replacementMaterial.hash())
                .tokenVersion(usuario.getTokenVersion())
                .emitidoEm(currentTime)
                .expiraEm(current.getExpiraEm())
                .build());
        revoke(current, currentTime, MotivoRevogacaoRefresh.ROTACIONADO);
        current.setSubstituidoPor(replacement);
        refreshTokenRepository.save(current);
        return tokenResponse(usuario, replacementMaterial.raw(), replacement.getExpiraEm());
    }

    @Transactional
    public void logout(Long usuarioId, String rawToken) {
        refreshTokenRepository.findByTokenHashForUpdate(opaqueTokenService.hash(rawToken))
                .filter(token -> token.getUsuario().getId().equals(usuarioId))
                .filter(token -> token.getRevogadoEm() == null)
                .ifPresent(token -> revoke(token, now(), MotivoRevogacaoRefresh.LOGOUT));
    }

    @Transactional
    public void logoutAll(Long usuarioId) {
        Usuario usuario = usuarioRepository.findByIdForUpdate(usuarioId)
                .filter(account -> Boolean.TRUE.equals(account.getAtivo()))
                .orElseThrow(() -> new ResourceNotFoundException("Conta autenticada não encontrada"));
        invalidateAll(usuario, MotivoRevogacaoRefresh.LOGOUT_TODOS);
        log.info("Todas as sessões foram revogadas usuarioId={}", usuarioId);
    }

    @Transactional
    public void invalidateAll(Usuario usuario, MotivoRevogacaoRefresh reason) {
        usuario.setTokenVersion(usuario.getTokenVersion() + 1);
        usuarioRepository.save(usuario);
        refreshTokenRepository.revokeAllActiveByUsuarioId(usuario.getId(), now(), reason);
    }

    private AccessTokenResponseDTO tokenResponse(
            Usuario usuario,
            String rawRefreshToken,
            LocalDateTime refreshExpiresAt
    ) {
        JwtService.IssuedToken accessToken = jwtService.issue(usuario);
        return AccessTokenResponseDTO.builder()
                .tokenType("Bearer")
                .accessToken(accessToken.value())
                .expiresIn(accessToken.expiresInSeconds())
                .expiresAt(accessToken.expiresAt())
                .refreshToken(rawRefreshToken)
                .refreshExpiresAt(refreshExpiresAt.toInstant(ZoneOffset.UTC))
                .build();
    }

    private void revokeFamily(
            String familyId,
            LocalDateTime revokedAt,
            MotivoRevogacaoRefresh reason
    ) {
        List<RefreshToken> family = refreshTokenRepository.findByFamiliaIdForUpdate(familyId);
        family.stream()
                .filter(token -> token.getRevogadoEm() == null)
                .forEach(token -> revoke(token, revokedAt, reason));
    }

    private void revoke(RefreshToken token, LocalDateTime revokedAt, MotivoRevogacaoRefresh reason) {
        token.setRevogadoEm(revokedAt);
        token.setMotivoRevogacao(reason);
        refreshTokenRepository.save(token);
    }

    private boolean isRotatedToken(RefreshToken token) {
        return token.getSubstituidoPor() != null
                || token.getMotivoRevogacao() == MotivoRevogacaoRefresh.ROTACIONADO
                || token.getMotivoRevogacao() == MotivoRevogacaoRefresh.REUTILIZACAO_DETECTADA;
    }

    private LocalDateTime now() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }
}
