package com.equipe.estoque;

import com.equipe.estoque.entity.OrganizacaoMembro;
import com.equipe.estoque.enums.PerfilMembroOrganizacao;
import com.equipe.estoque.enums.StatusMembroOrganizacao;
import com.equipe.estoque.repository.OrganizacaoMembroRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
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
class OrganizationAuthorizationIntegrationTest extends SecurityTestSupport {

    @Autowired
    private OrganizacaoMembroRepository membroRepository;

    @Test
    void criadorDeveVirarAdminAtivoSemEnviarUsuarioOuPerfil() throws Exception {
        Session creator = registerAndLogin("Criador Seguro", "criador-seguro@example.com");
        long organizationId = createOrganization(creator, "Organização Segura");

        OrganizacaoMembro member = membroRepository
                .findByOrganizacaoIdAndUsuarioId(organizationId, creator.accountId())
                .orElseThrow();
        assertEquals(PerfilMembroOrganizacao.ADMIN, member.getPerfil());
        assertEquals(StatusMembroOrganizacao.ATIVO, member.getStatus());
        assertEquals(creator.accountId(), member.getAprovadoPorUsuario().getId());
    }

    @Test
    void solicitacaoDeveCriarPendenteSemAcessoOperacional() throws Exception {
        Session admin = registerAndLogin("Admin Pendente", "admin-pendente@example.com");
        Session applicant = registerAndLogin("Solicitante", "solicitante-pendente@example.com");
        long organizationId = createOrganization(admin, "Organização Pendente");
        long memberId = requestMembership(applicant, organizationId);

        mockMvc.perform(get("/api/itens")
                        .header(AUTHORIZATION, bearer(applicant))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("ACESSO_NEGADO"));
        OrganizacaoMembro member = membroRepository.findById(memberId).orElseThrow();
        assertEquals(StatusMembroOrganizacao.PENDENTE, member.getStatus());
        assertEquals(PerfilMembroOrganizacao.CONSULTA, member.getPerfil());
    }

    @Test
    void adminDeveAprovarSolicitacaoComoOperador() throws Exception {
        Session admin = registerAndLogin("Admin Aprovação", "admin-aprovacao@example.com");
        Session applicant = registerAndLogin("Operador Novo", "operador-novo@example.com");
        long organizationId = createOrganization(admin, "Organização Aprovação");
        long memberId = requestMembership(applicant, organizationId);

        approve(admin, organizationId, memberId, "OPERADOR")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.perfil").value("OPERADOR"))
                .andExpect(jsonPath("$.status").value("ATIVO"));
        mockMvc.perform(get("/api/itens")
                        .header(AUTHORIZATION, bearer(applicant))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isOk());
    }

    @Test
    void naoAdminNaoDeveAprovarSolicitacao() throws Exception {
        Session admin = registerAndLogin("Admin Original", "admin-original@example.com");
        Session operator = registerAndLogin("Operador", "operador-sem-admin@example.com");
        Session applicant = registerAndLogin("Solicitante Dois", "solicitante-dois@example.com");
        long organizationId = createOrganization(admin, "Organização Sem Autoelevação");
        long operatorMember = requestMembership(operator, organizationId);
        approve(admin, organizationId, operatorMember, "OPERADOR").andExpect(status().isOk());
        long pendingMember = requestMembership(applicant, organizationId);

        approve(operator, organizationId, pendingMember, "CONSULTA")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("ACESSO_NEGADO"));
    }

    @Test
    void solicitanteNaoDeveSerAprovadoDiretamenteComoAdmin() throws Exception {
        Session admin = registerAndLogin("Admin Perfil", "admin-perfil@example.com");
        Session applicant = registerAndLogin("Solicitante Perfil", "solicitante-perfil@example.com");
        long organizationId = createOrganization(admin, "Organização Perfil");
        long memberId = requestMembership(applicant, organizationId);

        approve(admin, organizationId, memberId, "ADMIN")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("REGRA_NEGOCIO"));
        assertEquals(StatusMembroOrganizacao.PENDENTE,
                membroRepository.findById(memberId).orElseThrow().getStatus());
    }

    @Test
    void consultaDeveLerMasReceber403EmEscrita() throws Exception {
        Session admin = registerAndLogin("Admin Consulta", "admin-consulta@example.com");
        Session reader = registerAndLogin("Consulta", "consulta-role@example.com");
        long organizationId = createOrganization(admin, "Organização Consulta");
        long memberId = requestMembership(reader, organizationId);
        approve(admin, organizationId, memberId, "CONSULTA").andExpect(status().isOk());

        mockMvc.perform(get("/api/itens")
                        .header(AUTHORIZATION, bearer(reader))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/itens")
                        .header(AUTHORIZATION, bearer(reader))
                        .header(ORGANIZATION, organizationId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(itemBody("CONSULTA-NAO-CRIA")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("ACESSO_NEGADO"));
    }

    @Test
    void operadorDeveMovimentarMasNaoAdministrar() throws Exception {
        Session admin = registerAndLogin("Admin Operação", "admin-operacao@example.com");
        Session operator = registerAndLogin("Operador Real", "operador-real@example.com");
        long organizationId = createOrganization(admin, "Organização Operação");
        long memberId = requestMembership(operator, organizationId);
        approve(admin, organizationId, memberId, "OPERADOR").andExpect(status().isOk());
        long itemId = createItem(admin, organizationId, "OPERADOR-MOV");

        mockMvc.perform(post("/api/itens/{id}/entrada", itemId)
                        .header(AUTHORIZATION, bearer(operator))
                        .header(ORGANIZATION, organizationId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("quantidade", 2, "observacao", "Entrada do operador"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.usuarioId").value(operator.accountId()));
        mockMvc.perform(get("/api/organizacoes/{id}/membros", organizationId)
                        .header(AUTHORIZATION, bearer(operator)))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/itens")
                        .header(AUTHORIZATION, bearer(operator))
                        .header(ORGANIZATION, organizationId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(itemBody("OPERADOR-ADMIN")))
                .andExpect(status().isForbidden());
    }

    @Test
    void membroRemovidoDevePerderAcessoImediatamente() throws Exception {
        Session admin = registerAndLogin("Admin Remoção", "admin-remocao@example.com");
        Session operator = registerAndLogin("Removido", "removido@example.com");
        long organizationId = createOrganization(admin, "Organização Remoção");
        long memberId = requestMembership(operator, organizationId);
        approve(admin, organizationId, memberId, "OPERADOR").andExpect(status().isOk());

        mockMvc.perform(delete("/api/organizacoes/{organizationId}/membros/{memberId}",
                        organizationId, memberId)
                        .header(AUTHORIZATION, bearer(admin)))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/itens")
                        .header(AUTHORIZATION, bearer(operator))
                        .header(ORGANIZATION, organizationId))
                .andExpect(status().isForbidden());
        assertEquals(StatusMembroOrganizacao.REMOVIDO,
                membroRepository.findById(memberId).orElseThrow().getStatus());
    }

    @Test
    void deveProtegerUltimoAdminAtivo() throws Exception {
        Session admin = registerAndLogin("Último Admin", "ultimo-admin@example.com");
        long organizationId = createOrganization(admin, "Organização Último Admin");
        long memberId = membroRepository
                .findByOrganizacaoIdAndUsuarioId(organizationId, admin.accountId())
                .orElseThrow().getId();

        mockMvc.perform(delete("/api/organizacoes/{organizationId}/membros/{memberId}",
                        organizationId, memberId)
                        .header(AUTHORIZATION, bearer(admin)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem")
                        .value("A organização deve manter ao menos um ADMIN ativo"));
        mockMvc.perform(put("/api/organizacoes/{organizationId}/membros/{memberId}/perfil",
                        organizationId, memberId)
                        .header(AUTHORIZATION, bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("perfil", "CONSULTA"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void usuarioPodeTerPerfisDiferentesEmVariasOrganizacoes() throws Exception {
        Session adminA = registerAndLogin("Admin A", "admin-multiorg-a@example.com");
        Session adminB = registerAndLogin("Admin B", "admin-multiorg-b@example.com");
        Session member = registerAndLogin("Membro Multi", "membro-multiorg-sec@example.com");
        long organizationA = createOrganization(adminA, "Multi A");
        long organizationB = createOrganization(adminB, "Multi B");
        long memberA = requestMembership(member, organizationA);
        long memberB = requestMembership(member, organizationB);
        approve(adminA, organizationA, memberA, "OPERADOR").andExpect(status().isOk());
        approve(adminB, organizationB, memberB, "CONSULTA").andExpect(status().isOk());

        mockMvc.perform(get("/api/organizacoes").header(AUTHORIZATION, bearer(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[?(@.id == " + organizationA + ")].perfil").value("OPERADOR"))
                .andExpect(jsonPath("$[?(@.id == " + organizationB + ")].perfil").value("CONSULTA"));
    }

    @Test
    void idsReaisDeOutroTenantNaoDevemDarAcessoAItensFerramentasOuAdministracao() throws Exception {
        Session adminA = registerAndLogin("Tenant A", "tenant-a@example.com");
        Session adminB = registerAndLogin("Tenant B", "tenant-b@example.com");
        long organizationA = createOrganization(adminA, "Tenant A");
        long organizationB = createOrganization(adminB, "Tenant B");
        long itemA = createItem(adminA, organizationA, "TENANT-A-ITEM");
        long toolA = createTool(adminA, organizationA, "TENANT-A-TOOL");

        mockMvc.perform(get("/api/itens/{id}", itemA)
                        .header(AUTHORIZATION, bearer(adminB))
                        .header(ORGANIZATION, organizationB))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/ferramentas/{id}", toolA)
                        .header(AUTHORIZATION, bearer(adminB))
                        .header(ORGANIZATION, organizationB))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/movimentacoes-estoque")
                        .header(AUTHORIZATION, bearer(adminB))
                        .header(ORGANIZATION, organizationB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get("/api/organizacoes/{id}/membros", organizationB)
                        .header(AUTHORIZATION, bearer(adminA)))
                .andExpect(status().isForbidden());
    }

    @Test
    void usuarioIdInformadoPeloClienteDeveSerIgnoradoNaAutoria() throws Exception {
        Session executor = registerAndLogin("Executor Real", "executor-real@example.com");
        Session another = registerAndLogin("Outro Usuário", "outro-usuario@example.com");
        long organizationId = createOrganization(executor, "Organização Autoria");
        long itemId = createItem(executor, organizationId, "AUTORIA-ITEM");

        mockMvc.perform(post("/api/itens/{id}/entrada", itemId)
                        .header(AUTHORIZATION, bearer(executor))
                        .header(ORGANIZATION, organizationId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "usuarioId", another.accountId(),
                                "quantidade", 1,
                                "observacao", "Tentativa de falsificação"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.usuarioId").value(executor.accountId()));
    }

    private org.springframework.test.web.servlet.ResultActions approve(
            Session admin,
            long organizationId,
            long memberId,
            String profile
    ) throws Exception {
        return mockMvc.perform(put("/api/organizacoes/{organizationId}/solicitacoes/{memberId}/aprovacao",
                        organizationId, memberId)
                .header(AUTHORIZATION, bearer(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("perfil", profile))));
    }

    private long createItem(Session admin, long organizationId, String code) throws Exception {
        String response = mockMvc.perform(post("/api/itens")
                        .header(AUTHORIZATION, bearer(admin))
                        .header(ORGANIZATION, organizationId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(itemBody(code)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return id(response);
    }

    private long createTool(Session admin, long organizationId, String asset) throws Exception {
        String response = mockMvc.perform(post("/api/ferramentas")
                        .header(AUTHORIZATION, bearer(admin))
                        .header(ORGANIZATION, organizationId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("patrimonio", asset, "nome", "Ferramenta segura"))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return id(response);
    }

    private String itemBody(String code) throws Exception {
        return json(Map.of(
                "codigo", code,
                "nome", "Item seguro",
                "quantidadeAtual", 0,
                "quantidadeMinima", 0
        ));
    }
}
