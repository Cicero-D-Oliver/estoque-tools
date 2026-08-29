package com.equipe.estoque;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class MobileAuthenticationIntegrationTest extends SecurityTestSupport {

    @Test
    void loginMobileDeveEntregarSessaoRotativaSemCookieDoNavegador() throws Exception {
        register("Conta Mobile", "mobile-login@example.com");

        MvcResult result = mobileLogin("mobile-login@example.com", PASSWORD);

        JsonNode body = body(result);
        assertNotNull(body.get("accessToken").asText());
        assertNotNull(body.get("refreshToken").asText());
        mockMvc.perform(post("/api/mobile/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "email", "mobile-login@example.com",
                                "senha", PASSWORD
                        ))))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").isNumber())
                .andExpect(jsonPath("$.refreshExpiresAt").isString());
    }

    @Test
    void refreshMobileDeveRotacionarAccessERefreshToken() throws Exception {
        register("Rotação Mobile", "mobile-refresh@example.com");
        JsonNode initial = body(mobileLogin("mobile-refresh@example.com", PASSWORD));

        JsonNode rotated = body(mobileRefresh(initial.get("refreshToken").asText(), 200));

        assertNotEquals(initial.get("accessToken").asText(), rotated.get("accessToken").asText());
        assertNotEquals(initial.get("refreshToken").asText(), rotated.get("refreshToken").asText());
        mockMvc.perform(get("/api/auth/me")
                        .header(AUTHORIZATION, "Bearer " + rotated.get("accessToken").asText()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("mobile-refresh@example.com"));
    }

    @Test
    void reutilizacaoDoRefreshMobileDeveRevogarFamilia() throws Exception {
        register("Reuso Mobile", "mobile-reuse@example.com");
        JsonNode initial = body(mobileLogin("mobile-reuse@example.com", PASSWORD));
        JsonNode rotated = body(mobileRefresh(initial.get("refreshToken").asText(), 200));

        mobileRefresh(initial.get("refreshToken").asText(), 401);
        mobileRefresh(rotated.get("refreshToken").asText(), 401);
    }

    @Test
    void logoutMobileDeveRevogarSessaoAtual() throws Exception {
        register("Logout Mobile", "mobile-logout@example.com");
        JsonNode session = body(mobileLogin("mobile-logout@example.com", PASSWORD));

        mockMvc.perform(post("/api/mobile/auth/logout")
                        .header(AUTHORIZATION, "Bearer " + session.get("accessToken").asText())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("refreshToken", session.get("refreshToken").asText()))))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));

        mobileRefresh(session.get("refreshToken").asText(), 401);
    }

    @Test
    void logoutMobileDeveExigirAccessTokenValido() throws Exception {
        mockMvc.perform(post("/api/mobile/auth/logout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("refreshToken", "token-nao-autorizado"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.codigo").value("NAO_AUTENTICADO"));
    }

    @Test
    void credenciaisInvalidasNoMobileDevemManterRespostaSanitizada() throws Exception {
        register("Inválida Mobile", "mobile-invalid@example.com");

        mockMvc.perform(post("/api/mobile/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "email", "mobile-invalid@example.com",
                                "senha", "SenhaIncorreta!2026"
                        ))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.codigo").value("CREDENCIAIS_INVALIDAS"))
                .andExpect(jsonPath("$.mensagem").value("E-mail ou senha inválidos."))
                .andExpect(jsonPath("$.stackTrace").doesNotExist());
    }

    private MvcResult mobileLogin(String email, String password) throws Exception {
        return mockMvc.perform(post("/api/mobile/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "senha", password))))
                .andExpect(status().isOk())
                .andReturn();
    }

    private MvcResult mobileRefresh(String refreshToken, int expectedStatus) throws Exception {
        return mockMvc.perform(post("/api/mobile/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("refreshToken", refreshToken))))
                .andExpect(status().is(expectedStatus))
                .andReturn();
    }

    private JsonNode body(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
    }
}
