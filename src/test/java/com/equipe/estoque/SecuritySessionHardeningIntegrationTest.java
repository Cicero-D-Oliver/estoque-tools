package com.equipe.estoque;

import com.equipe.estoque.entity.RefreshToken;
import com.equipe.estoque.entity.TokenRecuperacaoSenha;
import com.equipe.estoque.entity.Usuario;
import com.equipe.estoque.enums.MotivoRevogacaoRefresh;
import com.equipe.estoque.exception.InvalidPasswordResetTokenException;
import com.equipe.estoque.repository.RefreshTokenRepository;
import com.equipe.estoque.repository.TokenRecuperacaoSenhaRepository;
import com.equipe.estoque.repository.UsuarioRepository;
import com.equipe.estoque.security.OpaqueTokenService;
import com.equipe.estoque.service.PasswordRecoveryService;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SecuritySessionHardeningIntegrationTest extends SecurityTestSupport {

    private static final String NEW_PASSWORD = "NovaSenhaSegura!2026";

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private TokenRecuperacaoSenhaRepository resetTokenRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private OpaqueTokenService opaqueTokenService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private PasswordRecoveryService passwordRecoveryService;

    @Test
    void loginDeveEmitirRefreshAleatorioEArmazenarSomenteHash() throws Exception {
        long accountId = register("Refresh Hash", "refresh-hash@example.com");
        TokenPair pair = loginTokens("refresh-hash@example.com", PASSWORD);

        List<RefreshToken> stored = refreshTokenRepository.findAllByUsuarioIdOrderById(accountId);
        assertEquals(1, stored.size());
        assertNotEquals(pair.refreshToken(), stored.get(0).getTokenHash());
        assertEquals(opaqueTokenService.hash(pair.refreshToken()), stored.get(0).getTokenHash());
        assertFalse(stored.get(0).getTokenHash().contains(pair.refreshToken()));
        assertNull(stored.get(0).getRevogadoEm());
    }

    @Test
    void refreshValidoDeveRotacionarTokenEEmitirNovoAccessToken() throws Exception {
        Session session = registerAndLogin("Rotação", "rotacao@example.com");
        JsonNode rotated = refresh(session.refreshToken(), 200);

        String replacement = rotated.get("refreshToken").asText();
        assertNotEquals(session.refreshToken(), replacement);
        assertNotEquals(session.token(), rotated.get("accessToken").asText());
        List<RefreshToken> stored = refreshTokenRepository.findAllByUsuarioIdOrderById(session.accountId());
        assertEquals(2, stored.size());
        assertEquals(MotivoRevogacaoRefresh.ROTACIONADO, stored.get(0).getMotivoRevogacao());
        assertNotNull(stored.get(0).getSubstituidoPor());
        assertNull(stored.get(1).getRevogadoEm());

        mockMvc.perform(get("/api/auth/me")
                        .header(AUTHORIZATION, "Bearer " + rotated.get("accessToken").asText()))
                .andExpect(status().isOk());
    }

    @Test
    void refreshExpiradoDeveSerRejeitadoERevogado() throws Exception {
        Session session = registerAndLogin("Expirado", "refresh-expirado@example.com");
        RefreshToken stored = onlyRefreshToken(session.accountId());
        stored.setEmitidoEm(LocalDateTime.now(ZoneOffset.UTC).minusDays(2));
        stored.setExpiraEm(LocalDateTime.now(ZoneOffset.UTC).minusMinutes(1));
        refreshTokenRepository.saveAndFlush(stored);

        refresh(session.refreshToken(), 401);

        assertEquals(MotivoRevogacaoRefresh.EXPIRADO, stored.getMotivoRevogacao());
        assertNotNull(stored.getRevogadoEm());
    }

    @Test
    void refreshRevogadoPorLogoutNaoDeveFuncionar() throws Exception {
        Session session = registerAndLogin("Logout Refresh", "logout-refresh@example.com");
        logout(session, session.refreshToken());

        refresh(session.refreshToken(), 401);
        assertEquals(MotivoRevogacaoRefresh.LOGOUT, onlyRefreshToken(session.accountId()).getMotivoRevogacao());
    }

    @Test
    void reutilizacaoDeTokenRotacionadoDeveRevogarTodaAFamilia() throws Exception {
        Session session = registerAndLogin("Reuse", "reuse@example.com");
        JsonNode rotated = refresh(session.refreshToken(), 200);
        String replacement = rotated.get("refreshToken").asText();

        refresh(session.refreshToken(), 401);
        refresh(replacement, 401);

        List<RefreshToken> family = refreshTokenRepository.findAllByUsuarioIdOrderById(session.accountId());
        assertEquals(2, family.size());
        assertTrue(family.stream().allMatch(token -> token.getRevogadoEm() != null));
        assertEquals(MotivoRevogacaoRefresh.REUTILIZACAO_DETECTADA, family.get(1).getMotivoRevogacao());
    }

    @Test
    void logoutDeveSerIdempotenteESemRevelarToken() throws Exception {
        Session session = registerAndLogin("Logout", "logout@example.com");

        mockMvc.perform(post("/api/auth/logout")
                        .header(AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("refreshToken", session.refreshToken()))))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));
        logout(session, session.refreshToken());
    }

    @Test
    void logoutNaoDeveRevogarTokenPertencenteAOutraConta() throws Exception {
        Session first = registerAndLogin("Primeira", "logout-a@example.com");
        Session second = registerAndLogin("Segunda", "logout-b@example.com");

        logout(first, second.refreshToken());

        refresh(second.refreshToken(), 200);
    }

    @Test
    void logoutAllDeveRevogarRefreshesEInvalidarAccessTokensAnteriores() throws Exception {
        long accountId = register("Logout All", "logout-all@example.com");
        TokenPair first = loginTokens("logout-all@example.com", PASSWORD);
        TokenPair second = loginTokens("logout-all@example.com", PASSWORD);

        mockMvc.perform(post("/api/auth/logout-all")
                        .header(AUTHORIZATION, "Bearer " + first.accessToken()))
                .andExpect(status().isNoContent());

        refresh(first.refreshToken(), 401);
        refresh(second.refreshToken(), 401);
        mockMvc.perform(get("/api/auth/me").header(AUTHORIZATION, "Bearer " + second.accessToken()))
                .andExpect(status().isUnauthorized());
        assertEquals(1L, usuarioRepository.findById(accountId).orElseThrow().getTokenVersion());
    }

    @Test
    void trocaDeSenhaValidaDeveRevogarSessoesEAlterarSomenteOHash() throws Exception {
        Session session = registerAndLogin("Troca Senha", "troca-senha@example.com");
        String oldHash = usuarioRepository.findById(session.accountId()).orElseThrow().getSenhaHash();

        changePassword(session, PASSWORD, NEW_PASSWORD, 204);

        Usuario account = usuarioRepository.findById(session.accountId()).orElseThrow();
        assertNotEquals(oldHash, account.getSenhaHash());
        assertTrue(passwordEncoder.matches(NEW_PASSWORD, account.getSenhaHash()));
        assertFalse(account.getSenhaHash().contains(NEW_PASSWORD));
        refresh(session.refreshToken(), 401);
        mockMvc.perform(get("/api/auth/me").header(AUTHORIZATION, bearer(session)))
                .andExpect(status().isUnauthorized());
        invalidLogin("troca-senha@example.com", PASSWORD);
        login("troca-senha@example.com", NEW_PASSWORD);
    }

    @Test
    void trocaDeSenhaComSenhaAtualErradaNaoDeveRevogarSessao() throws Exception {
        Session session = registerAndLogin("Senha Atual", "senha-atual@example.com");

        changePassword(session, "SenhaAtualErrada!2026", NEW_PASSWORD, 400);

        refresh(session.refreshToken(), 200);
        assertTrue(passwordEncoder.matches(
                PASSWORD,
                usuarioRepository.findById(session.accountId()).orElseThrow().getSenhaHash()
        ));
    }

    @Test
    void trocaDeSenhaDeveAplicarPoliticaEDiferencaDaSenhaAtual() throws Exception {
        Session session = registerAndLogin("Política", "politica-senha@example.com");

        changePassword(session, PASSWORD, "curta", 400);
        changePassword(session, PASSWORD, PASSWORD, 400);
        assertTrue(passwordEncoder.matches(
                PASSWORD,
                usuarioRepository.findById(session.accountId()).orElseThrow().getSenhaHash()
        ));
    }

    @Test
    void tentativasRepetidasDevemBloquearContaTemporariamente() throws Exception {
        long accountId = register("Brute Force", "brute-force@example.com");

        for (int attempt = 0; attempt < 5; attempt++) {
            invalidLogin("brute-force@example.com", "SenhaErrada!2026");
        }

        Usuario account = usuarioRepository.findById(accountId).orElseThrow();
        assertEquals(5, account.getTentativasLoginFalhas());
        assertNotNull(account.getLoginBloqueadoAte());
        assertTrue(account.getLoginBloqueadoAte().isAfter(LocalDateTime.now(ZoneOffset.UTC)));
    }

    @Test
    void senhaCorretaDuranteBloqueioNaoDeveAutenticar() throws Exception {
        long accountId = register("Bloqueada", "bloqueada@example.com");
        Usuario account = usuarioRepository.findById(accountId).orElseThrow();
        account.setTentativasLoginFalhas(5);
        account.setLoginBloqueadoAte(LocalDateTime.now(ZoneOffset.UTC).plusMinutes(10));
        usuarioRepository.saveAndFlush(account);

        invalidLogin("bloqueada@example.com", PASSWORD);
    }

    @Test
    void contaDeveDesbloquearAposFimDaJanela() throws Exception {
        long accountId = register("Desbloqueada", "desbloqueada@example.com");
        Usuario account = usuarioRepository.findById(accountId).orElseThrow();
        account.setTentativasLoginFalhas(5);
        account.setLoginBloqueadoAte(LocalDateTime.now(ZoneOffset.UTC).minusSeconds(1));
        usuarioRepository.saveAndFlush(account);

        login("desbloqueada@example.com", PASSWORD);

        assertEquals(0, account.getTentativasLoginFalhas());
        assertNull(account.getLoginBloqueadoAte());
        assertNull(account.getUltimaFalhaLoginEm());
    }

    @Test
    void bloqueioNaoDevePermitirEnumeracaoNemCriarEstadoParaEmailInexistente() throws Exception {
        long accountId = register("Existente", "enumeracao-hardening@example.com");
        long usersBefore = usuarioRepository.count();

        JsonNode unknown = invalidLogin("inexistente-hardening@example.com", "SenhaErrada!2026");
        JsonNode existing = invalidLogin("enumeracao-hardening@example.com", "SenhaErrada!2026");

        assertEquals(unknown.get("codigo").asText(), existing.get("codigo").asText());
        assertEquals(unknown.get("mensagem").asText(), existing.get("mensagem").asText());
        assertEquals(usersBefore, usuarioRepository.count());
        assertEquals(1, usuarioRepository.findById(accountId).orElseThrow().getTentativasLoginFalhas());
    }

    @Test
    void contaInativaDevePerderAccessERefreshImediatamente() throws Exception {
        Session session = registerAndLogin("Inativa Refresh", "inativa-refresh@example.com");
        Usuario account = usuarioRepository.findById(session.accountId()).orElseThrow();
        account.setAtivo(false);
        usuarioRepository.saveAndFlush(account);

        refresh(session.refreshToken(), 401);
        mockMvc.perform(get("/api/auth/me").header(AUTHORIZATION, bearer(session)))
                .andExpect(status().isUnauthorized());
        invalidLogin("inativa-refresh@example.com", PASSWORD);
    }

    @Test
    void recuperacaoInternaDeveArmazenarSomenteHashESemEnumeracao() throws Exception {
        long accountId = register("Recuperação", "recuperacao@example.com");
        PasswordRecoveryService.IssuedPasswordResetToken issued = passwordRecoveryService
                .prepareForDelivery("recuperacao@example.com")
                .orElseThrow();
        long countBeforeUnknown = resetTokenRepository.count();

        assertTrue(passwordRecoveryService.prepareForDelivery("nao-existe@example.com").isEmpty());
        assertEquals(countBeforeUnknown, resetTokenRepository.count());
        TokenRecuperacaoSenha stored = resetTokenRepository.findAllByUsuarioIdOrderById(accountId).get(0);
        assertNotEquals(issued.rawToken(), stored.getTokenHash());
        assertEquals(opaqueTokenService.hash(issued.rawToken()), stored.getTokenHash());
        assertFalse(stored.getTokenHash().contains(issued.rawToken()));
    }

    @Test
    void tokenDeRecuperacaoExpiradoDeveFalharESerInvalidado() throws Exception {
        long accountId = register("Reset Expirado", "reset-expirado@example.com");
        PasswordRecoveryService.IssuedPasswordResetToken issued = passwordRecoveryService
                .prepareForDelivery("reset-expirado@example.com")
                .orElseThrow();
        TokenRecuperacaoSenha stored = resetTokenRepository.findAllByUsuarioIdOrderById(accountId).get(0);
        stored.setEmitidoEm(LocalDateTime.now(ZoneOffset.UTC).minusHours(1));
        stored.setExpiraEm(LocalDateTime.now(ZoneOffset.UTC).minusSeconds(1));
        resetTokenRepository.saveAndFlush(stored);

        assertThrows(
                InvalidPasswordResetTokenException.class,
                () -> passwordRecoveryService.resetPassword(issued.rawToken(), NEW_PASSWORD)
        );
        assertNotNull(stored.getRevogadoEm());
    }

    @Test
    void tokenDeRecuperacaoDeveSerUsoUnicoERevogarSessoes() throws Exception {
        Session session = registerAndLogin("Reset Único", "reset-unico@example.com");
        PasswordRecoveryService.IssuedPasswordResetToken issued = passwordRecoveryService
                .prepareForDelivery("reset-unico@example.com")
                .orElseThrow();

        passwordRecoveryService.resetPassword(issued.rawToken(), NEW_PASSWORD);

        assertThrows(
                InvalidPasswordResetTokenException.class,
                () -> passwordRecoveryService.resetPassword(issued.rawToken(), "TerceiraSenhaSegura!2026")
        );
        refresh(session.refreshToken(), 401);
        mockMvc.perform(get("/api/auth/me").header(AUTHORIZATION, bearer(session)))
                .andExpect(status().isUnauthorized());
        invalidLogin("reset-unico@example.com", PASSWORD);
        login("reset-unico@example.com", NEW_PASSWORD);
    }

    private RefreshToken onlyRefreshToken(long accountId) {
        List<RefreshToken> tokens = refreshTokenRepository.findAllByUsuarioIdOrderById(accountId);
        assertEquals(1, tokens.size());
        return tokens.get(0);
    }

    private JsonNode refresh(String refreshToken, int expectedStatus) throws Exception {
        String response = mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("refreshToken", refreshToken))))
                .andExpect(status().is(expectedStatus))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return response.isBlank() ? objectMapper.createObjectNode() : objectMapper.readTree(response);
    }

    private void logout(Session session, String refreshToken) throws Exception {
        mockMvc.perform(post("/api/auth/logout")
                        .header(AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("refreshToken", refreshToken))))
                .andExpect(status().isNoContent());
    }

    private void changePassword(
            Session session,
            String currentPassword,
            String newPassword,
            int expectedStatus
    ) throws Exception {
        mockMvc.perform(put("/api/auth/password")
                        .header(AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "senhaAtual", currentPassword,
                                "novaSenha", newPassword
                        ))))
                .andExpect(status().is(expectedStatus));
    }

    private JsonNode invalidLogin(String email, String password) throws Exception {
        String response = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "senha", password))))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return objectMapper.readTree(response);
    }
}
