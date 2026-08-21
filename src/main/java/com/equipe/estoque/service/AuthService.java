package com.equipe.estoque.service;

import com.equipe.estoque.dto.auth.AccessTokenResponseDTO;
import com.equipe.estoque.dto.auth.AccountResponseDTO;
import com.equipe.estoque.dto.auth.AlteracaoSenhaRequestDTO;
import com.equipe.estoque.dto.auth.LoginRequestDTO;
import com.equipe.estoque.dto.auth.RegisterRequestDTO;
import com.equipe.estoque.entity.Usuario;
import com.equipe.estoque.enums.MotivoRevogacaoRefresh;
import com.equipe.estoque.enums.PerfilUsuario;
import com.equipe.estoque.exception.BusinessException;
import com.equipe.estoque.exception.InvalidCredentialsException;
import com.equipe.estoque.exception.ResourceNotFoundException;
import com.equipe.estoque.repository.UsuarioRepository;
import com.equipe.estoque.security.AuthenticatedAccount;
import com.equipe.estoque.security.PasswordPolicy;
import com.equipe.estoque.config.SecurityProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final AuthSessionService authSessionService;
    private final AuthenticatedAccount authenticatedAccount;
    private final PasswordPolicy passwordPolicy;
    private final SecurityProperties securityProperties;

    @Transactional
    public AccountResponseDTO register(RegisterRequestDTO request) {
        passwordPolicy.validate(request.getSenha());
        String email = normalizeEmail(request.getEmail());
        if (usuarioRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new BusinessException("Não foi possível criar a conta com os dados informados");
        }
        LocalDateTime now = now();
        Usuario usuario = usuarioRepository.save(Usuario.builder()
                .nome(request.getNome().trim())
                .email(email)
                .senhaHash(passwordEncoder.encode(request.getSenha()))
                .senhaAlteradaEm(now)
                .perfil(PerfilUsuario.CONSULTA)
                .ativo(true)
                .build());
        log.info("Conta criada id={}", usuario.getId());
        return toResponse(usuario);
    }

    @Transactional(noRollbackFor = InvalidCredentialsException.class)
    public AccessTokenResponseDTO login(LoginRequestDTO request) {
        String email = normalizeEmail(request.getEmail());
        Usuario usuario = usuarioRepository.findByEmailIgnoreCaseForUpdate(email).orElse(null);
        LocalDateTime currentTime = now();

        if (passwordPolicy.exceedsBcryptLimit(request.getSenha())) {
            recordFailedLogin(usuario, currentTime);
            throw new InvalidCredentialsException();
        }
        if (isKnownAccountWithoutAccess(usuario)) {
            mitigateInvalidAccountTiming(usuario, email, request.getSenha());
            throw new InvalidCredentialsException();
        }
        if (isTemporarilyLocked(usuario, currentTime)) {
            authenticateIgnoringResult(email, request.getSenha());
            throw new InvalidCredentialsException();
        }
        resetExpiredLock(usuario, currentTime);
        try {
            authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(email, request.getSenha())
            );
        } catch (AuthenticationException exception) {
            recordFailedLogin(usuario, currentTime);
            throw new InvalidCredentialsException();
        }
        if (usuario == null
                || !Boolean.TRUE.equals(usuario.getAtivo())
                || usuario.getSenhaHash() == null) {
            throw new InvalidCredentialsException();
        }
        clearLoginFailures(usuario);
        usuario.setUltimoLoginEm(currentTime);
        usuarioRepository.save(usuario);
        log.info("Login realizado usuarioId={}", usuario.getId());
        return authSessionService.issueSession(usuario);
    }

    public AccountResponseDTO me() {
        Usuario usuario = usuarioRepository.findById(authenticatedAccount.id())
                .filter(account -> Boolean.TRUE.equals(account.getAtivo()))
                .orElseThrow(() -> new ResourceNotFoundException("Conta autenticada não encontrada"));
        return toResponse(usuario);
    }

    @Transactional
    public void changePassword(AlteracaoSenhaRequestDTO request) {
        passwordPolicy.validate(request.getNovaSenha());
        Usuario usuario = usuarioRepository.findByIdForUpdate(authenticatedAccount.id())
                .filter(account -> Boolean.TRUE.equals(account.getAtivo()))
                .filter(account -> account.getSenhaHash() != null)
                .orElseThrow(() -> new ResourceNotFoundException("Conta autenticada não encontrada"));
        if (passwordPolicy.exceedsBcryptLimit(request.getSenhaAtual())
                || !passwordEncoder.matches(request.getSenhaAtual(), usuario.getSenhaHash())) {
            throw new BusinessException("Não foi possível alterar a senha com os dados informados");
        }
        if (passwordEncoder.matches(request.getNovaSenha(), usuario.getSenhaHash())) {
            throw new BusinessException("A nova senha deve ser diferente da senha atual");
        }

        usuario.setSenhaHash(passwordEncoder.encode(request.getNovaSenha()));
        usuario.setSenhaAlteradaEm(now());
        clearLoginFailures(usuario);
        authSessionService.invalidateAll(usuario, MotivoRevogacaoRefresh.TROCA_SENHA);
        log.info("Senha alterada e sessões revogadas usuarioId={}", usuario.getId());
    }

    private AccountResponseDTO toResponse(Usuario usuario) {
        return AccountResponseDTO.builder()
                .id(usuario.getId())
                .nome(usuario.getNome())
                .email(usuario.getEmail())
                .ativo(usuario.getAtivo())
                .senhaAlteradaEm(usuario.getSenhaAlteradaEm())
                .ultimoLoginEm(usuario.getUltimoLoginEm())
                .build();
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private boolean isTemporarilyLocked(Usuario usuario, LocalDateTime currentTime) {
        return usuario != null
                && usuario.getLoginBloqueadoAte() != null
                && usuario.getLoginBloqueadoAte().isAfter(currentTime);
    }

    private boolean isKnownAccountWithoutAccess(Usuario usuario) {
        return usuario != null
                && (!Boolean.TRUE.equals(usuario.getAtivo()) || usuario.getSenhaHash() == null);
    }

    private void mitigateInvalidAccountTiming(Usuario usuario, String email, String password) {
        if (usuario.getSenhaHash() != null) {
            passwordEncoder.matches(password, usuario.getSenhaHash());
            return;
        }
        authenticateIgnoringResult(email, password);
    }

    private void resetExpiredLock(Usuario usuario, LocalDateTime currentTime) {
        if (usuario != null
                && usuario.getLoginBloqueadoAte() != null
                && !usuario.getLoginBloqueadoAte().isAfter(currentTime)) {
            clearLoginFailures(usuario);
        }
    }

    private void recordFailedLogin(Usuario usuario, LocalDateTime currentTime) {
        if (usuario == null
                || !Boolean.TRUE.equals(usuario.getAtivo())
                || usuario.getSenhaHash() == null
                || isTemporarilyLocked(usuario, currentTime)) {
            return;
        }
        int attempts = usuario.getTentativasLoginFalhas() + 1;
        usuario.setTentativasLoginFalhas(attempts);
        usuario.setUltimaFalhaLoginEm(currentTime);
        if (attempts >= securityProperties.getMaxFailedLoginAttempts()) {
            usuario.setLoginBloqueadoAte(currentTime.plus(securityProperties.getLoginLockDuration()));
            log.warn("Conta temporariamente bloqueada por tentativas inválidas usuarioId={}", usuario.getId());
        }
        usuarioRepository.save(usuario);
    }

    private void clearLoginFailures(Usuario usuario) {
        usuario.setTentativasLoginFalhas(0);
        usuario.setLoginBloqueadoAte(null);
        usuario.setUltimaFalhaLoginEm(null);
    }

    private void authenticateIgnoringResult(String email, String password) {
        try {
            authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(email, password)
            );
        } catch (AuthenticationException exception) {
            log.debug("Validação de credencial concluída durante bloqueio temporário");
        }
    }

    private LocalDateTime now() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }
}
