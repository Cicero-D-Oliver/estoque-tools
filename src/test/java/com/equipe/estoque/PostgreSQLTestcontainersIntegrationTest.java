package com.equipe.estoque;

import com.equipe.estoque.dto.ferramenta.FerramentaRequestDTO;
import com.equipe.estoque.dto.auth.AccessTokenResponseDTO;
import com.equipe.estoque.dto.auth.RegisterRequestDTO;
import com.equipe.estoque.dto.item.ItemEstoqueRequestDTO;
import com.equipe.estoque.dto.movimentacao.MovimentacaoEstoqueRequestDTO;
import com.equipe.estoque.dto.movimentacao.MovimentacaoFerramentaRequestDTO;
import com.equipe.estoque.dto.movimentacao.MovimentacaoFerramentaResponseDTO;
import com.equipe.estoque.dto.usuario.UsuarioRequestDTO;
import com.equipe.estoque.dto.usuario.UsuarioResponseDTO;
import com.equipe.estoque.entity.Ferramenta;
import com.equipe.estoque.entity.ItemEstoque;
import com.equipe.estoque.entity.Organizacao;
import com.equipe.estoque.entity.OrganizacaoMembro;
import com.equipe.estoque.entity.Usuario;
import com.equipe.estoque.enums.PerfilMembroOrganizacao;
import com.equipe.estoque.enums.PerfilUsuario;
import com.equipe.estoque.enums.StatusMembroOrganizacao;
import com.equipe.estoque.enums.StatusRevisaoMovimentacao;
import com.equipe.estoque.enums.TipoMovimentacaoFerramenta;
import com.equipe.estoque.exception.BusinessException;
import com.equipe.estoque.exception.ResourceNotFoundException;
import com.equipe.estoque.repository.FerramentaRepository;
import com.equipe.estoque.repository.ItemEstoqueRepository;
import com.equipe.estoque.repository.OrganizacaoMembroRepository;
import com.equipe.estoque.repository.UsuarioRepository;
import com.equipe.estoque.service.AuthService;
import com.equipe.estoque.service.AuthSessionService;
import com.equipe.estoque.service.FerramentaService;
import com.equipe.estoque.service.ItemEstoqueService;
import com.equipe.estoque.service.MovimentacaoFerramentaService;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.util.List;
import java.util.Map;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
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
        registry.add("app.security.jwt-secret",
                () -> "dGVzdC1vbmx5LWp3dC1zaWduaW5nLWtleS0zMi1iISE=");
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

    @Autowired
    private ItemEstoqueRepository itemEstoqueRepository;

    @Autowired
    private FerramentaRepository ferramentaRepository;

    @Autowired
    private ItemEstoqueService itemEstoqueService;

    @Autowired
    private FerramentaService ferramentaService;

    @Autowired
    private MovimentacaoFerramentaService movimentacaoFerramentaService;

    @Autowired
    private AuthService authService;

    @Autowired
    private AuthSessionService authSessionService;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private PlatformTransactionManager transactionManager;

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
        assertEquals(List.of("1", "2", "3", "4", "5", "6", "7", "8"), migrations.stream()
                .map(migration -> migration.get("version").toString())
                .toList());
        assertTrue(migrations.stream()
                .allMatch(migration -> Boolean.TRUE.equals(migration.get("success"))));
        assertEquals("8", flyway.info().current().getVersion().toString());
        assertEquals(2, jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                  FROM information_schema.tables
                 WHERE table_schema = 'public'
                   AND table_name IN ('refresh_tokens', 'tokens_recuperacao_senha')
                """, Integer.class));
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
        assertEquals(10, jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                  FROM information_schema.table_constraints
                 WHERE table_schema = 'public'
                   AND constraint_name IN (
                       'uk_itens_estoque_organizacao_codigo',
                       'uk_itens_estoque_organizacao_id',
                       'fk_itens_estoque_organizacao',
                       'uk_ferramentas_organizacao_patrimonio',
                       'uk_ferramentas_organizacao_id',
                       'fk_ferramentas_organizacao',
                       'fk_mov_estoque_organizacao',
                       'fk_mov_estoque_item_organizacao',
                       'fk_mov_ferramenta_organizacao',
                       'fk_mov_ferramenta_ferramenta_organizacao'
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

    @Test
    void deveIsolarOperacoesEUnicidadesPorOrganizacaoNoPostgresql() {
        UsuarioResponseDTO usuario = criarUsuario(
                "Isolamento PostgreSQL",
                "isolamento-postgresql@example.com"
        );
        Organizacao organizacaoA = organizacaoService.criar("PostgreSQL A", usuario.getId());
        Organizacao organizacaoB = organizacaoService.criar("PostgreSQL B", usuario.getId());

        Long itemAId = itemEstoqueService.criar(
                organizacaoA.getId(), itemRequest("CODIGO-COMPARTILHADO")
        ).getId();
        Long itemBId = itemEstoqueService.criar(
                organizacaoB.getId(), itemRequest("CODIGO-COMPARTILHADO")
        ).getId();
        Long ferramentaAId = ferramentaService.criar(
                organizacaoA.getId(), ferramentaRequest("PATRIMONIO-COMPARTILHADO")
        ).getId();
        Long ferramentaBId = ferramentaService.criar(
                organizacaoB.getId(), ferramentaRequest("PATRIMONIO-COMPARTILHADO")
        ).getId();

        assertEquals(List.of(itemAId), itemEstoqueService.listarTodos(organizacaoA.getId())
                .stream().map(item -> item.getId()).toList());
        assertEquals(List.of(itemBId), itemEstoqueService.listarTodos(organizacaoB.getId())
                .stream().map(item -> item.getId()).toList());
        assertEquals(List.of(ferramentaAId), ferramentaService.listarTodas(organizacaoA.getId())
                .stream().map(ferramenta -> ferramenta.getId()).toList());
        assertEquals(List.of(ferramentaBId), ferramentaService.listarTodas(organizacaoB.getId())
                .stream().map(ferramenta -> ferramenta.getId()).toList());

        assertThrows(
                ResourceNotFoundException.class,
                () -> itemEstoqueService.buscarPorId(organizacaoB.getId(), itemAId)
        );
        assertThrows(
                ResourceNotFoundException.class,
                () -> ferramentaService.buscarPorId(organizacaoB.getId(), ferramentaAId)
        );
        assertThrows(
                BusinessException.class,
                () -> itemEstoqueService.criar(
                        organizacaoA.getId(), itemRequest("CODIGO-COMPARTILHADO")
                )
        );
        assertThrows(
                BusinessException.class,
                () -> ferramentaService.criar(
                        organizacaoA.getId(), ferramentaRequest("PATRIMONIO-COMPARTILHADO")
                )
        );

        MovimentacaoEstoqueRequestDTO estoqueRequest = new MovimentacaoEstoqueRequestDTO();
        estoqueRequest.setQuantidade(1);
        estoqueRequest.setObservacao("Operação válida");
        itemEstoqueService.registrarEntrada(
                organizacaoA.getId(), itemAId, usuario.getId(), estoqueRequest);
        assertThrows(
                ResourceNotFoundException.class,
                () -> itemEstoqueService.registrarEntrada(
                        organizacaoB.getId(), itemAId, usuario.getId(), estoqueRequest
                )
        );

        MovimentacaoFerramentaRequestDTO ferramentaMovimento =
                new MovimentacaoFerramentaRequestDTO();
        ferramentaMovimento.setObservacao("Operação válida");
        ferramentaService.registrarRetirada(
                organizacaoA.getId(), ferramentaAId, usuario.getId(), ferramentaMovimento
        );
        assertThrows(
                ResourceNotFoundException.class,
                () -> ferramentaService.registrarRetirada(
                        organizacaoB.getId(), ferramentaAId, usuario.getId(), ferramentaMovimento
                )
        );

        ItemEstoque itemA = itemEstoqueRepository
                .findByIdAndOrganizacaoId(itemAId, organizacaoA.getId()).orElseThrow();
        Ferramenta ferramentaA = ferramentaRepository
                .findByIdAndOrganizacaoId(ferramentaAId, organizacaoA.getId()).orElseThrow();
        assertEquals(organizacaoA.getId(), itemA.getOrganizacao().getId());
        assertEquals(organizacaoA.getId(), ferramentaA.getOrganizacao().getId());
    }

    @Test
    void deveRejeitarRelacoesCruzadasPelasConstraintsDoPostgresql() {
        UsuarioResponseDTO usuario = criarUsuario(
                "Constraints PostgreSQL",
                "constraints-postgresql@example.com"
        );
        Organizacao organizacaoA = organizacaoService.criar("Constraints A", usuario.getId());
        Organizacao organizacaoB = organizacaoService.criar("Constraints B", usuario.getId());
        Long itemAId = itemEstoqueService.criar(
                organizacaoA.getId(), itemRequest("CONSTRAINT-ITEM")
        ).getId();
        Long ferramentaAId = ferramentaService.criar(
                organizacaoA.getId(), ferramentaRequest("CONSTRAINT-PAT")
        ).getId();

        assertThrows(DataAccessException.class, () -> jdbcTemplate.update("""
                INSERT INTO movimentacoes_estoque (
                    organizacao_id, item_estoque_id, usuario_id,
                    tipo_movimentacao, quantidade, data_hora
                ) VALUES (?, ?, ?, 'ENTRADA', 1, CURRENT_TIMESTAMP)
                """, organizacaoB.getId(), itemAId, usuario.getId()));
        assertThrows(DataAccessException.class, () -> jdbcTemplate.update("""
                INSERT INTO movimentacoes_ferramenta (
                    organizacao_id, ferramenta_id, usuario_id,
                    tipo_movimentacao, data_hora
                ) VALUES (?, ?, ?, 'MANUTENCAO', CURRENT_TIMESTAMP)
                """, organizacaoB.getId(), ferramentaAId, usuario.getId()));
        assertThrows(DataAccessException.class, () -> jdbcTemplate.update("""
                INSERT INTO itens_estoque (
                    organizacao_id, codigo, nome, quantidade_atual,
                    quantidade_minima, ativo
                ) VALUES (?, 'CONSTRAINT-ITEM', 'Duplicado', 0, 0, TRUE)
                """, organizacaoA.getId()));
        assertThrows(DataAccessException.class, () -> jdbcTemplate.update("""
                INSERT INTO ferramentas (
                    organizacao_id, patrimonio, nome, status, ativo
                ) VALUES (?, 'CONSTRAINT-PAT', 'Duplicada', 'DISPONIVEL', TRUE)
                """, organizacaoA.getId()));
    }

    @Test
    void deveValidarCredencialHashETokenNoPostgresqlReal() {
        RegisterRequestDTO request = new RegisterRequestDTO();
        request.setNome("Conta PostgreSQL Segura");
        request.setEmail("conta-segura-postgresql@example.com");
        request.setSenha("SenhaPostgreSQL!2026");
        Long accountId = authService.register(request).getId();

        var login = new com.equipe.estoque.dto.auth.LoginRequestDTO();
        login.setEmail(request.getEmail());
        login.setSenha(request.getSenha());
        AccessTokenResponseDTO token = authService.login(login);
        String hash = usuarioRepository.findById(accountId).orElseThrow().getSenhaHash();

        assertNotNull(token.getAccessToken());
        assertNotNull(token.getRefreshToken());
        assertTrue(token.getExpiresIn() > 0);
        assertTrue(hash.startsWith("$2"));
        assertTrue(passwordEncoder.matches(request.getSenha(), hash));
        assertEquals(1, jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM usuarios
                 WHERE id = ? AND senha_hash IS NOT NULL AND senha_alterada_em IS NOT NULL
                """, Integer.class, accountId));
    }

    @Test
    void deveArmazenarSomenteHashERotacionarRefreshNoPostgresqlReal() {
        RegisterRequestDTO request = new RegisterRequestDTO();
        request.setNome("Sessão PostgreSQL");
        request.setEmail("sessao-postgresql@example.com");
        request.setSenha("SenhaPostgreSQL!2026");
        Long accountId = authService.register(request).getId();

        var login = new com.equipe.estoque.dto.auth.LoginRequestDTO();
        login.setEmail(request.getEmail());
        login.setSenha(request.getSenha());
        AccessTokenResponseDTO first = authService.login(login);
        String storedHash = jdbcTemplate.queryForObject(
                "SELECT token_hash FROM refresh_tokens WHERE usuario_id = ?",
                String.class,
                accountId
        );

        assertNotNull(storedHash);
        assertEquals(64, storedHash.length());
        assertNotEquals(first.getRefreshToken(), storedHash);

        AccessTokenResponseDTO rotated = authSessionService.refresh(first.getRefreshToken());

        assertNotEquals(first.getRefreshToken(), rotated.getRefreshToken());
        assertEquals(2, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM refresh_tokens WHERE usuario_id = ?",
                Integer.class,
                accountId
        ));
        assertEquals(1, jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM refresh_tokens
                 WHERE usuario_id = ?
                   AND revogado_em IS NOT NULL
                   AND motivo_revogacao = 'ROTACIONADO'
                   AND substituido_por_id IS NOT NULL
                """, Integer.class, accountId));
        assertEquals(1, jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM refresh_tokens
                 WHERE usuario_id = ? AND revogado_em IS NULL
                """, Integer.class, accountId));
    }

    @Test
    void deveExecutarTransferenciaEConfirmacaoNoPostgresqlReal() {
        String suffix = Long.toString(System.nanoTime());
        UsuarioResponseDTO admin = criarUsuario(
                "Admin Operacional PostgreSQL",
                "admin-operacional-" + suffix + "@example.com"
        );
        UsuarioResponseDTO operator = criarUsuario(
                "Operador Origem PostgreSQL",
                "operador-origem-" + suffix + "@example.com"
        );
        UsuarioResponseDTO target = criarUsuario(
                "Operador Destino PostgreSQL",
                "operador-destino-" + suffix + "@example.com"
        );
        Organizacao organization = organizacaoService.criar(
                "Fluxo PostgreSQL " + suffix,
                admin.getId()
        );
        Usuario adminEntity = usuarioRepository.findById(admin.getId()).orElseThrow();
        saveActiveOperator(organization, operator.getId(), adminEntity);
        saveActiveOperator(organization, target.getId(), adminEntity);
        Long toolId = ferramentaService.criar(
                organization.getId(),
                ferramentaRequest("PG-OPERACIONAL-" + suffix)
        ).getId();
        MovimentacaoFerramentaRequestDTO withdrawal = new MovimentacaoFerramentaRequestDTO();
        withdrawal.setDestino("Linha PostgreSQL");
        MovimentacaoFerramentaResponseDTO first = ferramentaService.registrarRetirada(
                organization.getId(), toolId, operator.getId(), withdrawal
        );
        MovimentacaoFerramentaRequestDTO transfer = new MovimentacaoFerramentaRequestDTO();
        transfer.setNovoResponsavelUsuarioId(target.getId());
        transfer.setObservacao("Transferência validada no PostgreSQL");

        MovimentacaoFerramentaResponseDTO transferred = ferramentaService.registrarTransferencia(
                organization.getId(), toolId, operator.getId(), transfer
        );
        MovimentacaoFerramentaResponseDTO confirmed = movimentacaoFerramentaService.confirmar(
                organization.getId(), transferred.getId(), admin.getId()
        );
        MovimentacaoFerramentaResponseDTO maintenance = ferramentaService.registrarManutencao(
                organization.getId(), toolId, target.getId(), new MovimentacaoFerramentaRequestDTO()
        );
        MovimentacaoFerramentaResponseDTO completion = ferramentaService.registrarConclusaoManutencao(
                organization.getId(), toolId, target.getId(), new MovimentacaoFerramentaRequestDTO()
        );

        assertEquals(StatusRevisaoMovimentacao.PENDENTE, first.getStatusRevisao());
        assertEquals(operator.getId(), transferred.getResponsavelAnteriorUsuarioId());
        assertEquals(target.getId(), transferred.getResponsavelUsuarioId());
        assertEquals(StatusRevisaoMovimentacao.CONFIRMADA, confirmed.getStatusRevisao());
        Ferramenta tool = ferramentaRepository.findById(toolId).orElseThrow();
        assertEquals(TipoMovimentacaoFerramenta.MANUTENCAO, maintenance.getTipoMovimentacao());
        assertEquals(TipoMovimentacaoFerramenta.CONCLUSAO_MANUTENCAO, completion.getTipoMovimentacao());
        assertEquals(com.equipe.estoque.enums.StatusFerramenta.DISPONIVEL, tool.getStatus());
        assertEquals(null, tool.getResponsavelAtual());
        assertEquals(null, tool.getDestinoAtual());
    }

    @Test
    void deveImpedirDuasRetiradasConcorrentesNoPostgresqlReal() throws Exception {
        String suffix = UUID.randomUUID().toString();
        UsuarioResponseDTO admin = criarUsuario(
                "Admin concorrência PostgreSQL",
                "admin-concorrencia-pg-" + suffix + "@example.com"
        );
        UsuarioResponseDTO firstOperator = criarUsuario(
                "Operador concorrente PostgreSQL 1",
                "operador-concorrencia-pg-1-" + suffix + "@example.com"
        );
        UsuarioResponseDTO secondOperator = criarUsuario(
                "Operador concorrente PostgreSQL 2",
                "operador-concorrencia-pg-2-" + suffix + "@example.com"
        );
        Organizacao organization = organizacaoService.criar(
                "Concorrência PostgreSQL " + suffix,
                admin.getId()
        );
        Usuario adminEntity = usuarioRepository.findById(admin.getId()).orElseThrow();
        saveActiveOperator(organization, firstOperator.getId(), adminEntity);
        saveActiveOperator(organization, secondOperator.getId(), adminEntity);
        Long toolId = ferramentaService.criar(
                organization.getId(),
                ferramentaRequest("PG-CONCORRENTE-" + suffix)
        ).getId();
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<Boolean> first = executor.submit(() -> attemptPostgresqlWithdrawal(
                    organization.getId(), toolId, firstOperator.getId(), ready, start
            ));
            Future<Boolean> second = executor.submit(() -> attemptPostgresqlWithdrawal(
                    organization.getId(), toolId, secondOperator.getId(), ready, start
            ));
            ready.await();
            start.countDown();

            assertEquals(1, (first.get() ? 1 : 0) + (second.get() ? 1 : 0));
        } finally {
            executor.shutdownNow();
        }

        Ferramenta tool = ferramentaRepository.findById(toolId).orElseThrow();
        assertNotNull(tool.getResponsavelAtual());
        assertEquals(1, jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM movimentacoes_ferramenta
                 WHERE organizacao_id = ?
                   AND ferramenta_id = ?
                   AND tipo_movimentacao = 'RETIRADA'
                """, Integer.class, organization.getId(), toolId));
    }

    @Test
    void deveMigrarSchemaPostgresqlPopuladoDeV4ParaV5SemInventarCredencial() throws Exception {
        String schema = "legacy_v4_to_v5";
        flywayForSchema(schema, "4").migrate();
        try (Connection connection = legacyConnection(schema);
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO usuarios (id, nome, email, perfil, ativo, versao)
                    VALUES (701, 'Legado V4', 'legado-v5@example.com', 'CONSULTA', TRUE, 9)
                    """);
        }

        flywayForSchema(schema, null).migrate();
        try (Connection connection = legacyConnection(schema);
             Statement statement = connection.createStatement()) {
            assertEquals(1, scalar(statement, "SELECT COUNT(*) FROM usuarios WHERE id = 701"));
            assertEquals(9, scalar(statement, "SELECT versao FROM usuarios WHERE id = 701"));
            assertEquals(1, scalar(statement, """
                    SELECT COUNT(*) FROM usuarios
                     WHERE id = 701
                       AND senha_hash IS NULL
                       AND senha_alterada_em IS NULL
                       AND ultimo_login_em IS NULL
                    """));
            assertEquals(List.of("1", "2", "3", "4", "5", "6", "7", "8"), historyVersions(statement));
        }
    }

    @Test
    void deveMigrarSchemaPostgresqlPopuladoDeV5AteV8SemPerderCredencial() throws Exception {
        String schema = "legacy_v5_to_v6";
        flywayForSchema(schema, "5").migrate();
        try (Connection connection = legacyConnection(schema);
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO usuarios (
                        id, nome, email, perfil, ativo, versao,
                        senha_hash, senha_alterada_em, ultimo_login_em
                    ) VALUES (
                        801, 'Legado V5', 'legado-v6@example.com', 'OPERADOR', TRUE, 11,
                        '$2a$12$01234567890123456789012345678901234567890123456789012',
                        TIMESTAMP '2026-08-03 10:00:00', TIMESTAMP '2026-08-04 11:00:00'
                    )
                    """);
        }

        flywayForSchema(schema, null).migrate();

        try (Connection connection = legacyConnection(schema);
             Statement statement = connection.createStatement()) {
            assertEquals(1, scalar(statement, """
                    SELECT COUNT(*) FROM usuarios
                     WHERE id = 801
                       AND versao = 11
                       AND senha_hash = '$2a$12$01234567890123456789012345678901234567890123456789012'
                       AND senha_alterada_em = TIMESTAMP '2026-08-03 10:00:00'
                       AND ultimo_login_em = TIMESTAMP '2026-08-04 11:00:00'
                       AND token_version = 0
                       AND tentativas_login_falhas = 0
                       AND login_bloqueado_ate IS NULL
                       AND ultima_falha_login_em IS NULL
                    """));
            assertEquals(0, scalar(statement, "SELECT COUNT(*) FROM refresh_tokens"));
            assertEquals(0, scalar(statement, "SELECT COUNT(*) FROM tokens_recuperacao_senha"));
            assertEquals(List.of("1", "2", "3", "4", "5", "6", "7", "8"), historyVersions(statement));
        }
    }

    @Test
    void deveMigrarSchemaOperacionalPopuladoDeV6AteV8SemPerderHistorico() throws Exception {
        String schema = "legacy_v6_to_v7_tool";
        flywayForSchema(schema, "6").migrate();
        try (Connection connection = legacyConnection(schema);
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO usuarios (
                        id, nome, email, perfil, ativo, versao,
                        token_version, tentativas_login_falhas
                    ) VALUES (
                        1101, 'Operador V6', 'operador-pg-v6@example.com',
                        'OPERADOR', TRUE, 3, 0, 0
                    )
                    """);
            statement.executeUpdate("""
                    INSERT INTO organizacoes (
                        id, versao, nome, ativa, criada_em, criada_por_usuario_id
                    ) VALUES (
                        1102, 0, 'Organização PG V6', TRUE,
                        TIMESTAMP '2026-08-20 08:00:00', 1101
                    )
                    """);
            statement.executeUpdate("""
                    INSERT INTO organizacao_membros (
                        id, versao, organizacao_id, usuario_id, perfil, status,
                        solicitado_em, aprovado_em, aprovado_por_usuario_id
                    ) VALUES (
                        1103, 0, 1102, 1101, 'OPERADOR', 'ATIVO',
                        TIMESTAMP '2026-08-20 08:00:00',
                        TIMESTAMP '2026-08-20 08:00:00', 1101
                    )
                    """);
            statement.executeUpdate("""
                    INSERT INTO ferramentas (
                        id, versao, organizacao_id, patrimonio, nome, categoria,
                        status, responsavel_atual_id, localizacao, ativo
                    ) VALUES (
                        1104, 7, 1102, 'LEGADO-PG-V6', 'Ferramenta PG V6', 'Teste',
                        'EMPRESTADA', 1101, 'Armário PG', TRUE
                    )
                    """);
            statement.executeUpdate("""
                    INSERT INTO movimentacoes_ferramenta (
                        id, organizacao_id, ferramenta_id, usuario_id,
                        tipo_movimentacao, data_hora, observacao
                    ) VALUES (
                        1105, 1102, 1104, 1101, 'RETIRADA',
                        TIMESTAMP '2026-08-20 09:30:00', 'Histórico PG V6'
                    )
                    """);
        }

        flywayForSchema(schema, null).migrate();

        try (Connection connection = legacyConnection(schema);
             Statement statement = connection.createStatement()) {
            assertEquals(1, scalar(statement, """
                    SELECT COUNT(*) FROM ferramentas
                     WHERE id = 1104
                       AND versao = 7
                       AND responsavel_atual_id = 1101
                       AND responsavel_desde = TIMESTAMP '2026-08-20 09:30:00'
                       AND destino_atual IS NULL
                    """));
            assertEquals(1, scalar(statement, """
                    SELECT COUNT(*) FROM movimentacoes_ferramenta
                     WHERE id = 1105
                       AND responsavel_usuario_id = 1101
                       AND status_revisao = 'CONFIRMADA'
                       AND confirmado_por_usuario_id IS NULL
                       AND confirmado_em IS NULL
                    """));
            assertEquals(List.of("1", "2", "3", "4", "5", "6", "7", "8"), historyVersions(statement));
        }
    }

    @Test
    void deveMigrarSchemaPostgresqlPopuladoDeV7ParaV8PreservandoDadosEConstraint() throws Exception {
        String schema = "legacy_v7_to_v8_tool";
        flywayForSchema(schema, "7").migrate();
        try (Connection connection = legacyConnection(schema);
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO usuarios (
                        id, nome, email, perfil, ativo, versao,
                        token_version, tentativas_login_falhas
                    ) VALUES (1201, 'Operador PG V7', 'operador-pg-v7@example.com',
                              'OPERADOR', TRUE, 4, 0, 0)
                    """);
            statement.executeUpdate("""
                    INSERT INTO organizacoes (
                        id, versao, nome, ativa, criada_em, criada_por_usuario_id
                    ) VALUES (1202, 2, 'Organização PG V7', TRUE,
                              TIMESTAMP '2026-08-25 08:00:00', 1201)
                    """);
            statement.executeUpdate("""
                    INSERT INTO organizacao_membros (
                        id, versao, organizacao_id, usuario_id, perfil, status,
                        solicitado_em, aprovado_em, aprovado_por_usuario_id
                    ) VALUES (1203, 1, 1202, 1201, 'OPERADOR', 'ATIVO',
                              TIMESTAMP '2026-08-25 08:00:00',
                              TIMESTAMP '2026-08-25 08:05:00', 1201)
                    """);
            statement.executeUpdate("""
                    INSERT INTO ferramentas (
                        id, versao, organizacao_id, patrimonio, nome, categoria,
                        status, responsavel_atual_id, responsavel_desde,
                        destino_atual, localizacao, ativo
                    ) VALUES (1204, 9, 1202, 'V7-POSTGRESQL', 'Ferramenta PG V7', 'Teste',
                              'MANUTENCAO', NULL, NULL, NULL, 'Armário 7', TRUE)
                    """);
            statement.executeUpdate("""
                    INSERT INTO movimentacoes_ferramenta (
                        id, versao, organizacao_id, ferramenta_id, usuario_id,
                        responsavel_usuario_id, responsavel_anterior_usuario_id,
                        tipo_movimentacao, data_hora, observacao, destino,
                        status_revisao, confirmado_por_usuario_id, confirmado_em
                    ) VALUES (
                        1205, 3, 1202, 1204, 1201, NULL, 1201,
                        'MANUTENCAO', TIMESTAMP '2026-08-25 09:00:00',
                        'Movimento PG V7', 'Linha 7', 'CONFIRMADA',
                        1201, TIMESTAMP '2026-08-25 09:10:00'
                    )
                    """);
        }

        flywayForSchema(schema, null).migrate();

        try (Connection connection = legacyConnection(schema);
             Statement statement = connection.createStatement()) {
            assertEquals(1, scalar(statement, """
                    SELECT COUNT(*) FROM movimentacoes_ferramenta
                     WHERE id = 1205
                       AND versao = 3
                       AND organizacao_id = 1202
                       AND ferramenta_id = 1204
                       AND usuario_id = 1201
                       AND responsavel_anterior_usuario_id = 1201
                       AND tipo_movimentacao = 'MANUTENCAO'
                       AND data_hora = TIMESTAMP '2026-08-25 09:00:00'
                       AND observacao = 'Movimento PG V7'
                       AND destino = 'Linha 7'
                       AND status_revisao = 'CONFIRMADA'
                       AND confirmado_por_usuario_id = 1201
                       AND confirmado_em = TIMESTAMP '2026-08-25 09:10:00'
                    """));
            statement.executeUpdate("""
                    INSERT INTO movimentacoes_ferramenta (
                        id, versao, organizacao_id, ferramenta_id, usuario_id,
                        tipo_movimentacao, data_hora, status_revisao
                    ) VALUES (1206, 0, 1202, 1204, 1201,
                              'CONCLUSAO_MANUTENCAO',
                              TIMESTAMP '2026-08-25 10:00:00', 'PENDENTE')
                    """);
            assertThrows(SQLException.class, () -> statement.executeUpdate("""
                    INSERT INTO movimentacoes_ferramenta (
                        id, versao, organizacao_id, ferramenta_id, usuario_id,
                        tipo_movimentacao, data_hora, status_revisao
                    ) VALUES (1207, 0, 1202, 1204, 1201,
                              'TIPO_INVALIDO',
                              TIMESTAMP '2026-08-25 10:05:00', 'PENDENTE')
                    """));
            assertEquals(1, scalar(statement, """
                    SELECT COUNT(*) FROM pg_indexes
                     WHERE schemaname = current_schema()
                       AND indexname = 'idx_mov_ferramenta_organizacao_revisao_id'
                    """));
            assertEquals(List.of("1", "2", "3", "4", "5", "6", "7", "8"),
                    historyVersions(statement));
        }
    }

    @Test
    void deveMigrarSchemaPostgresqlPopuladoDeV3ParaV4SemPerderDados() throws Exception {
        String schema = "legacy_v3_to_v4";
        Flyway flywayAteV2 = flywayForSchema(schema, "2");
        flywayAteV2.migrate();

        try (Connection connection = legacyConnection(schema);
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO usuarios (id, nome, email, perfil, ativo, versao)
                    VALUES (101, 'Legado PostgreSQL', 'legado-v4@example.com', 'OPERADOR', TRUE, 3)
                    """);
            statement.executeUpdate("""
                    INSERT INTO itens_estoque (
                        id, codigo, nome, quantidade_atual, quantidade_minima, ativo, versao
                    ) VALUES (201, 'LEGADO-PG-ITEM', 'Item legado', 17, 4, TRUE, 2)
                    """);
            statement.executeUpdate("""
                    INSERT INTO ferramentas (
                        id, patrimonio, nome, status, ativo, versao
                    ) VALUES (301, 'LEGADO-PG-PAT', 'Ferramenta legada', 'DISPONIVEL', TRUE, 5)
                    """);
            statement.executeUpdate("""
                    INSERT INTO movimentacoes_estoque (
                        id, item_estoque_id, usuario_id, tipo_movimentacao,
                        quantidade, data_hora, observacao
                    ) VALUES (
                        401, 201, 101, 'ENTRADA', 17,
                        TIMESTAMP '2026-08-01 10:00:00', 'Histórico legado'
                    )
                    """);
            statement.executeUpdate("""
                    INSERT INTO movimentacoes_ferramenta (
                        id, ferramenta_id, usuario_id, tipo_movimentacao,
                        data_hora, observacao
                    ) VALUES (
                        501, 301, 101, 'MANUTENCAO',
                        TIMESTAMP '2026-08-02 11:00:00', 'Histórico legado'
                    )
                    """);
        }

        flywayForSchema(schema, "3").migrate();
        Map<String, Integer> countsBefore = operationalCounts(schema);
        flywayForSchema(schema, null).migrate();

        assertEquals(countsBefore, operationalCounts(schema));
        assertEquals(Map.of(
                "usuarios", 1,
                "itens_estoque", 1,
                "ferramentas", 1,
                "movimentacoes_estoque", 1,
                "movimentacoes_ferramenta", 1
        ), countsBefore);
        try (Connection connection = legacyConnection(schema);
             Statement statement = connection.createStatement()) {
            assertEquals(0, scalar(statement, """
                    WITH legacy AS (
                        SELECT id FROM organizacoes
                         WHERE nome = 'Organização Legada'
                           AND criada_em = TIMESTAMP '2000-01-01 00:00:00'
                    )
                    SELECT
                        (SELECT COUNT(*) FROM itens_estoque
                          WHERE organizacao_id NOT IN (SELECT id FROM legacy))
                      + (SELECT COUNT(*) FROM ferramentas
                          WHERE organizacao_id NOT IN (SELECT id FROM legacy))
                      + (SELECT COUNT(*) FROM movimentacoes_estoque
                          WHERE organizacao_id NOT IN (SELECT id FROM legacy))
                      + (SELECT COUNT(*) FROM movimentacoes_ferramenta
                          WHERE organizacao_id NOT IN (SELECT id FROM legacy))
                    """));
            assertEquals(17, scalar(statement, """
                    SELECT quantidade_atual FROM itens_estoque WHERE id = 201
                    """));
            assertEquals(5, scalar(statement, """
                    SELECT versao FROM ferramentas WHERE id = 301
                    """));
            assertEquals(List.of("1", "2", "3", "4", "5", "6", "7", "8"), historyVersions(statement));
        }
    }

    private Flyway flywayForSchema(String schema, String target) {
        var configuration = Flyway.configure()
                .dataSource(
                        POSTGRESQL.getJdbcUrl(),
                        POSTGRESQL.getUsername(),
                        POSTGRESQL.getPassword()
                )
                .schemas(schema)
                .defaultSchema(schema)
                .locations("classpath:db/migration/postgresql");
        if (target != null) {
            configuration.target(target);
        }
        return configuration.load();
    }

    private Connection legacyConnection(String schema) throws Exception {
        Connection connection = DriverManager.getConnection(
                POSTGRESQL.getJdbcUrl(),
                POSTGRESQL.getUsername(),
                POSTGRESQL.getPassword()
        );
        connection.setSchema(schema);
        return connection;
    }

    private Map<String, Integer> operationalCounts(String schema) throws Exception {
        try (Connection connection = legacyConnection(schema);
             Statement statement = connection.createStatement()) {
            return Map.of(
                    "usuarios", scalar(statement, "SELECT COUNT(*) FROM usuarios"),
                    "itens_estoque", scalar(statement, "SELECT COUNT(*) FROM itens_estoque"),
                    "ferramentas", scalar(statement, "SELECT COUNT(*) FROM ferramentas"),
                    "movimentacoes_estoque",
                    scalar(statement, "SELECT COUNT(*) FROM movimentacoes_estoque"),
                    "movimentacoes_ferramenta",
                    scalar(statement, "SELECT COUNT(*) FROM movimentacoes_ferramenta")
            );
        }
    }

    private int scalar(Statement statement, String sql) throws Exception {
        try (ResultSet result = statement.executeQuery(sql)) {
            result.next();
            return result.getInt(1);
        }
    }

    private List<String> historyVersions(Statement statement) throws Exception {
        try (ResultSet result = statement.executeQuery("""
                SELECT version FROM flyway_schema_history
                 WHERE version IS NOT NULL ORDER BY installed_rank
                """)) {
            java.util.ArrayList<String> versions = new java.util.ArrayList<>();
            while (result.next()) {
                versions.add(result.getString(1));
            }
            return List.copyOf(versions);
        }
    }

    private UsuarioResponseDTO criarUsuario(String nome, String email) {
        UsuarioRequestDTO request = new UsuarioRequestDTO();
        request.setNome(nome);
        request.setEmail(email);
        request.setPerfil(PerfilUsuario.OPERADOR);
        return usuarioService.criar(request);
    }

    private ItemEstoqueRequestDTO itemRequest(String codigo) {
        ItemEstoqueRequestDTO request = new ItemEstoqueRequestDTO();
        request.setCodigo(codigo);
        request.setNome("Item PostgreSQL");
        request.setQuantidadeAtual(0);
        request.setQuantidadeMinima(0);
        return request;
    }

    private FerramentaRequestDTO ferramentaRequest(String patrimonio) {
        FerramentaRequestDTO request = new FerramentaRequestDTO();
        request.setPatrimonio(patrimonio);
        request.setNome("Ferramenta PostgreSQL");
        return request;
    }

    private void saveActiveOperator(
            Organizacao organization,
            Long userId,
            Usuario approvedBy
    ) {
        Usuario user = usuarioRepository.findById(userId).orElseThrow();
        LocalDateTime now = LocalDateTime.now();
        membroRepository.save(OrganizacaoMembro.builder()
                .organizacao(organization)
                .usuario(user)
                .perfil(PerfilMembroOrganizacao.OPERADOR)
                .status(StatusMembroOrganizacao.ATIVO)
                .solicitadoEm(now)
                .aprovadoEm(now)
                .aprovadoPorUsuario(approvedBy)
                .build());
    }

    private boolean attemptPostgresqlWithdrawal(
            Long organizationId,
            Long toolId,
            Long operatorId,
            CountDownLatch ready,
            CountDownLatch start
    ) {
        ready.countDown();
        try {
            start.await();
            return Boolean.TRUE.equals(new TransactionTemplate(transactionManager).execute(status -> {
                MovimentacaoFerramentaRequestDTO request = new MovimentacaoFerramentaRequestDTO();
                request.setObservacao("Retirada concorrente PostgreSQL");
                ferramentaService.registrarRetirada(organizationId, toolId, operatorId, request);
                return true;
            }));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return false;
        } catch (RuntimeException exception) {
            return false;
        }
    }
}
