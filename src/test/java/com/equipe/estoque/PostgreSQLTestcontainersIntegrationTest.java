package com.equipe.estoque;

import com.equipe.estoque.dto.usuario.UsuarioRequestDTO;
import com.equipe.estoque.dto.usuario.UsuarioResponseDTO;
import com.equipe.estoque.entity.Organizacao;
import com.equipe.estoque.entity.OrganizacaoMembro;
import com.equipe.estoque.enums.PerfilMembroOrganizacao;
import com.equipe.estoque.enums.PerfilUsuario;
import com.equipe.estoque.enums.StatusMembroOrganizacao;
import com.equipe.estoque.repository.OrganizacaoMembroRepository;
import com.equipe.estoque.service.OrganizacaoService;
import com.equipe.estoque.service.UsuarioService;
import jakarta.persistence.EntityManagerFactory;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("postgresql")
@Testcontainers
class PostgreSQLTestcontainersIntegrationTest {

    private static final Logger LOGGER =
            LoggerFactory.getLogger(PostgreSQLTestcontainersIntegrationTest.class);

    @Container
    private static final PostgreSQLContainer<?> POSTGRESQL =
            new PostgreSQLContainer<>(DockerImageName.parse("postgres:17-alpine"))
                    .withDatabaseName("estoque_test")
                    .withUsername("estoque_test")
                    .withPassword("estoque_test");

    @DynamicPropertySource
    static void configurePostgresql(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRESQL::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRESQL::getUsername);
        registry.add("spring.datasource.password", POSTGRESQL::getPassword);
    }

    @Autowired
    private Flyway flyway;

    @Autowired
    private Environment environment;

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private UsuarioService usuarioService;

    @Autowired
    private OrganizacaoService organizacaoService;

    @Autowired
    private OrganizacaoMembroRepository membroRepository;

    @Test
    void deveValidarAplicacaoComPostgresqlReal() {
        assertTrue(POSTGRESQL.isRunning());
        assertEquals("validate", environment.getProperty("spring.jpa.hibernate.ddl-auto"));
        assertTrue(entityManagerFactory.isOpen());

        List<Map<String, Object>> migrations = jdbcTemplate.queryForList("""
                SELECT version, description, checksum, success
                  FROM flyway_schema_history
                 WHERE version IS NOT NULL
                 ORDER BY installed_rank
                """);
        assertEquals(List.of("1", "2", "3"), migrations.stream()
                .map(migration -> migration.get("version").toString())
                .toList());
        assertTrue(migrations.stream()
                .allMatch(migration -> Boolean.TRUE.equals(migration.get("success"))));
        assertEquals("3", flyway.info().current().getVersion().toString());
        assertEquals(2, jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                  FROM information_schema.tables
                 WHERE table_schema = 'public'
                   AND table_name IN ('organizacoes', 'organizacao_membros')
                """, Integer.class));
        assertEquals(6, jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                  FROM information_schema.table_constraints
                 WHERE table_schema = 'public'
                   AND constraint_name IN (
                       'uk_organizacao_membros_organizacao_usuario',
                       'ck_organizacao_membros_perfil',
                       'ck_organizacao_membros_status',
                       'fk_organizacao_membros_organizacao',
                       'fk_organizacao_membros_usuario',
                       'fk_organizacao_membros_aprovado_por'
                   )
                """, Integer.class));

        String serverVersion = jdbcTemplate.queryForObject("SHOW server_version", String.class);
        assertNotNull(serverVersion);
        assertTrue(serverVersion.startsWith("17."));

        UsuarioRequestDTO request = new UsuarioRequestDTO();
        request.setNome("Integração PostgreSQL");
        request.setEmail("postgresql-testcontainers@example.com");
        request.setPerfil(PerfilUsuario.OPERADOR);

        UsuarioResponseDTO created = usuarioService.criar(request);
        assertNotNull(created.getId());
        assertEquals(created.getEmail(), usuarioService.buscarPorId(created.getId()).getEmail());
        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM usuarios WHERE email = ?",
                Integer.class,
                created.getEmail()
        ));

        Organizacao organizacao = organizacaoService.criar(
                "Organização PostgreSQL",
                created.getId()
        );
        OrganizacaoMembro vinculo = membroRepository
                .findByOrganizacaoIdAndUsuarioId(organizacao.getId(), created.getId())
                .orElseThrow();
        assertEquals(PerfilMembroOrganizacao.ADMIN, vinculo.getPerfil());
        assertEquals(StatusMembroOrganizacao.ATIVO, vinculo.getStatus());
        assertThrows(DataAccessException.class, () -> jdbcTemplate.update("""
                INSERT INTO organizacao_membros (
                    organizacao_id, usuario_id, perfil, status, solicitado_em
                ) VALUES (?, ?, 'CONSULTA', 'ATIVO', CURRENT_TIMESTAMP)
                """, organizacao.getId(), created.getId()));

        LOGGER.info(
                "PostgreSQL Testcontainers validado image={} serverVersion={} migrations={}",
                POSTGRESQL.getDockerImageName(),
                serverVersion,
                migrations.stream().map(migration -> migration.get("version")).toList()
        );
    }
}
