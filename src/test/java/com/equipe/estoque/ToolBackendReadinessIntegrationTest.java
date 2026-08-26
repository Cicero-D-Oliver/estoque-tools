package com.equipe.estoque;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ToolBackendReadinessIntegrationTest extends SecurityTestSupport {

    @Test
    void operadorDeveConcluirManutencaoPreservarHistoricoELimparContextoComUtc() throws Exception {
        Session admin = registerAndLogin("Admin ciclo", "admin-ciclo-v8@example.com");
        Session operator = registerAndLogin("Operador ciclo", "operador-ciclo-v8@example.com");
        long organizationId = createOrganization(admin, "Ciclo operacional V8");
        activateMember(admin, operator, organizationId, "OPERADOR");
        long toolId = createTool(admin, organizationId, "V8-CICLO-001", "Parafusadeira");

        move(operator, organizationId, toolId, "retirada", Map.of("destino", "Linha 8"), 201);
        JsonNode borrowedTool = getTool(operator, organizationId, toolId);
        assertExplicitUtc(borrowedTool.get("responsavelDesde").asText());
        JsonNode maintenance = move(operator, organizationId, toolId, "manutencao",
                Map.of("observacao", "Revisão do mandril"), 201);

        JsonNode completion = move(operator, organizationId, toolId, "conclusao-manutencao",
                Map.of("observacao", "Reparo concluído"), 201);

        assertEquals("CONCLUSAO_MANUTENCAO", completion.get("tipoMovimentacao").asText());
        assertEquals(operator.accountId(), completion.get("usuarioId").asLong());
        assertEquals("PENDENTE", completion.get("statusRevisao").asText());
        assertExplicitUtc(completion.get("dataHora").asText());
        assertEquals("MANUTENCAO", maintenance.get("tipoMovimentacao").asText());

        mockMvc.perform(get("/api/ferramentas/{id}", toolId)
                        .header(AUTHORIZATION, bearer(operator))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DISPONIVEL"))
                .andExpect(jsonPath("$.responsavelAtualId").doesNotExist())
                .andExpect(jsonPath("$.responsavelDesde").doesNotExist())
                .andExpect(jsonPath("$.destinoAtual").doesNotExist());
        mockMvc.perform(get("/api/ferramentas/{id}/historico", toolId)
                        .header(AUTHORIZATION, bearer(operator))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].tipoMovimentacao").value("CONCLUSAO_MANUTENCAO"))
                .andExpect(jsonPath("$[1].tipoMovimentacao").value("MANUTENCAO"))
                .andExpect(jsonPath("$[1].observacao").value("Revisão do mandril"))
                .andExpect(jsonPath("$[2].tipoMovimentacao").value("RETIRADA"));
    }

    @Test
    void adminDeveConcluirEConfirmarSemReexecutarOperacaoComUtc() throws Exception {
        Session admin = registerAndLogin("Admin confirmação", "admin-confirmacao-v8@example.com");
        long organizationId = createOrganization(admin, "Confirmação V8");
        long toolId = createTool(admin, organizationId, "V8-ADMIN-001", "Alicate amperímetro");
        move(admin, organizationId, toolId, "manutencao", Map.of(), 201);
        long movementId = move(admin, organizationId, toolId, "conclusao-manutencao", Map.of(), 201)
                .get("id").asLong();

        String response = mockMvc.perform(post("/api/movimentacoes-ferramenta/{id}/confirmacao", movementId)
                        .header(AUTHORIZATION, bearer(admin))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statusRevisao").value("CONFIRMADA"))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertExplicitUtc(objectMapper.readTree(response).get("confirmadoEm").asText());
        assertEquals("DISPONIVEL", getTool(admin, organizationId, toolId).get("status").asText());
    }

    @Test
    void deveNegarConclusaoParaConsultaOutroTenantEstadosInvalidosEInativa() throws Exception {
        Session admin = registerAndLogin("Admin regras", "admin-regras-v8@example.com");
        Session operator = registerAndLogin("Operador regras", "operador-regras-v8@example.com");
        Session reader = registerAndLogin("Consulta regras", "consulta-regras-v8@example.com");
        Session otherAdmin = registerAndLogin("Admin externo", "admin-externo-v8@example.com");
        long organizationId = createOrganization(admin, "Regras V8");
        long otherOrganizationId = createOrganization(otherAdmin, "Outro tenant V8");
        activateMember(admin, operator, organizationId, "OPERADOR");
        activateMember(admin, reader, organizationId, "CONSULTA");

        long available = createTool(admin, organizationId, "V8-DISP", "Disponível");
        move(operator, organizationId, available, "conclusao-manutencao", Map.of(), 400);

        long lost = createTool(admin, organizationId, "V8-PERD", "Perdida");
        move(operator, organizationId, lost, "perda", Map.of(), 201);
        move(operator, organizationId, lost, "conclusao-manutencao", Map.of(), 400);

        long maintenance = createTool(admin, organizationId, "V8-MAN", "Manutenção");
        move(operator, organizationId, maintenance, "manutencao", Map.of(), 201);
        move(reader, organizationId, maintenance, "conclusao-manutencao", Map.of(), 403);
        move(otherAdmin, otherOrganizationId, maintenance, "conclusao-manutencao", Map.of(), 404);
        assertEquals("MANUTENCAO", getTool(admin, organizationId, maintenance).get("status").asText());

        long inactive = createTool(admin, organizationId, "V8-INAT", "Inativa");
        move(operator, organizationId, inactive, "manutencao", Map.of(), 201);
        mockMvc.perform(delete("/api/ferramentas/{id}", inactive)
                        .header(AUTHORIZATION, bearer(admin))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isNoContent());
        move(operator, organizationId, inactive, "conclusao-manutencao", Map.of(), 400);
    }

    @Test
    void adminDeveListarSomenteResponsaveisAptosDoTenantComDtoMinimoOrdenado() throws Exception {
        Session admin = registerAndLogin("Zelda Admin", "zelda-admin-v8@example.com");
        Session ana = registerAndLogin("Ana Operadora", "ana-operadora-v8@example.com");
        Session bruno = registerAndLogin("Bruno Operador", "bruno-operador-v8@example.com");
        Session reader = registerAndLogin("Carlos Consulta", "carlos-consulta-v8@example.com");
        Session removed = registerAndLogin("Daniel Removido", "daniel-removido-v8@example.com");
        Session outsider = registerAndLogin("Externo", "externo-responsavel-v8@example.com");
        long organizationId = createOrganization(admin, "Responsáveis V8");
        createOrganization(outsider, "Responsáveis externos V8");
        activateMember(admin, ana, organizationId, "OPERADOR");
        activateMember(admin, bruno, organizationId, "OPERADOR");
        activateMember(admin, reader, organizationId, "CONSULTA");
        long removedMemberId = activateMember(admin, removed, organizationId, "OPERADOR");
        mockMvc.perform(delete("/api/organizacoes/{organizationId}/membros/{memberId}",
                        organizationId, removedMemberId)
                        .header(AUTHORIZATION, bearer(admin)))
                .andExpect(status().isNoContent());

        String response = mockMvc.perform(get("/api/ferramentas/responsaveis-transferencia")
                        .header(AUTHORIZATION, bearer(admin))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        JsonNode body = objectMapper.readTree(response);

        assertEquals(3, body.size());
        assertEquals("Ana Operadora", body.get(0).get("nome").asText());
        assertEquals("Bruno Operador", body.get(1).get("nome").asText());
        assertEquals("Zelda Admin", body.get(2).get("nome").asText());
        body.forEach(member -> assertEquals(Set.of("id", "nome"), fieldNames(member)));
        assertFalse(response.contains("Carlos Consulta"));
        assertFalse(response.contains("Daniel Removido"));
        assertFalse(response.contains("Externo"));
        assertFalse(response.contains("email"));
    }

    @Test
    void operadorDeveListarResponsaveisMasConsultaEOutroTenantNao() throws Exception {
        Session admin = registerAndLogin("Admin lista", "admin-lista-v8@example.com");
        Session operator = registerAndLogin("Operador lista", "operador-lista-v8@example.com");
        Session reader = registerAndLogin("Consulta lista", "consulta-lista-v8@example.com");
        Session outsider = registerAndLogin("Externo lista", "externo-lista-v8@example.com");
        long organizationId = createOrganization(admin, "Lista V8");
        createOrganization(outsider, "Lista externa V8");
        activateMember(admin, operator, organizationId, "OPERADOR");
        activateMember(admin, reader, organizationId, "CONSULTA");

        mockMvc.perform(get("/api/ferramentas/responsaveis-transferencia")
                        .header(AUTHORIZATION, bearer(operator))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/ferramentas/responsaveis-transferencia")
                        .header(AUTHORIZATION, bearer(reader))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/ferramentas/responsaveis-transferencia")
                        .header(AUTHORIZATION, bearer(outsider))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isForbidden());
    }

    private long activateMember(Session admin, Session member, long organizationId, String profile)
            throws Exception {
        long memberId = requestMembership(member, organizationId);
        mockMvc.perform(put("/api/organizacoes/{organizationId}/solicitacoes/{memberId}/aprovacao",
                        organizationId, memberId)
                        .header(AUTHORIZATION, bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("perfil", profile))))
                .andExpect(status().isOk());
        return memberId;
    }

    private long createTool(Session admin, long organizationId, String asset, String name) throws Exception {
        String response = mockMvc.perform(post("/api/ferramentas")
                        .header(AUTHORIZATION, bearer(admin))
                        .header(ORGANIZATION, organizationId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("patrimonio", asset, "nome", name))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return id(response);
    }

    private JsonNode move(
            Session executor,
            long organizationId,
            long toolId,
            String operation,
            Map<String, ?> body,
            int expectedStatus
    ) throws Exception {
        String response = mockMvc.perform(post("/api/ferramentas/{id}/{operation}", toolId, operation)
                        .header(AUTHORIZATION, bearer(executor))
                        .header(ORGANIZATION, organizationId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(body)))
                .andExpect(status().is(expectedStatus))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return response.isBlank() ? objectMapper.createObjectNode() : objectMapper.readTree(response);
    }

    private JsonNode getTool(Session session, long organizationId, long toolId) throws Exception {
        String response = mockMvc.perform(get("/api/ferramentas/{id}", toolId)
                        .header(AUTHORIZATION, bearer(session))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return objectMapper.readTree(response);
    }

    private Set<String> fieldNames(JsonNode node) {
        Set<String> fields = new HashSet<>();
        node.fieldNames().forEachRemaining(fields::add);
        return Set.copyOf(fields);
    }

    private void assertExplicitUtc(String value) {
        OffsetDateTime parsed = OffsetDateTime.parse(value);
        assertEquals(ZoneOffset.UTC, parsed.getOffset());
        assertTrue(value.endsWith("Z") || value.endsWith("+00:00"));
    }
}
