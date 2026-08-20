package com.equipe.estoque;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

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
class ApplicationFlowIntegrationTest extends SecurityTestSupport {

    @Test
    void deveExecutarFluxoDeContaEConsultaAdministrativa() throws Exception {
        Session session = registerAndLogin("Administrador Inicial", "admin-flow@example.com");

        mockMvc.perform(get("/api/auth/me").header(AUTHORIZATION, bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(session.accountId()))
                .andExpect(jsonPath("$.email").value("admin-flow@example.com"))
                .andExpect(jsonPath("$.senhaHash").doesNotExist());

        long organizationId = createOrganization(session, "Organização Flow");
        mockMvc.perform(get("/api/usuarios")
                        .header(AUTHORIZATION, bearer(session))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(session.accountId()));
    }

    @Test
    void devePadronizarErrosDeValidacaoNegocioERecursoInexistente() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "nome", "",
                                "email", "email-invalido",
                                "senha", "curta"
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Dados inválidos"))
                .andExpect(jsonPath("$.campos.nome").exists())
                .andExpect(jsonPath("$.campos.email").exists());

        Session session = registerAndLogin("Usuário Único", "unico-flow@example.com");
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "nome", "Outro Usuário",
                                "email", "unico-flow@example.com",
                                "senha", PASSWORD
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Regra de negócio violada"));

        long organizationId = createOrganization(session, "Organização de erros");
        mockMvc.perform(get("/api/itens/{id}", 999_999L)
                        .header(AUTHORIZATION, bearer(session))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.erro").value("Recurso não encontrado"));
    }

    @Test
    void deveExecutarFluxoCompletoDeMovimentacaoDeEstoque() throws Exception {
        Session session = registerAndLogin("Responsável Estoque", "estoque-flow@example.com");
        long organizationId = createOrganization(session, "Estoque Flow");
        long itemId = createItem(session, organizationId, "ITEM-T1", "Parafuso", 10, 5);

        mockMvc.perform(put("/api/itens/{id}", itemId)
                        .header(AUTHORIZATION, bearer(session))
                        .header(ORGANIZATION, organizationId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "codigo", "ITEM-T1",
                                "nome", "Parafuso Atualizado",
                                "categoria", "Fixação",
                                "quantidadeMinima", 6,
                                "localizacao", "Prateleira B"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quantidadeAtual").value(10));

        moveItem(session, organizationId, itemId, "entrada", 5, "Compra")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tipoMovimentacao").value("ENTRADA"));
        moveItem(session, organizationId, itemId, "saida", 3, "Consumo")
                .andExpect(status().isCreated());
        moveItem(session, organizationId, itemId, "correcao", 4, "Inventário físico")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.quantidade").value(-8));

        mockMvc.perform(get("/api/itens/{id}", itemId)
                        .header(AUTHORIZATION, bearer(session))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quantidadeAtual").value(4))
                .andExpect(jsonPath("$.abaixoMinimo").value(true));
        mockMvc.perform(get("/api/itens/{id}/historico", itemId)
                        .header(AUTHORIZATION, bearer(session))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3));
        mockMvc.perform(get("/api/movimentacoes-estoque")
                        .header(AUTHORIZATION, bearer(session))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3));
        mockMvc.perform(delete("/api/itens/{id}", itemId)
                        .header(AUTHORIZATION, bearer(session))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isNoContent());
    }

    @Test
    void deveRejeitarSaidaComEstoqueInsuficiente() throws Exception {
        Session session = registerAndLogin("Responsável Saída", "saida-flow@example.com");
        long organizationId = createOrganization(session, "Saída Flow");
        long itemId = createItem(session, organizationId, "ITEM-T2", "Arruela", 1, 0);

        moveItem(session, organizationId, itemId, "saida", 2, "Consumo excessivo")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem")
                        .value(org.hamcrest.Matchers.containsString("Quantidade insuficiente")));
    }

    @Test
    void deveExecutarRetiradaEDevolucaoDeFerramenta() throws Exception {
        Session session = registerAndLogin("Responsável Ferramenta", "ferramenta-flow@example.com");
        long organizationId = createOrganization(session, "Ferramentas Flow");
        long toolId = createTool(session, organizationId, "PAT-T1", "Furadeira");

        moveTool(session, organizationId, toolId, "retirada", Map.of("observacao", "Uso em campo"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.usuarioId").value(session.accountId()));
        mockMvc.perform(get("/api/ferramentas/{id}", toolId)
                        .header(AUTHORIZATION, bearer(session))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EMPRESTADA"))
                .andExpect(jsonPath("$.responsavelAtualId").value(session.accountId()));
        moveTool(session, organizationId, toolId, "devolucao", Map.of("observacao", "Devolvida"))
                .andExpect(status().isCreated());
        mockMvc.perform(get("/api/ferramentas/{id}/historico", toolId)
                        .header(AUTHORIZATION, bearer(session))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void deveExecutarManutencaoPerdaECorrecaoDeFerramenta() throws Exception {
        Session session = registerAndLogin("Responsável Manutenção", "manutencao-flow@example.com");
        long organizationId = createOrganization(session, "Manutenção Flow");
        long toolId = createTool(session, organizationId, "PAT-T2", "Multímetro");

        moveTool(session, organizationId, toolId, "manutencao", Map.of("observacao", "Calibração"))
                .andExpect(status().isCreated());
        moveTool(session, organizationId, toolId, "correcao", Map.of(
                        "novoStatus", "DISPONIVEL",
                        "observacao", "Calibração concluída"
                )).andExpect(status().isCreated());
        moveTool(session, organizationId, toolId, "perda", Map.of("observacao", "Extravio"))
                .andExpect(status().isCreated());
        moveTool(session, organizationId, toolId, "manutencao", Map.of("observacao", "Inválida"))
                .andExpect(status().isBadRequest());
    }

    private long createItem(
            Session session,
            long organizationId,
            String code,
            String name,
            int current,
            int minimum
    ) throws Exception {
        String response = mockMvc.perform(post("/api/itens")
                        .header(AUTHORIZATION, bearer(session))
                        .header(ORGANIZATION, organizationId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "codigo", code,
                                "nome", name,
                                "quantidadeAtual", current,
                                "quantidadeMinima", minimum
                        ))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return id(response);
    }

    private long createTool(Session session, long organizationId, String asset, String name) throws Exception {
        String response = mockMvc.perform(post("/api/ferramentas")
                        .header(AUTHORIZATION, bearer(session))
                        .header(ORGANIZATION, organizationId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("patrimonio", asset, "nome", name))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return id(response);
    }

    private ResultActions moveItem(
            Session session,
            long organizationId,
            long itemId,
            String operation,
            int quantity,
            String observation
    ) throws Exception {
        return mockMvc.perform(post("/api/itens/{id}/{operacao}", itemId, operation)
                .header(AUTHORIZATION, bearer(session))
                .header(ORGANIZATION, organizationId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("quantidade", quantity, "observacao", observation))));
    }

    private ResultActions moveTool(
            Session session,
            long organizationId,
            long toolId,
            String operation,
            Map<String, Object> data
    ) throws Exception {
        return mockMvc.perform(post("/api/ferramentas/{id}/{operacao}", toolId, operation)
                .header(AUTHORIZATION, bearer(session))
                .header(ORGANIZATION, organizationId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(new HashMap<>(data))));
    }
}
