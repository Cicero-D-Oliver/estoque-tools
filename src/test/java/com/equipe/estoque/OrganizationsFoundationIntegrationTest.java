package com.equipe.estoque;

import com.equipe.estoque.entity.Organizacao;
import com.equipe.estoque.entity.OrganizacaoMembro;
import com.equipe.estoque.entity.Usuario;
import com.equipe.estoque.enums.PerfilMembroOrganizacao;
import com.equipe.estoque.enums.PerfilUsuario;
import com.equipe.estoque.enums.StatusMembroOrganizacao;
import com.equipe.estoque.exception.BusinessException;
import com.equipe.estoque.exception.ResourceNotFoundException;
import com.equipe.estoque.repository.OrganizacaoMembroRepository;
import com.equipe.estoque.repository.OrganizacaoRepository;
import com.equipe.estoque.repository.UsuarioRepository;
import com.equipe.estoque.service.OrganizacaoService;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class OrganizationsFoundationIntegrationTest {

    @Autowired
    private Flyway flyway;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private OrganizacaoRepository organizacaoRepository;

    @Autowired
    private OrganizacaoMembroRepository membroRepository;

    @Autowired
    private OrganizacaoService organizacaoService;

    @Test
    void deveCriarTabelasDaFundacaoPelaV3() {
        assertEquals("3", flyway.info().current().getVersion().toString());
        assertEquals(2, jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                  FROM sqlite_schema
                 WHERE type = 'table'
                   AND name IN ('organizacoes', 'organizacao_membros')
                """, Integer.class));
        assertEquals(List.of("1", "2", "3"), jdbcTemplate.queryForList("""
                SELECT version
                  FROM flyway_schema_history
                 WHERE version IS NOT NULL
                 ORDER BY installed_rank
                """, String.class));
    }

    @Test
    void devePermitirUsuarioEmDuasOrganizacoesComPerfisDiferentes() {
        Usuario criador = criarUsuario("Criador", "criador-multiorg@example.com");
        Usuario membro = criarUsuario("Membro", "membro-multiorg@example.com");
        Organizacao primeira = organizacaoService.criar("Primeira Organização", criador.getId());
        Organizacao segunda = organizacaoService.criar("Segunda Organização", criador.getId());

        membroRepository.save(criarMembro(primeira, membro, PerfilMembroOrganizacao.OPERADOR));
        membroRepository.save(criarMembro(segunda, membro, PerfilMembroOrganizacao.CONSULTA));
        membroRepository.flush();

        List<OrganizacaoMembro> vinculos =
                membroRepository.findByUsuarioIdOrderByOrganizacaoId(membro.getId());
        assertEquals(2, vinculos.size());
        assertEquals(PerfilMembroOrganizacao.OPERADOR, vinculos.get(0).getPerfil());
        assertEquals(PerfilMembroOrganizacao.CONSULTA, vinculos.get(1).getPerfil());
    }

    @Test
    void deveRejeitarVinculoDuplicadoNaMesmaOrganizacao() {
        Usuario criador = criarUsuario("Criador", "criador-duplicado@example.com");
        Usuario membro = criarUsuario("Membro", "membro-duplicado@example.com");
        Organizacao organizacao = organizacaoService.criar("Organização Única", criador.getId());
        membroRepository.saveAndFlush(
                criarMembro(organizacao, membro, PerfilMembroOrganizacao.OPERADOR)
        );

        assertThrows(
                DataAccessException.class,
                () -> membroRepository.saveAndFlush(
                        criarMembro(organizacao, membro, PerfilMembroOrganizacao.CONSULTA)
                )
        );
    }

    @Test
    void deveCriarOrganizacaoComCriadorAdminAtivoNaMesmaTransacao() {
        Usuario criador = criarUsuario("Administrador", "admin-organizacao@example.com");

        Organizacao organizacao = organizacaoService.criar("  Almoxarifado Central  ", criador.getId());
        OrganizacaoMembro vinculo = membroRepository
                .findByOrganizacaoIdAndUsuarioId(organizacao.getId(), criador.getId())
                .orElseThrow();

        assertNotNull(organizacao.getId());
        assertEquals("Almoxarifado Central", organizacao.getNome());
        assertTrue(organizacao.getAtiva());
        assertEquals(PerfilMembroOrganizacao.ADMIN, vinculo.getPerfil());
        assertEquals(StatusMembroOrganizacao.ATIVO, vinculo.getStatus());
        assertEquals(criador.getId(), vinculo.getAprovadoPorUsuario().getId());
        assertNotNull(vinculo.getAprovadoEm());
    }

    @Test
    void deveRejeitarDadosInvalidosSemCriarOrganizacao() {
        Usuario usuario = criarUsuario("Criador", "criador-invalido@example.com");

        assertThrows(BusinessException.class, () -> organizacaoService.criar(null, usuario.getId()));
        assertThrows(BusinessException.class, () -> organizacaoService.criar("   ", usuario.getId()));
        assertThrows(BusinessException.class, () -> organizacaoService.criar("A".repeat(121), usuario.getId()));
        assertThrows(
                ResourceNotFoundException.class,
                () -> organizacaoService.criar("Organização", 999_999L)
        );

        usuario.setAtivo(false);
        usuarioRepository.saveAndFlush(usuario);
        assertThrows(
                BusinessException.class,
                () -> organizacaoService.criar("Organização", usuario.getId())
        );
        assertEquals(0, organizacaoRepository.count());
    }

    private Usuario criarUsuario(String nome, String email) {
        return usuarioRepository.saveAndFlush(Usuario.builder()
                .nome(nome)
                .email(email)
                .perfil(PerfilUsuario.OPERADOR)
                .ativo(true)
                .build());
    }

    private OrganizacaoMembro criarMembro(
            Organizacao organizacao,
            Usuario usuario,
            PerfilMembroOrganizacao perfil
    ) {
        LocalDateTime agora = LocalDateTime.now();
        return OrganizacaoMembro.builder()
                .organizacao(organizacao)
                .usuario(usuario)
                .perfil(perfil)
                .status(StatusMembroOrganizacao.ATIVO)
                .solicitadoEm(agora)
                .aprovadoEm(agora)
                .aprovadoPorUsuario(organizacao.getCriadaPorUsuario())
                .build();
    }
}
