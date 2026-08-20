package com.equipe.estoque.service;

import com.equipe.estoque.dto.auth.AccessTokenResponseDTO;
import com.equipe.estoque.dto.auth.AccountResponseDTO;
import com.equipe.estoque.dto.auth.LoginRequestDTO;
import com.equipe.estoque.dto.auth.RegisterRequestDTO;
import com.equipe.estoque.entity.Usuario;
import com.equipe.estoque.enums.PerfilUsuario;
import com.equipe.estoque.exception.BusinessException;
import com.equipe.estoque.exception.InvalidCredentialsException;
import com.equipe.estoque.exception.ResourceNotFoundException;
import com.equipe.estoque.repository.UsuarioRepository;
import com.equipe.estoque.security.AuthenticatedAccount;
import com.equipe.estoque.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AuthService {

    private static final int BCRYPT_MAX_PASSWORD_BYTES = 72;

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final AuthenticatedAccount authenticatedAccount;

    @Transactional
    public AccountResponseDTO register(RegisterRequestDTO request) {
        if (exceedsBcryptLimit(request.getSenha())) {
            throw new BusinessException("A senha excede o limite seguro permitido");
        }
        String email = normalizeEmail(request.getEmail());
        if (usuarioRepository.existsByEmail(email)) {
            throw new BusinessException("Não foi possível criar a conta com os dados informados");
        }
        LocalDateTime now = LocalDateTime.now();
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

    @Transactional
    public AccessTokenResponseDTO login(LoginRequestDTO request) {
        if (exceedsBcryptLimit(request.getSenha())) {
            throw new InvalidCredentialsException();
        }
        String email = normalizeEmail(request.getEmail());
        try {
            authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(email, request.getSenha())
            );
        } catch (AuthenticationException exception) {
            throw new InvalidCredentialsException();
        }
        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(email)
                .filter(account -> Boolean.TRUE.equals(account.getAtivo()))
                .filter(account -> account.getSenhaHash() != null)
                .orElseThrow(InvalidCredentialsException::new);
        usuario.setUltimoLoginEm(LocalDateTime.now());
        usuarioRepository.save(usuario);
        JwtService.IssuedToken token = jwtService.issue(usuario);
        log.info("Login realizado usuarioId={}", usuario.getId());
        return AccessTokenResponseDTO.builder()
                .tokenType("Bearer")
                .accessToken(token.value())
                .expiresIn(token.expiresInSeconds())
                .expiresAt(token.expiresAt())
                .build();
    }

    public AccountResponseDTO me() {
        Usuario usuario = usuarioRepository.findById(authenticatedAccount.id())
                .filter(account -> Boolean.TRUE.equals(account.getAtivo()))
                .orElseThrow(() -> new ResourceNotFoundException("Conta autenticada não encontrada"));
        return toResponse(usuario);
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

    private boolean exceedsBcryptLimit(String password) {
        return password.getBytes(StandardCharsets.UTF_8).length > BCRYPT_MAX_PASSWORD_BYTES;
    }
}
