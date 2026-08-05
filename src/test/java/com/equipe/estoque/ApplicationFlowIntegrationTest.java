package com.equipe.estoque;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
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
class ApplicationFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void deveExecutarCrudCompletoDeUsuario() throws Exception {
        long usuarioId = criarUsuario("Operador Inicial", "operador@example.com", "OPERADOR");

        mockMvc.perform(get("/api/usuarios/{id}", usuarioId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Operador Inicial"))
                .andExpect(jsonPath("$.perfil").value("OPERADOR"))
                .andExpect(jsonPath("$.ativo").value(true));

        mockMvc.perform(put("/api/usuarios/{id}", usuarioId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "nome", "Administrador Atualizado",
                                "email", "admin.atualizado@example.com",
                                "perfil", "ADMIN"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Administrador Atualizado"))
                .andExpect(jsonPath("$.email").value("admin.atualizado@example.com"))
                .andExpect(jsonPath("$.perfil").value("ADMIN"));

        mockMvc.perform(get("/api/usuarios"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(usuarioId));

        mockMvc.perform(delete("/api/usuarios/{id}", usuarioId))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/usuarios/{id}", usuarioId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ativo").value(false));
    }

    @Test
    void devePadronizarErrosDeValidacaoNegocioERecursoInexistente() throws Exception {
        mockMvc.perform(post("/api/usuarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "nome", "",
                                "email", "email-invalido",
                                "perfil", "OPERADOR"
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Dados inválidos"))
                .andExpect(jsonPath("$.campos.nome").exists())
                .andExpect(jsonPath("$.campos.email").exists());

        criarUsuario("Usuário Único", "unico@example.com", "CONSULTA");

        mockMvc.perform(post("/api/usuarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "nome", "Outro Usuário",
                                "email", "unico@example.com",
                                "perfil", "OPERADOR"
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Regra de negócio violada"));

        mockMvc.perform(get("/api/usuarios/{id}", 999_999L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.erro").value("Recurso não encontrado"));
    }

    @Test
    void deveExecutarFluxoCompletoDeMovimentacaoDeEstoque() throws Exception {
        long usuarioId = criarUsuario("Responsável Estoque", "estoque@example.com", "OPERADOR");
        long itemId = criarItem("ITEM-T1", "Parafuso", 10, 5);

        mockMvc.perform(put("/api/itens/{id}", itemId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "codigo", "ITEM-T1",
                                "nome", "Parafuso Atualizado",
                                "categoria", "Fixação",
                                "quantidadeMinima", 6,
                                "localizacao", "Prateleira B"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Parafuso Atualizado"))
                .andExpect(jsonPath("$.quantidadeAtual").value(10))
                .andExpect(jsonPath("$.quantidadeMinima").value(6));

        movimentarItem(itemId, "entrada", usuarioId, 5, "Compra")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tipoMovimentacao").value("ENTRADA"))
                .andExpect(jsonPath("$.quantidade").value(5));

        movimentarItem(itemId, "saida", usuarioId, 3, "Consumo")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tipoMovimentacao").value("SAIDA"));

        movimentarItem(itemId, "correcao", usuarioId, 4, "Inventário físico")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tipoMovimentacao").value("CORRECAO"))
                .andExpect(jsonPath("$.quantidade").value(-8));

        mockMvc.perform(get("/api/itens/{id}", itemId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quantidadeAtual").value(4))
                .andExpect(jsonPath("$.abaixoMinimo").value(true));

        mockMvc.perform(get("/api/itens/abaixo-minimo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(itemId));

        mockMvc.perform(get("/api/itens/{id}/historico", itemId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].tipoMovimentacao").value("CORRECAO"))
                .andExpect(jsonPath("$[2].tipoMovimentacao").value("ENTRADA"));

        mockMvc.perform(get("/api/movimentacoes-estoque"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3));

        mockMvc.perform(delete("/api/itens/{id}", itemId))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/itens/{id}", itemId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ativo").value(false));
    }

    @Test
    void deveRejeitarSaidaComEstoqueInsuficiente() throws Exception {
        long usuarioId = criarUsuario("Responsável Saída", "saida@example.com", "OPERADOR");
        long itemId = criarItem("ITEM-T2", "Arruela", 1, 0);

        movimentarItem(itemId, "saida", usuarioId, 2, "Consumo excessivo")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value(org.hamcrest.Matchers.containsString("Quantidade insuficiente")));
    }

    @Test
    void deveExecutarRetiradaEDevolucaoDeFerramenta() throws Exception {
        long usuarioId = criarUsuario("Responsável Ferramenta", "ferramenta@example.com", "OPERADOR");
        long ferramentaId = criarFerramenta("PAT-T1", "Furadeira");

        mockMvc.perform(put("/api/ferramentas/{id}", ferramentaId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "patrimonio", "PAT-T1",
                                "nome", "Furadeira Atualizada",
                                "categoria", "Elétrica",
                                "localizacao", "Armário 2"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Furadeira Atualizada"));

        movimentarFerramenta(ferramentaId, "retirada", usuarioId, Map.of("observacao", "Uso em campo"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tipoMovimentacao").value("RETIRADA"));

        mockMvc.perform(get("/api/ferramentas/{id}", ferramentaId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EMPRESTADA"))
                .andExpect(jsonPath("$.responsavelAtualId").value(usuarioId));

        mockMvc.perform(get("/api/ferramentas/emprestadas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(ferramentaId));

        mockMvc.perform(get("/api/ferramentas/{id}/ultimo-responsavel", ferramentaId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.usuarioId").value(usuarioId));

        movimentarFerramenta(ferramentaId, "devolucao", usuarioId, Map.of("observacao", "Devolvida"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tipoMovimentacao").value("DEVOLUCAO"));

        mockMvc.perform(get("/api/ferramentas/{id}/historico", ferramentaId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].tipoMovimentacao").value("DEVOLUCAO"));

        mockMvc.perform(get("/api/movimentacoes-ferramenta"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));

        movimentarFerramenta(ferramentaId, "devolucao", usuarioId, Map.of("observacao", "Duplicada"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deveExecutarManutencaoPerdaECorrecaoDeFerramenta() throws Exception {
        long usuarioId = criarUsuario("Responsável Manutenção", "manutencao@example.com", "ADMIN");
        long ferramentaId = criarFerramenta("PAT-T2", "Multímetro");

        movimentarFerramenta(ferramentaId, "manutencao", usuarioId, Map.of("observacao", "Calibração"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tipoMovimentacao").value("MANUTENCAO"));

        movimentarFerramenta(ferramentaId, "correcao", usuarioId, Map.of(
                        "novoStatus", "DISPONIVEL",
                        "observacao", "Calibração concluída"
                ))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tipoMovimentacao").value("CORRECAO"));

        movimentarFerramenta(ferramentaId, "perda", usuarioId, Map.of("observacao", "Extravio"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tipoMovimentacao").value("PERDA"));

        mockMvc.perform(get("/api/ferramentas/{id}", ferramentaId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PERDIDA"));

        movimentarFerramenta(ferramentaId, "manutencao", usuarioId, Map.of("observacao", "Inválida"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(delete("/api/ferramentas/{id}", ferramentaId))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/ferramentas/{id}", ferramentaId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ativo").value(false));
    }

    private long criarUsuario(String nome, String email, String perfil) throws Exception {
        String response = mockMvc.perform(post("/api/usuarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "nome", nome,
                                "email", email,
                                "perfil", perfil
                        ))))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
        return id(response);
    }

    private long criarItem(String codigo, String nome, int quantidadeAtual, int quantidadeMinima) throws Exception {
        String response = mockMvc.perform(post("/api/itens")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "codigo", codigo,
                                "nome", nome,
                                "categoria", "Material",
                                "quantidadeAtual", quantidadeAtual,
                                "quantidadeMinima", quantidadeMinima,
                                "localizacao", "Prateleira A"
                        ))))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
        return id(response);
    }

    private long criarFerramenta(String patrimonio, String nome) throws Exception {
        String response = mockMvc.perform(post("/api/ferramentas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "patrimonio", patrimonio,
                                "nome", nome,
                                "categoria", "Elétrica",
                                "localizacao", "Armário 1"
                        ))))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
        return id(response);
    }

    private org.springframework.test.web.servlet.ResultActions movimentarItem(
            long itemId, String operacao, long usuarioId, int quantidade, String observacao) throws Exception {
        return mockMvc.perform(post("/api/itens/{id}/{operacao}", itemId, operacao)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of(
                        "usuarioId", usuarioId,
                        "quantidade", quantidade,
                        "observacao", observacao
                ))));
    }

    private org.springframework.test.web.servlet.ResultActions movimentarFerramenta(
            long ferramentaId, String operacao, long usuarioId, Map<String, Object> dados) throws Exception {
        Map<String, Object> corpo = new java.util.HashMap<>(dados);
        corpo.put("usuarioId", usuarioId);
        return mockMvc.perform(post("/api/ferramentas/{id}/{operacao}", ferramentaId, operacao)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(corpo)));
    }

    private String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }

    private long id(String response) throws Exception {
        JsonNode json = objectMapper.readTree(response);
        return json.get("id").asLong();
    }
}
