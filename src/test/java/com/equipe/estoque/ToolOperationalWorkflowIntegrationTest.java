package com.equipe.estoque;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ToolOperationalWorkflowIntegrationTest extends SecurityTestSupport {

    @Test
    void retiradaDeveAtualizarEstadoImediatamenteComAutoriaTimestampEDestino() throws Exception {
        Session admin = registerAndLogin("Admin Retirada", "admin-retirada-v7@example.com");
        Session operator = registerAndLogin("Jorge Retirada", "jorge-retirada-v7@example.com");
        long organizationId = createOrganization(admin, "Operação Retirada V7");
        activateMember(admin, operator, organizationId, "OPERADOR");
        long toolId = createTool(admin, organizationId, "V7-RET-001", "Ferro de solda");
        LocalDateTime before = LocalDateTime.now(ZoneOffset.UTC).minusSeconds(1);

        JsonNode movement = move(operator, organizationId, toolId, "retirada", Map.of(
                "usuarioId", admin.accountId(),
                "destino", "  Instalação das câmeras — Linha 3  ",
                "observacao", "Uso em campo"
        ), 201);

        LocalDateTime recordedAt = LocalDateTime.parse(movement.get("dataHora").asText());
        assertFalse(recordedAt.isBefore(before));
        assertTrue(recordedAt.isBefore(LocalDateTime.now(ZoneOffset.UTC).plusSeconds(1)));
        assertTrue(movement.get("usuarioId").asLong() == operator.accountId());
        assertTrue("Uso em campo".equals(movement.get("observacao").asText()));
        assertTrue("PENDENTE".equals(movement.get("statusRevisao").asText()));
        mockMvc.perform(get("/api/ferramentas/{id}", toolId)
                        .header(AUTHORIZATION, bearer(operator))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EMPRESTADA"))
                .andExpect(jsonPath("$.responsavelAtualId").value(operator.accountId()))
                .andExpect(jsonPath("$.responsavelDesde").isNotEmpty())
                .andExpect(jsonPath("$.destinoAtual").value("Instalação das câmeras — Linha 3"));
        move(operator, organizationId, toolId, "retirada", Map.of(), 400);
    }

    @Test
    void devolucaoDeveEncerrarResponsabilidadeEPreservarHistorico() throws Exception {
        Session admin = registerAndLogin("Admin Devolução", "admin-devolucao-v7@example.com");
        Session operator = registerAndLogin("Matheus Devolução", "matheus-devolucao-v7@example.com");
        long organizationId = createOrganization(admin, "Operação Devolução V7");
        activateMember(admin, operator, organizationId, "OPERADOR");
        long toolId = createTool(admin, organizationId, "V7-DEV-001", "Multímetro");
        move(operator, organizationId, toolId, "retirada", Map.of("destino", "Painel 4"), 201);

        JsonNode returned = move(operator, organizationId, toolId, "devolucao",
                Map.of("observacao", "Devolvida sem avarias"), 201);

        assertTrue(returned.get("responsavelUsuarioId").isNull());
        assertTrue(returned.get("responsavelAnteriorUsuarioId").asLong() == operator.accountId());
        assertTrue("Painel 4".equals(returned.get("destino").asText()));
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
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].tipoMovimentacao").value("DEVOLUCAO"))
                .andExpect(jsonPath("$[1].tipoMovimentacao").value("RETIRADA"));
        move(operator, organizationId, toolId, "devolucao", Map.of(), 400);
    }

    @Test
    void transferenciaDeveExigirResponsavelAtivoDoMesmoTenantERegistrarPassagem() throws Exception {
        Session admin = registerAndLogin("Admin Transferência", "admin-transferencia-v7@example.com");
        Session jorge = registerAndLogin("Jorge", "jorge-transferencia-v7@example.com");
        Session william = registerAndLogin("William", "william-transferencia-v7@example.com");
        Session consulta = registerAndLogin("Consulta", "consulta-transferencia-v7@example.com");
        Session removed = registerAndLogin("Removido", "removido-transferencia-v7@example.com");
        Session outsider = registerAndLogin("Outro Tenant", "outro-transferencia-v7@example.com");
        long organizationId = createOrganization(admin, "Transferência V7");
        long otherOrganizationId = createOrganization(outsider, "Outro Tenant V7");
        activateMember(admin, jorge, organizationId, "OPERADOR");
        activateMember(admin, william, organizationId, "OPERADOR");
        activateMember(admin, consulta, organizationId, "CONSULTA");
        long removedMemberId = activateMember(admin, removed, organizationId, "OPERADOR");
        mockMvc.perform(delete("/api/organizacoes/{organizationId}/membros/{memberId}",
                        organizationId, removedMemberId)
                        .header(AUTHORIZATION, bearer(admin)))
                .andExpect(status().isNoContent());
        long toolId = createTool(admin, organizationId, "V7-TRA-001", "Ferro de solda");
        move(jorge, organizationId, toolId, "retirada", Map.of("destino", "Bancada 1"), 201);

        move(jorge, organizationId, toolId, "transferencia",
                Map.of("novoResponsavelUsuarioId", outsider.accountId()), 403);
        move(jorge, organizationId, toolId, "transferencia",
                Map.of("novoResponsavelUsuarioId", consulta.accountId()), 403);
        move(jorge, organizationId, toolId, "transferencia",
                Map.of("novoResponsavelUsuarioId", removed.accountId()), 403);
        move(consulta, organizationId, toolId, "transferencia",
                Map.of("novoResponsavelUsuarioId", william.accountId()), 403);
        JsonNode transferred = move(jorge, organizationId, toolId, "transferencia", Map.of(
                "novoResponsavelUsuarioId", william.accountId(),
                "destino", "Linha 3",
                "observacao", "Entrega física registrada"
        ), 201);

        assertTrue(transferred.get("responsavelAnteriorUsuarioId").asLong() == jorge.accountId());
        assertTrue(transferred.get("responsavelUsuarioId").asLong() == william.accountId());
        mockMvc.perform(get("/api/ferramentas/{id}", toolId)
                        .header(AUTHORIZATION, bearer(william))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.responsavelAtualId").value(william.accountId()))
                .andExpect(jsonPath("$.destinoAtual").value("Linha 3"));
        mockMvc.perform(get("/api/ferramentas/{id}/historico", toolId)
                        .header(AUTHORIZATION, bearer(william))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].tipoMovimentacao").value("TRANSFERENCIA"))
                .andExpect(jsonPath("$[1].tipoMovimentacao").value("RETIRADA"));
        mockMvc.perform(get("/api/ferramentas/{id}/ultimo-responsavel", toolId)
                        .header(AUTHORIZATION, bearer(william))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipoMovimentacao").value("TRANSFERENCIA"))
                .andExpect(jsonPath("$.responsavelUsuarioId").value(william.accountId()));
        mockMvc.perform(get("/api/ferramentas/{id}", toolId)
                        .header(AUTHORIZATION, bearer(outsider))
                        .header(ORGANIZATION, otherOrganizationId))
                .andExpect(status().isNotFound());
    }

    @Test
    void confirmacaoAdministrativaNaoDeveReexecutarOperacaoNemCruzarTenant() throws Exception {
        Session admin = registerAndLogin("Admin Confirmação", "admin-confirmacao-v7@example.com");
        Session operator = registerAndLogin("Operador Confirmação", "operador-confirmacao-v7@example.com");
        Session reader = registerAndLogin("Consulta Confirmação", "consulta-confirmacao-v7@example.com");
        Session adminB = registerAndLogin("Admin B Confirmação", "admin-b-confirmacao-v7@example.com");
        long organizationId = createOrganization(admin, "Confirmação A V7");
        long organizationB = createOrganization(adminB, "Confirmação B V7");
        activateMember(admin, operator, organizationId, "OPERADOR");
        activateMember(admin, reader, organizationId, "CONSULTA");
        long toolId = createTool(admin, organizationId, "V7-CON-001", "Alicate");
        long movementId = move(operator, organizationId, toolId, "retirada", Map.of(), 201)
                .get("id").asLong();

        confirm(operator, organizationId, movementId, 403);
        confirm(reader, organizationId, movementId, 403);
        confirm(adminB, organizationB, movementId, 404);
        JsonNode confirmed = confirm(admin, organizationId, movementId, 200);
        JsonNode repeated = confirm(admin, organizationId, movementId, 200);

        assertTrue("CONFIRMADA".equals(confirmed.get("statusRevisao").asText()));
        assertTrue(confirmed.get("confirmadoPorUsuarioId").asLong() == admin.accountId());
        assertTrue(confirmed.get("confirmadoEm").asText().equals(repeated.get("confirmadoEm").asText()));
        mockMvc.perform(get("/api/ferramentas/{id}", toolId)
                        .header(AUTHORIZATION, bearer(admin))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EMPRESTADA"))
                .andExpect(jsonPath("$.responsavelAtualId").value(operator.accountId()));
    }

    @Test
    void resumoDeveUsarCursorDeterministicoContarPendenciasEIsolarAOrganizacao() throws Exception {
        Session admin = registerAndLogin("Admin Resumo", "admin-resumo-v7@example.com");
        Session operator = registerAndLogin("Operador Resumo", "operador-resumo-v7@example.com");
        Session otherAdmin = registerAndLogin("Admin Outro Resumo", "admin-outro-resumo-v7@example.com");
        long organizationId = createOrganization(admin, "Resumo A V7");
        long otherOrganizationId = createOrganization(otherAdmin, "Resumo B V7");
        activateMember(admin, operator, organizationId, "OPERADOR");
        long firstTool = createTool(admin, organizationId, "V7-RES-001", "Ferramenta 1");
        long secondTool = createTool(admin, organizationId, "V7-RES-002", "Ferramenta 2");
        long firstId = move(operator, organizationId, firstTool, "retirada", Map.of(), 201).get("id").asLong();
        long secondId = move(operator, organizationId, firstTool, "devolucao", Map.of(), 201).get("id").asLong();
        long thirdId = move(operator, organizationId, secondTool, "retirada", Map.of(), 201).get("id").asLong();

        JsonNode firstPage = summary(admin, organizationId, 0, 2, 200);
        JsonNode secondPage = summary(admin, organizationId, secondId, 2, 200);

        assertTrue(firstPage.get("movimentacoes").get(0).get("id").asLong() == firstId);
        assertTrue(firstPage.get("movimentacoes").get(1).get("id").asLong() == secondId);
        assertTrue(firstPage.get("proximoCursor").asLong() == secondId);
        assertTrue(firstPage.get("quantidadeNovas").asLong() == 3);
        assertTrue(firstPage.get("quantidadeRetornada").asInt() == 2);
        assertTrue(firstPage.get("temMais").asBoolean());
        assertTrue(firstPage.get("quantidadePendentes").asLong() == 3);
        assertTrue(firstPage.get("ferramentasEmUso").asLong() == 1);
        assertTrue(secondPage.get("movimentacoes").get(0).get("id").asLong() == thirdId);
        assertTrue(secondPage.get("quantidadeNovas").asLong() == 1);
        assertFalse(secondPage.get("temMais").asBoolean());
        summary(admin, otherOrganizationId, 0, 10, 403);
    }

    @Test
    void correcaoDeveSerCompensatoriaEManterTrilhaImutavel() throws Exception {
        Session admin = registerAndLogin("Admin Correção", "admin-correcao-v7@example.com");
        long organizationId = createOrganization(admin, "Correção V7");
        long toolId = createTool(admin, organizationId, "V7-COR-001", "Detector");
        move(admin, organizationId, toolId, "perda", Map.of("observacao", "Registro equivocado"), 201);

        move(admin, organizationId, toolId, "correcao", Map.of(
                "novoStatus", "DISPONIVEL",
                "observacao", "Ferramenta localizada"
        ), 201);

        mockMvc.perform(get("/api/ferramentas/{id}/historico", toolId)
                        .header(AUTHORIZATION, bearer(admin))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].tipoMovimentacao").value("CORRECAO"))
                .andExpect(jsonPath("$[0].observacao").value(
                        "Ferramenta localizada (status anterior: PERDIDA, novo: DISPONIVEL)"))
                .andExpect(jsonPath("$[1].tipoMovimentacao").value("PERDA"));
    }

    @Test
    void destinoDeveSerLimitadoERejeitarCaracteresDeControle() throws Exception {
        Session admin = registerAndLogin("Admin Destino", "admin-destino-v7@example.com");
        long organizationId = createOrganization(admin, "Destino V7");
        long firstTool = createTool(admin, organizationId, "V7-DES-001", "Ferramenta destino");
        long secondTool = createTool(admin, organizationId, "V7-DES-002", "Ferramenta controle");

        move(admin, organizationId, firstTool, "retirada", Map.of("destino", "x".repeat(161)), 400);
        move(admin, organizationId, secondTool, "retirada", Map.of("destino", "Linha 3\nInterna"), 400);

        mockMvc.perform(get("/api/ferramentas/{id}", firstTool)
                        .header(AUTHORIZATION, bearer(admin))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DISPONIVEL"));
    }

    @Test
    void testeDeCampoAutomacaoDeveManterOperacaoResumoEConfirmacoesCoerentes() throws Exception {
        Session cicero = registerAndLogin("Cícero", "cicero-campo-v7@example.com");
        Session jorge = registerAndLogin("Jorge", "jorge-campo-v7@example.com");
        Session william = registerAndLogin("William", "william-campo-v7@example.com");
        Session matheus = registerAndLogin("Matheus", "matheus-campo-v7@example.com");
        long organizationId = createOrganization(cicero, "AUTOMAÇÃO");
        activateMember(cicero, jorge, organizationId, "OPERADOR");
        activateMember(cicero, william, organizationId, "OPERADOR");
        activateMember(cicero, matheus, organizationId, "OPERADOR");
        long solderingIron = createTool(cicero, organizationId, "AUTO-FERRO", "Ferro de solda");
        long cameraOne = createTool(cicero, organizationId, "AUTO-CAM-01", "Câmera 1");
        long cameraTwo = createTool(cicero, organizationId, "AUTO-CAM-02", "Câmera 2");
        long multimeter = createTool(cicero, organizationId, "AUTO-MULT", "Multímetro");

        move(jorge, organizationId, solderingIron, "retirada", Map.of(), 201);
        move(william, organizationId, cameraOne, "retirada", Map.of("destino", "Linha 3"), 201);
        move(william, organizationId, cameraTwo, "retirada", Map.of("destino", "Linha 3"), 201);
        move(matheus, organizationId, multimeter, "retirada", Map.of(), 201);
        move(matheus, organizationId, multimeter, "devolucao", Map.of(), 201);

        JsonNode summary = summary(cicero, organizationId, 0, 100, 200);
        assertTrue(summary.get("quantidadeNovas").asInt() == 5);
        assertTrue(summary.get("quantidadePendentes").asLong() == 5);
        assertTrue(summary.get("ferramentasEmUso").asLong() == 3);
        List<Long> movementIds = new ArrayList<>();
        summary.get("movimentacoes").forEach(node -> movementIds.add(node.get("id").asLong()));
        for (Long movementId : movementIds) {
            confirm(cicero, organizationId, movementId, 200);
        }
        mockMvc.perform(get("/api/movimentacoes-ferramenta/pendentes")
                        .header(AUTHORIZATION, bearer(cicero))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get("/api/ferramentas/{id}", multimeter)
                        .header(AUTHORIZATION, bearer(cicero))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DISPONIVEL"));
    }

    private long activateMember(
            Session admin,
            Session member,
            long organizationId,
            String profile
    ) throws Exception {
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

    private JsonNode confirm(
            Session admin,
            long organizationId,
            long movementId,
            int expectedStatus
    ) throws Exception {
        String response = mockMvc.perform(post("/api/movimentacoes-ferramenta/{id}/confirmacao", movementId)
                        .header(AUTHORIZATION, bearer(admin))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().is(expectedStatus))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return response.isBlank() ? objectMapper.createObjectNode() : objectMapper.readTree(response);
    }

    private JsonNode summary(
            Session admin,
            long organizationId,
            long afterId,
            int limit,
            int expectedStatus
    ) throws Exception {
        String response = mockMvc.perform(get("/api/movimentacoes-ferramenta/resumo")
                        .header(AUTHORIZATION, bearer(admin))
                        .header(ORGANIZATION, organizationId)
                        .param("aposId", Long.toString(afterId))
                        .param("limite", Integer.toString(limit)))
                .andExpect(status().is(expectedStatus))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return response.isBlank() ? objectMapper.createObjectNode() : objectMapper.readTree(response);
    }
}
