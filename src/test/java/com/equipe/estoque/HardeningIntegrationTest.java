package com.equipe.estoque;

import com.equipe.estoque.config.SQLiteLegacyBaselineCallback;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Map;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.blankOrNullString;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class HardeningIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private Flyway flyway;

    @Test
    void deveRegistrarAssinaturaIntegralNoFlywaySQLite() {
        assertTrue(Arrays.stream(flyway.getConfiguration().getCallbacks())
                .anyMatch(SQLiteLegacyBaselineCallback.class::isInstance));
    }

    @Test
    void deveSanitizarJsonMalformadoSemExporDetalhesInternos() throws Exception {
        mockMvc.perform(post("/api/usuarios")
                        .header("X-Correlation-Id", "teste-correlacao-123")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Teste","email":"teste@example.com","perfil":"INVALIDO"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("X-Correlation-Id", "teste-correlacao-123"))
                .andExpect(jsonPath("$.codigo").value("REQUISICAO_MALFORMADA"))
                .andExpect(jsonPath("$.referencia").value("teste-correlacao-123"))
                .andExpect(jsonPath("$.caminho").value("/api/usuarios"))
                .andExpect(jsonPath("$.mensagem").value("O corpo ou um parâmetro contém formato ou valor não suportado."))
                .andExpect(jsonPath("$.stackTrace").doesNotExist())
                .andExpect(jsonPath("$.exception").doesNotExist());
    }

    @Test
    void deveRejeitarCamposDesconhecidosEIdsInvalidos() throws Exception {
        mockMvc.perform(post("/api/usuarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Teste","email":"teste@example.com","perfil":"OPERADOR","admin":true}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("REQUISICAO_MALFORMADA"));

        mockMvc.perform(get("/api/usuarios/{id}", 0))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("DADOS_INVALIDOS"))
                .andExpect(jsonPath("$.referencia", not(blankOrNullString())));
    }

    @Test
    void deveAplicarCorsSomenteParaOrigemConfigurada() throws Exception {
        mockMvc.perform(options("/api/usuarios")
                        .header("Origin", "http://localhost:3000")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "Content-Type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"));

        mockMvc.perform(options("/api/usuarios")
                        .header("Origin", "https://origem-nao-permitida.example")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test
    void deveBloquearMovimentacoesComUsuarioOuItemInativo() throws Exception {
        long usuarioAtivo = criarUsuario("Usuário Ativo", "ativo@example.com");
        long itemInativo = criarItem("ITEM-INATIVO");
        mockMvc.perform(delete("/api/itens/{id}", itemInativo)).andExpect(status().isNoContent());

        movimentarItem(itemInativo, usuarioAtivo, 1)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("O item de estoque está inativo"));

        long usuarioInativo = criarUsuario("Usuário Inativo", "inativo@example.com");
        long itemAtivo = criarItem("ITEM-ATIVO");
        mockMvc.perform(delete("/api/usuarios/{id}", usuarioInativo)).andExpect(status().isNoContent());

        movimentarItem(itemAtivo, usuarioInativo, 1)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("O usuário responsável está inativo"));
    }

    @Test
    void deveRejeitarQuantidadeZeroSemCriarMovimentacao() throws Exception {
        long usuarioId = criarUsuario("Operador Zero", "zero@example.com");
        long itemId = criarItem("ITEM-ZERO");

        movimentarItem(itemId, usuarioId, 0)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("REGRA_NEGOCIO"));

        mockMvc.perform(get("/api/itens/{id}/historico", itemId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void deveImpedirCorrecaoParaEmprestadaSemResponsavelAtual() throws Exception {
        long usuarioId = criarUsuario("Operador Ferramenta", "correcao@example.com");
        long ferramentaId = criarFerramenta("PAT-CORRECAO");

        mockMvc.perform(post("/api/ferramentas/{id}/correcao", ferramentaId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "usuarioId", usuarioId,
                                "novoStatus", "EMPRESTADA",
                                "observacao", "Ajuste inválido"
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value(org.hamcrest.Matchers.containsString("Use a retirada")));

        mockMvc.perform(get("/api/ferramentas/{id}", ferramentaId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DISPONIVEL"))
                .andExpect(jsonPath("$.responsavelAtualId").doesNotExist());
    }

    @Test
    void devePublicarHealthcheckEContratoOpenApiCompleto() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.components").doesNotExist());

        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.openapi").value("3.1.0"))
                .andExpect(jsonPath("$.tags.length()").value(5))
                .andExpect(jsonPath("$.paths['/api/usuarios'].post.responses['201']").exists())
                .andExpect(jsonPath("$.paths['/api/itens/{id}/entrada'].post.responses['400'].$ref")
                        .value("#/components/responses/BadRequest"))
                .andExpect(jsonPath("$.components.schemas.UsuarioRequest").exists())
                .andExpect(jsonPath("$.components.schemas.Erro").exists());
    }

    private long criarUsuario(String nome, String email) throws Exception {
        String response = mockMvc.perform(post("/api/usuarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("nome", nome, "email", email, "perfil", "OPERADOR"))))
                .andExpect(status().isCreated()).andReturn().getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
        return id(response);
    }

    private long criarItem(String codigo) throws Exception {
        String response = mockMvc.perform(post("/api/itens")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "codigo", codigo,
                                "nome", "Item de teste",
                                "quantidadeAtual", 10,
                                "quantidadeMinima", 2
                        ))))
                .andExpect(status().isCreated()).andReturn().getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
        return id(response);
    }

    private long criarFerramenta(String patrimonio) throws Exception {
        String response = mockMvc.perform(post("/api/ferramentas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("patrimonio", patrimonio, "nome", "Ferramenta de teste"))))
                .andExpect(status().isCreated()).andReturn().getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
        return id(response);
    }

    private org.springframework.test.web.servlet.ResultActions movimentarItem(
            long itemId,
            long usuarioId,
            int quantidade
    ) throws Exception {
        return mockMvc.perform(post("/api/itens/{id}/entrada", itemId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of(
                        "usuarioId", usuarioId,
                        "quantidade", quantidade,
                        "observacao", "Teste"
                ))));
    }

    private String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }

    private long id(String response) throws Exception {
        JsonNode json = objectMapper.readTree(response);
        return json.get("id").asLong();
    }
}
