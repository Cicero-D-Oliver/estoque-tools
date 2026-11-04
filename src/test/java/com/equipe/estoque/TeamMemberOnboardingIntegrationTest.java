package com.equipe.estoque;

import com.equipe.estoque.entity.ConviteOnboarding;
import com.equipe.estoque.entity.OrganizacaoMembro;
import com.equipe.estoque.entity.Usuario;
import com.equipe.estoque.enums.PerfilUsuario;
import com.equipe.estoque.enums.StatusMembroOrganizacao;
import com.equipe.estoque.mail.InMemoryOnboardingEmailSender;
import com.equipe.estoque.repository.BootstrapOnboardingRepository;
import com.equipe.estoque.repository.ConviteOnboardingRepository;
import com.equipe.estoque.repository.OrganizacaoMembroRepository;
import com.equipe.estoque.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class TeamMemberOnboardingIntegrationTest extends SecurityTestSupport {

    @Autowired private OrganizacaoMembroRepository membroRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private ConviteOnboardingRepository conviteRepository;
    @Autowired private BootstrapOnboardingRepository bootstrapRepository;
    @Autowired private InMemoryOnboardingEmailSender emailSender;

    @BeforeEach
    void clearMailbox() {
        emailSender.clear();
    }

    @Test
    void conviteDeveCriarContaEVinculoSomenteDepoisDaConfirmacao() throws Exception {
        Session admin = registerAndLogin("Admin Convite", "admin-convite@example.com");
        long organizationId = createOrganization(admin, "Organização Convite");
        String invitedEmail = "nova.pessoa@scaladatacenters.com";

        invite(admin, organizationId, invitedEmail, "OPERADOR")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDENTE"));
        assertTrue(usuarioRepository.findByEmailIgnoreCase(invitedEmail).isEmpty());
        assertEquals(1, membroRepository.findByOrganizacaoIdOrderByUsuarioNomeAscIdAsc(organizationId).size());

        complete(invitedEmail, "Nova Pessoa", PASSWORD)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mensagem").value("Acesso ativado. Entre com seu e-mail e senha."));
        var account = usuarioRepository.findByEmailIgnoreCase(invitedEmail).orElseThrow();
        OrganizacaoMembro member = membroRepository
                .findByOrganizacaoIdAndUsuarioId(organizationId, account.getId()).orElseThrow();
        assertEquals(StatusMembroOrganizacao.ATIVO, member.getStatus());
        assertEquals("OPERADOR", member.getPerfil().name());
    }

    @Test
    void conviteParaContaExistenteNaoDeveRecriarNemAlterarSenha() throws Exception {
        Session admin = registerAndLogin("Admin Existente", "admin-existente@example.com");
        Session target = registerAndLogin("Conta Existente", "existente@scaladatacenters.com");
        String passwordHash = usuarioRepository.findById(target.accountId()).orElseThrow().getSenhaHash();
        long organizationId = createOrganization(admin, "Organização Existente");

        invite(admin, organizationId, "existente@scaladatacenters.com", "CONSULTA")
                .andExpect(status().isCreated());
        completeExisting("existente@scaladatacenters.com").andExpect(status().isOk());

        assertEquals(passwordHash, usuarioRepository.findById(target.accountId()).orElseThrow().getSenhaHash());
        assertEquals(1, usuarioRepository.findAll().stream()
                .filter(user -> user.getEmail().equals("existente@scaladatacenters.com")).count());
    }

    @Test
    void conviteDeveInicializarCredencialDeUsuarioLegadoSemRecriarConta() throws Exception {
        Session admin = registerAndLogin("Admin Legado", "admin-legado@example.com");
        long organizationId = createOrganization(admin, "Organização Legado");
        Usuario legacyAccount = usuarioRepository.saveAndFlush(Usuario.builder()
                .nome("Pessoa Legada")
                .email("legado@scaladatacenters.com")
                .perfil(PerfilUsuario.CONSULTA)
                .ativo(true)
                .build());

        invite(admin, organizationId, legacyAccount.getEmail(), "OPERADOR")
                .andExpect(status().isCreated());
        String token = tokenFor(legacyAccount.getEmail());
        mockMvc.perform(get("/api/onboarding/ativacao").param("token", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requerCriacaoConta").value(true));

        completeWithToken(token, "Nome não substituído", PASSWORD).andExpect(status().isOk());

        Usuario activatedAccount = usuarioRepository.findByEmailIgnoreCase(legacyAccount.getEmail())
                .orElseThrow();
        assertEquals(legacyAccount.getId(), activatedAccount.getId());
        assertEquals("Pessoa Legada", activatedAccount.getNome());
        assertNotNull(activatedAccount.getSenhaHash());
        assertEquals(StatusMembroOrganizacao.ATIVO, membroRepository
                .findByOrganizacaoIdAndUsuarioId(organizationId, legacyAccount.getId())
                .orElseThrow()
                .getStatus());
    }

    @Test
    void convitePendenteDeveSerIdempotenteDuranteCooldown() throws Exception {
        Session admin = registerAndLogin("Admin Idempotente", "admin-idempotente@example.com");
        long organizationId = createOrganization(admin, "Organização Idempotente");
        String email = "idempotente@scaladatacenters.com";

        long firstId = id(invite(admin, organizationId, email, "OPERADOR")
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        String firstUrl = emailSender.latestFor(email).orElseThrow().activationUrl();
        long secondId = id(invite(admin, organizationId, email, "CONSULTA")
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());

        assertEquals(firstId, secondId);
        assertEquals(firstUrl, emailSender.latestFor(email).orElseThrow().activationUrl());
        assertEquals(1, conviteRepository.findByOrganizacaoIdOrderByCriadoEmDescIdDesc(organizationId).size());
    }

    @Test
    void tokenDeveSerHasheadoEDeUsoUnico() throws Exception {
        Session admin = registerAndLogin("Admin Token", "admin-token@example.com");
        long organizationId = createOrganization(admin, "Organização Token");
        String email = "token@scaladatacenters.com";
        invite(admin, organizationId, email, "OPERADOR").andExpect(status().isCreated());
        String token = tokenFor(email);
        ConviteOnboarding invitation = conviteRepository
                .findByOrganizacaoIdOrderByCriadoEmDescIdDesc(organizationId).get(0);

        assertNotEquals(token, invitation.getTokenHash());
        assertFalse(invitation.getTokenHash().contains(token));
        completeWithToken(token, "Pessoa Token", PASSWORD).andExpect(status().isOk());
        completeWithToken(token, "Pessoa Token", PASSWORD)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("Link de ativação inválido ou indisponível."));
    }

    @Test
    void tokenDeUmConviteNaoDeveAceitarEmailDeOutroConvite() throws Exception {
        Session admin = registerAndLogin("Admin Isolamento Token", "admin-isolamento-token@example.com");
        long organizationId = createOrganization(admin, "Organização Isolamento Token");
        String firstEmail = "primeiro-token@scaladatacenters.com";
        String secondEmail = "segundo-token@scaladatacenters.com";
        invite(admin, organizationId, firstEmail, "OPERADOR").andExpect(status().isCreated());
        invite(admin, organizationId, secondEmail, "CONSULTA").andExpect(status().isCreated());

        mockMvc.perform(post("/api/onboarding/ativacao")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "token", tokenFor(firstEmail),
                                "email", secondEmail,
                                "nome", "Troca Indevida",
                                "senha", PASSWORD,
                                "confirmacaoSenha", PASSWORD
                        ))))
                .andExpect(status().isBadRequest());

        assertTrue(usuarioRepository.findByEmailIgnoreCase(firstEmail).isEmpty());
        assertTrue(usuarioRepository.findByEmailIgnoreCase(secondEmail).isEmpty());
        complete(firstEmail, "Primeira Pessoa", PASSWORD).andExpect(status().isOk());
        assertTrue(usuarioRepository.findByEmailIgnoreCase(firstEmail).isPresent());
        assertTrue(usuarioRepository.findByEmailIgnoreCase(secondEmail).isEmpty());
    }

    @Test
    void linkExpiradoDeveFalharSemCriarConta() throws Exception {
        Session admin = registerAndLogin("Admin Expiração", "admin-expiracao@example.com");
        long organizationId = createOrganization(admin, "Organização Expiração");
        String email = "expirado@scaladatacenters.com";
        invite(admin, organizationId, email, "CONSULTA").andExpect(status().isCreated());
        ConviteOnboarding invitation = conviteRepository
                .findByOrganizacaoIdOrderByCriadoEmDescIdDesc(organizationId).get(0);
        invitation.setExpiraEm(LocalDateTime.now().minusMinutes(1));
        conviteRepository.saveAndFlush(invitation);

        complete(email, "Pessoa Expirada", PASSWORD)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("Link de ativação inválido ou indisponível."));
        assertTrue(usuarioRepository.findByEmailIgnoreCase(email).isEmpty());
    }

    @Test
    void apenasAdminDaMesmaOrganizacaoPodeConvidarESemAutoelevacao() throws Exception {
        Session adminA = registerAndLogin("Admin A", "admin-a-convite@example.com");
        Session adminB = registerAndLogin("Admin B", "admin-b-convite@example.com");
        Session operator = registerAndLogin("Operador Convite", "operador-convite@example.com");
        long organizationA = createOrganization(adminA, "Organização A Convite");
        long organizationB = createOrganization(adminB, "Organização B Convite");
        long operatorMemberId = requestMembership(operator, organizationA);
        approveMember(adminA, organizationA, operatorMemberId, "OPERADOR");

        invite(adminA, organizationB, "cross@scaladatacenters.com", "OPERADOR")
                .andExpect(status().isForbidden());
        invite(operator, organizationA, "sem-permissao@scaladatacenters.com", "CONSULTA")
                .andExpect(status().isForbidden());
        invite(adminA, organizationA, "admin@scaladatacenters.com", "ADMIN")
                .andExpect(status().isBadRequest());
    }

    @Test
    void membroAtivoNaoDeveReceberNovoConvite() throws Exception {
        Session admin = registerAndLogin("Admin Membro Ativo", "admin-membro-ativo@example.com");
        Session target = registerAndLogin("Pessoa Ativa", "pessoa-ativa@scaladatacenters.com");
        long organizationId = createOrganization(admin, "Organização Membro Ativo");
        long memberId = requestMembership(target, organizationId);
        approveMember(admin, organizationId, memberId, "OPERADOR");

        invite(admin, organizationId, "pessoa-ativa@scaladatacenters.com", "CONSULTA")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("Esta pessoa já faz parte da equipe."));
        assertTrue(conviteRepository.findByOrganizacaoIdOrderByCriadoEmDescIdDesc(organizationId).isEmpty());
    }

    @Test
    void removidoSoDeveSerReativadoDepoisDaConfirmacao() throws Exception {
        Session admin = registerAndLogin("Admin Reativação", "admin-reativacao@example.com");
        Session target = registerAndLogin("Pessoa Reativada", "reativada@scaladatacenters.com");
        long organizationId = createOrganization(admin, "Organização Reativação");
        long memberId = requestMembership(target, organizationId);
        approveMember(admin, organizationId, memberId, "OPERADOR");
        mockMvc.perform(delete("/api/organizacoes/{organizationId}/membros/{memberId}", organizationId, memberId)
                        .header(AUTHORIZATION, bearer(admin)))
                .andExpect(status().isNoContent());

        invite(admin, organizationId, "reativada@scaladatacenters.com", "CONSULTA")
                .andExpect(status().isCreated());
        assertEquals(StatusMembroOrganizacao.REMOVIDO,
                membroRepository.findById(memberId).orElseThrow().getStatus());
        completeExisting("reativada@scaladatacenters.com").andExpect(status().isOk());
        assertEquals(StatusMembroOrganizacao.ATIVO,
                membroRepository.findById(memberId).orElseThrow().getStatus());
        assertEquals("CONSULTA", membroRepository.findById(memberId).orElseThrow().getPerfil().name());
    }

    @Test
    void bootstrapDeveExigirEmailConfiguradoECriarAdminUmaUnicaVez() throws Exception {
        mockMvc.perform(get("/api/onboarding/bootstrap/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.disponivel").value(true));
        mockMvc.perform(post("/api/onboarding/bootstrap")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", "outra-pessoa@example.test"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem")
                        .value("Não foi possível iniciar a ativação com os dados informados."));

        String email = "admin.bootstrap@example.test";
        mockMvc.perform(post("/api/onboarding/bootstrap")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email))))
                .andExpect(status().isAccepted());
        complete(email, "Administrador Inicial", PASSWORD).andExpect(status().isOk());

        var bootstrap = bootstrapRepository.findById((short) 1).orElseThrow();
        assertTrue(bootstrap.getConcluido());
        assertNotNull(bootstrap.getUsuario());
        OrganizacaoMembro admin = membroRepository.findByOrganizacaoIdAndUsuarioId(
                bootstrap.getOrganizacao().getId(), bootstrap.getUsuario().getId()).orElseThrow();
        assertEquals("ADMIN", admin.getPerfil().name());
        assertEquals(StatusMembroOrganizacao.ATIVO, admin.getStatus());
        mockMvc.perform(post("/api/onboarding/bootstrap")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void previewDeveDistinguirValidoUsadoEInvalidoSemExporToken() throws Exception {
        Session admin = registerAndLogin("Admin Preview", "admin-preview@example.com");
        long organizationId = createOrganization(admin, "Organização Preview");
        String email = "preview@scaladatacenters.com";
        invite(admin, organizationId, email, "OPERADOR").andExpect(status().isCreated());
        String token = tokenFor(email);

        mockMvc.perform(get("/api/onboarding/ativacao").param("token", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("VALIDO"))
                .andExpect(jsonPath("$.email").value("pr***@scaladatacenters.com"))
                .andExpect(jsonPath("$.requerCriacaoConta").value(true));
        mockMvc.perform(get("/api/onboarding/ativacao").param("token", "token-inexistente"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("INVALIDO"));
        completeWithToken(token, "Pessoa Preview", PASSWORD).andExpect(status().isOk());
        mockMvc.perform(get("/api/onboarding/ativacao").param("token", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("UTILIZADO"));
    }

    private ResultActions invite(Session executor, long organizationId, String email, String profile)
            throws Exception {
        return mockMvc.perform(post("/api/organizacoes/{organizationId}/convites", organizationId)
                .header(AUTHORIZATION, bearer(executor))
                .header(ORGANIZATION, organizationId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("email", email, "perfil", profile))));
    }

    private void approveMember(Session admin, long organizationId, long memberId, String profile)
            throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .put("/api/organizacoes/{organizationId}/solicitacoes/{memberId}/aprovacao",
                                organizationId, memberId)
                        .header(AUTHORIZATION, bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("perfil", profile))))
                .andExpect(status().isOk());
    }

    private ResultActions complete(String email, String name, String password) throws Exception {
        return completeWithToken(tokenFor(email), name, password);
    }

    private ResultActions completeExisting(String email) throws Exception {
        return mockMvc.perform(post("/api/onboarding/ativacao")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("token", tokenFor(email)))));
    }

    private ResultActions completeWithToken(String token, String name, String password) throws Exception {
        return mockMvc.perform(post("/api/onboarding/ativacao")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of(
                        "token", token,
                        "nome", name,
                        "senha", password,
                        "confirmacaoSenha", password
                ))));
    }

    private String tokenFor(String email) {
        URI uri = URI.create(emailSender.latestFor(email).orElseThrow().activationUrl());
        for (String pair : uri.getRawQuery().split("&")) {
            String[] parts = pair.split("=", 2);
            if (parts[0].equals("token")) {
                return URLDecoder.decode(parts[1], StandardCharsets.UTF_8);
            }
        }
        throw new IllegalStateException("Token ausente no link de teste");
    }
}
