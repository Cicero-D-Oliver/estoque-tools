package com.equipe.estoque.service;

import com.equipe.estoque.config.SecurityProperties;
import com.equipe.estoque.entity.TokenRecuperacaoSenha;
import com.equipe.estoque.entity.Usuario;
import com.equipe.estoque.enums.MotivoRevogacaoRefresh;
import com.equipe.estoque.exception.BusinessException;
import com.equipe.estoque.exception.InvalidPasswordResetTokenException;
import com.equipe.estoque.repository.TokenRecuperacaoSenhaRepository;
import com.equipe.estoque.repository.UsuarioRepository;
import com.equipe.estoque.security.OpaqueTokenService;
import com.equipe.estoque.security.PasswordPolicy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class PasswordRecoveryService {

    private final TokenRecuperacaoSenhaRepository tokenRepository;
    private final UsuarioRepository usuarioRepository;
    private final OpaqueTokenService opaqueTokenService;
    private final PasswordPolicy passwordPolicy;
    private final PasswordEncoder passwordEncoder;
    private final AuthSessionService authSessionService;
    private final SecurityProperties securityProperties;

    /**
     * Prepara um token exclusivamente para um futuro adaptador confiável de entrega.
     * Não deve ser chamado diretamente por um controller nem serializado em resposta HTTP.
     */
    @Transactional
    public Optional<IssuedPasswordResetToken> prepareForDelivery(String email) {
        OpaqueTokenService.TokenMaterial material = opaqueTokenService.issue();
        String normalizedEmail = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        Optional<Usuario> account = usuarioRepository.findByEmailIgnoreCaseForUpdate(normalizedEmail)
                .filter(usuario -> Boolean.TRUE.equals(usuario.getAtivo()))
                .filter(usuario -> usuario.getSenhaHash() != null);
        if (account.isEmpty()) {
            return Optional.empty();
        }

        LocalDateTime issuedAt = now();
        LocalDateTime expiresAt = issuedAt.plus(securityProperties.getPasswordResetTokenTtl());
        Usuario usuario = account.orElseThrow();
        tokenRepository.revokeAllActiveByUsuarioId(usuario.getId(), issuedAt);
        tokenRepository.save(TokenRecuperacaoSenha.builder()
                .usuario(usuario)
                .tokenHash(material.hash())
                .emitidoEm(issuedAt)
                .expiraEm(expiresAt)
                .build());
        log.info("Token de recuperação preparado para entrega segura usuarioId={}", usuario.getId());
        return Optional.of(new IssuedPasswordResetToken(
                material.raw(),
                expiresAt.toInstant(ZoneOffset.UTC),
                usuario.getId()
        ));
    }

    @Transactional(noRollbackFor = InvalidPasswordResetTokenException.class)
    public void resetPassword(String rawToken, String newPassword) {
        passwordPolicy.validate(newPassword);
        TokenRecuperacaoSenha token = tokenRepository.findByTokenHashForUpdate(
                opaqueTokenService.hash(rawToken)
        ).orElseThrow(InvalidPasswordResetTokenException::new);
        LocalDateTime currentTime = now();
        if (token.getUsadoEm() != null || token.getRevogadoEm() != null) {
            throw new InvalidPasswordResetTokenException();
        }
        if (!token.getExpiraEm().isAfter(currentTime)) {
            token.setRevogadoEm(currentTime);
            tokenRepository.save(token);
            throw new InvalidPasswordResetTokenException();
        }

        Usuario usuario = usuarioRepository.findByIdForUpdate(token.getUsuario().getId())
                .filter(account -> Boolean.TRUE.equals(account.getAtivo()))
                .filter(account -> account.getSenhaHash() != null)
                .orElseThrow(InvalidPasswordResetTokenException::new);
        if (passwordEncoder.matches(newPassword, usuario.getSenhaHash())) {
            throw new BusinessException("A nova senha deve ser diferente da senha atual");
        }

        token.setUsadoEm(currentTime);
        tokenRepository.save(token);
        tokenRepository.revokeAllActiveByUsuarioId(usuario.getId(), currentTime);
        usuario.setSenhaHash(passwordEncoder.encode(newPassword));
        usuario.setSenhaAlteradaEm(currentTime);
        usuario.setTentativasLoginFalhas(0);
        usuario.setLoginBloqueadoAte(null);
        usuario.setUltimaFalhaLoginEm(null);
        authSessionService.invalidateAll(usuario, MotivoRevogacaoRefresh.RECUPERACAO_SENHA);
        log.info("Senha redefinida e sessões revogadas usuarioId={}", usuario.getId());
    }

    private LocalDateTime now() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }

    public record IssuedPasswordResetToken(String rawToken, Instant expiresAt, Long usuarioId) {
    }
}
