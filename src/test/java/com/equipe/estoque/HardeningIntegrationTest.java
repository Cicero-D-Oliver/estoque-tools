package com.equipe.estoque;

import com.equipe.estoque.config.SQLiteLegacyBaselineCallback;
import com.equipe.estoque.entity.Usuario;
import com.equipe.estoque.repository.UsuarioRepository;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Map;

import static org.hamcrest.Matchers.blankOrNullString;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class HardeningIntegrationTest extends SecurityTestSupport {

    @Autowired
    private Flyway flyway;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Test
    void deveRegistrarAssinaturaIntegralNoFlywaySQLite() {
        assertTrue(Arrays.stream(flyway.getConfiguration().getCallbacks())
                .anyMatch(SQLiteLegacyBaselineCallback.class::isInstance));
    }

    @Test
    void deveSanitizarJsonMalformadoSemExporDetalhesInternos() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .header("X-Correlation-Id", "teste-correlacao-123")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Teste","email":"teste@example.com","senha":{"valor":"invalido"}}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("X-Correlation-Id", "teste-correlacao-123"))
                .andExpect(jsonPath("$.codigo").value("REQUISICAO_MALFORMADA"))
                .andExpect(jsonPath("$.referencia").value("teste-correlacao-123"))
                .andExpect(jsonPath("$.caminho").value("/api/auth/register"))
                .andExpect(jsonPath("$.stackTrace").doesNotExist())
                .andExpect(jsonPath("$.exception").doesNotExist());
    }

    @Test
    void deveRejeitarCamposDesconhecidosEIdsInvalidos() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Teste","email":"teste@example.com",
                                 "senha":"SenhaSegura!2026","admin":true}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("REQUISICAO_MALFORMADA"));

        Session session = registerAndLogin("Validação", "validacao-hardening@example.com");
        long organizationId = createOrganization(session, "Validação Hardening");
        mockMvc.perform(get("/api/usuarios/{id}", 0)
                        .header(AUTHORIZATION, bearer(session))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("DADOS_INVALIDOS"))
                .andExpect(jsonPath("$.referencia", not(blankOrNullString())));
    }

    @Test
    void deveAplicarCorsSomenteParaOrigemConfigurada() throws Exception {
        mockMvc.perform(options("/api/auth/register")
                        .header("Origin", "http://localhost:3000")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "Content-Type,Authorization,X-Organization-Id"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"));

        mockMvc.perform(options("/api/auth/register")
                        .header("Origin", "https://origem-nao-permitida.example")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test
    void deveBloquearOrigemNaoPermitidaNosEndpointsDoCookieDeSessao() throws Exception {
        mockMvc.perform(post("/api/auth/refresh")
                        .header("Origin", "https://origem-nao-permitida.example"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"))
                .andExpect(content().string("Invalid CORS request"));

        mockMvc.perform(post("/api/auth/refresh")
                        .header("Sec-Fetch-Site", "cross-site"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("ACESSO_NEGADO"));
    }

    @Test
    void deveBloquearMovimentacoesComContaOuItemInativo() throws Exception {
        Session session = registerAndLogin("Conta ativa", "ativa-hardening@example.com");
        long organizationId = createOrganization(session, "Inativação Hardening");
        long itemId = createItem(session, organizationId, "ITEM-INATIVO");
        mockMvc.perform(delete("/api/itens/{id}", itemId)
                        .header(AUTHORIZATION, bearer(session))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isNoContent());

        moveItem(session, organizationId, itemId, 1)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("O item de estoque está inativo"));

        Usuario account = usuarioRepository.findById(session.accountId()).orElseThrow();
        account.setAtivo(false);
        usuarioRepository.saveAndFlush(account);
        mockMvc.perform(get("/api/auth/me").header(AUTHORIZATION, bearer(session)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.codigo").value("NAO_AUTENTICADO"));
    }

    @Test
    void deveRejeitarQuantidadeZeroSemCriarMovimentacao() throws Exception {
        Session session = registerAndLogin("Operador Zero", "zero-hardening@example.com");
        long organizationId = createOrganization(session, "Zero Hardening");
        long itemId = createItem(session, organizationId, "ITEM-ZERO");

        moveItem(session, organizationId, itemId, 0)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("REGRA_NEGOCIO"));
        mockMvc.perform(get("/api/itens/{id}/historico", itemId)
                        .header(AUTHORIZATION, bearer(session))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void deveImpedirCorrecaoParaEmprestadaSemResponsavelAtual() throws Exception {
        Session session = registerAndLogin("Operador Ferramenta", "correcao-hardening@example.com");
        long organizationId = createOrganization(session, "Correção Hardening");
        long toolId = createTool(session, organizationId, "PAT-CORRECAO");

        mockMvc.perform(post("/api/ferramentas/{id}/correcao", toolId)
                        .header(AUTHORIZATION, bearer(session))
                        .header(ORGANIZATION, organizationId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "novoStatus", "EMPRESTADA",
                                "observacao", "Ajuste inválido"
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem")
                        .value(org.hamcrest.Matchers.containsString("Use a retirada")));
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
                .andExpect(jsonPath("$.tags.length()").value(7))
                .andExpect(jsonPath("$.paths['/api/auth/register'].post.responses['201']").exists())
                .andExpect(jsonPath("$.components.securitySchemes.bearerAuth.scheme").value("bearer"))
                .andExpect(jsonPath("$.components.schemas.AccountResponse.properties.senhaHash").doesNotExist())
                .andExpect(jsonPath("$.components.schemas.Erro").exists());
    }

    private long createItem(Session session, long organizationId, String code) throws Exception {
        String response = mockMvc.perform(post("/api/itens")
                        .header(AUTHORIZATION, bearer(session))
                        .header(ORGANIZATION, organizationId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "codigo", code,
                                "nome", "Item de teste",
                                "quantidadeAtual", 10,
                                "quantidadeMinima", 2
                        ))))
                .andExpect(status().isCreated()).andReturn().getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
        return id(response);
    }

    private long createTool(Session session, long organizationId, String asset) throws Exception {
        String response = mockMvc.perform(post("/api/ferramentas")
                        .header(AUTHORIZATION, bearer(session))
                        .header(ORGANIZATION, organizationId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("patrimonio", asset, "nome", "Ferramenta de teste"))))
                .andExpect(status().isCreated()).andReturn().getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
        return id(response);
    }

    private ResultActions moveItem(
            Session session,
            long organizationId,
            long itemId,
            int quantity
    ) throws Exception {
        return mockMvc.perform(post("/api/itens/{id}/entrada", itemId)
                .header(AUTHORIZATION, bearer(session))
                .header(ORGANIZATION, organizationId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("quantidade", quantity, "observacao", "Teste"))));
    }
}
