package com.equipe.estoque;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

abstract class SecurityTestSupport {

    protected static final String AUTHORIZATION = "Authorization";
    protected static final String ORGANIZATION = "X-Organization-Id";
    protected static final String PASSWORD = "SenhaSegura!2026";

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    protected Session registerAndLogin(String name, String email) throws Exception {
        long accountId = register(name, email);
        return new Session(accountId, login(email, PASSWORD));
    }

    protected long register(String name, String email) throws Exception {
        String response = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "nome", name,
                                "email", email,
                                "senha", PASSWORD
                        ))))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
        return objectMapper.readTree(response).get("id").asLong();
    }

    protected String login(String email, String password) throws Exception {
        String response = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "senha", password))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
        return objectMapper.readTree(response).get("accessToken").asText();
    }

    protected long createOrganization(Session session, String name) throws Exception {
        String response = mockMvc.perform(post("/api/organizacoes")
                        .header(AUTHORIZATION, bearer(session))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("nome", name))))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
        return id(response);
    }

    protected long requestMembership(Session session, long organizationId) throws Exception {
        String response = mockMvc.perform(post("/api/organizacoes/{id}/solicitacoes", organizationId)
                        .header(AUTHORIZATION, bearer(session)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
        return id(response);
    }

    protected String bearer(Session session) {
        return "Bearer " + session.token();
    }

    protected String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }

    protected long id(String response) throws Exception {
        JsonNode json = objectMapper.readTree(response);
        return json.get("id").asLong();
    }

    protected record Session(long accountId, String token) {
    }
}
