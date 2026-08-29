package com.equipe.estoque;

import com.equipe.estoque.config.CorsProperties;
import com.equipe.estoque.config.SecurityProperties;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "app.cors.allowed-origins=https://estoque.example.test",
        "app.cors.allow-credentials=true",
        "app.security.refresh-cookie.secure=true"
})
@AutoConfigureMockMvc
@ActiveProfiles({"test", "prod"})
class ProductionSecurityConfigurationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private Environment environment;

    @Autowired
    private SecurityProperties securityProperties;

    @Autowired
    private CorsProperties corsProperties;

    @Test
    void profileProducaoDeveDesabilitarOpenApiESwaggerPorPadrao() throws Exception {
        assertEquals("false", environment.getProperty("springdoc.api-docs.enabled"));
        assertEquals("false", environment.getProperty("springdoc.swagger-ui.enabled"));
        mockMvc.perform(get("/v3/api-docs")).andExpect(status().isNotFound());
        mockMvc.perform(get("/swagger-ui.html")).andExpect(status().isNotFound());
        assertTrue(securityProperties.getRefreshCookie().isSecure());
        assertTrue(corsProperties.isAllowCredentials());
        assertEquals("https://estoque.example.test", corsProperties.getAllowedOrigins().get(0));
    }
}
