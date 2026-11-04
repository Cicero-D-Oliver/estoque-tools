package com.equipe.estoque;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = "app.registration.public-registration-enabled=false")
@Transactional
class PublicRegistrationDisabledIntegrationTest extends SecurityTestSupport {

    @Test
    void cadastroPublicoDeveEstarFechadoPorPadraoDeProduto() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "nome", "Cadastro Público",
                                "email", "publico@example.test",
                                "senha", PASSWORD
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("Cadastro público indisponível. Use um convite."));
    }
}
