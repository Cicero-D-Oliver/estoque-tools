package com.equipe.estoque;

import com.equipe.estoque.config.SecurityProperties;
import com.equipe.estoque.entity.Usuario;
import com.equipe.estoque.enums.PerfilUsuario;
import com.equipe.estoque.repository.UsuarioRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthenticationSecurityIntegrationTest extends SecurityTestSupport {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtEncoder jwtEncoder;

    @Autowired
    private JwtDecoder jwtDecoder;

    @Autowired
    private SecurityProperties securityProperties;

    @Test
    void cadastroDeveArmazenarSomenteHashSeguroENuncaRetornaLo() throws Exception {
        long accountId = register("Conta Segura", "conta-segura@example.com");

        Usuario account = usuarioRepository.findById(accountId).orElseThrow();
        assertNotNull(account.getSenhaHash());
        assertNotEquals(PASSWORD, account.getSenhaHash());
        assertTrue(account.getSenhaHash().startsWith("$2"));
        assertTrue(passwordEncoder.matches(PASSWORD, account.getSenhaHash()));
        assertNotNull(account.getSenhaAlteradaEm());
        assertNull(account.getUltimoLoginEm());
        assertTrue(account.getAtivo());
        assertTrue(account.getPerfil() == PerfilUsuario.CONSULTA);

        mockMvc.perform(get("/api/auth/me")
                        .header(AUTHORIZATION, "Bearer " + login(account.getEmail(), PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.senha").doesNotExist())
                .andExpect(jsonPath("$.senhaHash").doesNotExist())
                .andExpect(jsonPath("$.perfil").doesNotExist());
    }

    @Test
    void loginValidoDeveEmitirTokenCurtoEAtualizarUltimoLogin() throws Exception {
        long accountId = register("Login Válido", "login-valido@example.com");
        String token = login("login-valido@example.com", PASSWORD);

        var decoded = jwtDecoder.decode(token);
        assertTrue(decoded.getExpiresAt().isAfter(Instant.now()));
        assertTrue(decoded.getExpiresAt().isBefore(Instant.now().plusSeconds(3601)));
        assertTrue(decoded.getSubject().equals(Long.toString(accountId)));
        assertFalse(decoded.hasClaim("organizacoes"));
        assertFalse(decoded.hasClaim("perfis"));
        assertNotNull(usuarioRepository.findById(accountId).orElseThrow().getUltimoLoginEm());
    }

    @Test
    void senhaInvalidaDeveRetornarErroGenerico() throws Exception {
        register("Senha Inválida", "senha-invalida@example.com");
        assertInvalidCredentials("senha-invalida@example.com", "SenhaErrada!2026");
    }

    @Test
    void emailInexistenteNaoDevePermitirEnumeracao() throws Exception {
        JsonNode nonexistent = invalidCredentials("nao-existe@example.com", "SenhaErrada!2026");
        register("Conta Existente", "existente-auth@example.com");
        JsonNode wrongPassword = invalidCredentials("existente-auth@example.com", "SenhaErrada!2026");

        assertTrue(nonexistent.get("codigo").asText().equals(wrongPassword.get("codigo").asText()));
        assertTrue(nonexistent.get("mensagem").asText().equals(wrongPassword.get("mensagem").asText()));
    }

    @Test
    void usuarioInativoNaoDeveAutenticarNemReutilizarToken() throws Exception {
        Session session = registerAndLogin("Conta Inativa", "inativa-auth@example.com");
        Usuario account = usuarioRepository.findById(session.accountId()).orElseThrow();
        account.setAtivo(false);
        usuarioRepository.saveAndFlush(account);

        assertInvalidCredentials("inativa-auth@example.com", PASSWORD);
        mockMvc.perform(get("/api/auth/me").header(AUTHORIZATION, bearer(session)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.codigo").value("NAO_AUTENTICADO"));
    }

    @Test
    void tokenAusenteDeveRetornar401PadronizadoECorrelacionado() throws Exception {
        mockMvc.perform(get("/api/auth/me").header("X-Correlation-Id", "auth-sem-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("X-Correlation-Id", "auth-sem-token"))
                .andExpect(jsonPath("$.codigo").value("NAO_AUTENTICADO"))
                .andExpect(jsonPath("$.referencia").value("auth-sem-token"));
    }

    @Test
    void tokenAdulteradoDeveSerRejeitado() throws Exception {
        Session session = registerAndLogin("Token Adulterado", "token-adulterado@example.com");
        int index = session.token().length() - 8;
        char replacement = session.token().charAt(index) == 'A' ? 'B' : 'A';
        String tampered = session.token().substring(0, index)
                + replacement
                + session.token().substring(index + 1);

        mockMvc.perform(get("/api/auth/me").header(AUTHORIZATION, "Bearer " + tampered))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.codigo").value("NAO_AUTENTICADO"));
    }

    @Test
    void tokenExpiradoDeveSerRejeitado() throws Exception {
        long accountId = register("Token Expirado", "token-expirado@example.com");
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(securityProperties.getIssuer())
                .issuedAt(now.minusSeconds(7200))
                .expiresAt(now.minusSeconds(3600))
                .subject(Long.toString(accountId))
                .build();
        String expired = jwtEncoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).type("JWT").build(),
                claims
        )).getTokenValue();

        mockMvc.perform(get("/api/auth/me").header(AUTHORIZATION, "Bearer " + expired))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.codigo").value("NAO_AUTENTICADO"));
    }

    @Test
    void usuarioLegadoSemSenhaNaoDevePossuirCredencialUtilizavel() throws Exception {
        usuarioRepository.saveAndFlush(Usuario.builder()
                .nome("Usuário legado")
                .email("legado-sem-senha@example.com")
                .perfil(PerfilUsuario.OPERADOR)
                .ativo(true)
                .build());

        assertInvalidCredentials("legado-sem-senha@example.com", PASSWORD);
    }

    @Test
    void cadastroPublicoNaoDeveAceitarPerfilOuOrganizacao() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "nome", "Autoelevação",
                                "email", "autoelevacao@example.com",
                                "senha", PASSWORD,
                                "perfil", "ADMIN",
                                "organizacaoId", 1
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("REQUISICAO_MALFORMADA"));
    }

    @Test
    void cadastroDeveRejeitarSenhaUnicodeAcimaDoLimiteBcryptSemErroInterno() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "nome", "Senha Unicode",
                                "email", "senha-unicode@example.com",
                                "senha", "á".repeat(40)
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("REGRA_NEGOCIO"))
                .andExpect(jsonPath("$.exception").doesNotExist())
                .andExpect(jsonPath("$.stackTrace").doesNotExist());
    }

    @Test
    void loginDeveRejeitarSenhaUnicodeAcimaDoLimiteBcryptSemEnumerarConta() throws Exception {
        assertInvalidCredentials("qualquer-conta@example.com", "á".repeat(40));
    }

    private void assertInvalidCredentials(String email, String password) throws Exception {
        JsonNode response = invalidCredentials(email, password);
        assertTrue(response.get("codigo").asText().equals("CREDENCIAIS_INVALIDAS"));
        assertTrue(response.get("mensagem").asText().equals("E-mail ou senha inválidos."));
    }

    private JsonNode invalidCredentials(String email, String password) throws Exception {
        String response = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "senha", password))))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response);
    }
}
