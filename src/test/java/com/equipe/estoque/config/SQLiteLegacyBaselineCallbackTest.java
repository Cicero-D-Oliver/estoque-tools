package com.equipe.estoque.config;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.sqlite.SQLiteConfig;
import org.sqlite.SQLiteDataSource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;

import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SQLiteLegacyBaselineCallbackTest {

    private static final String LEGACY_SCHEMA_RESOURCE =
            "db/legacy/sqlite/known-legacy-schema.sql";

    private static final Map<String, String> DATA_QUERIES = createDataQueries();

    @TempDir
    private Path temporaryDirectory;

    @Test
    void assinaturaDaFixtureLegadaDeveSerExatamenteAAceita() throws Exception {
        DataSource dataSource = createKnownLegacyDatabase("signature.db");

        try (Connection connection = dataSource.getConnection()) {
            assertEquals(
                    SQLiteLegacyBaselineCallback.EXPECTED_LEGACY_SIGNATURE,
                    SQLiteSchemaSignature.calculate(connection).sha256()
            );
        }
    }

    @Test
    void deveAceitarLegadoConhecidoAplicarAteV5EPreservarDados() throws Exception {
        DataSource dataSource = createKnownLegacyDatabase("compatible.db");
        Map<String, String> hashesBefore = canonicalDataHashes(dataSource);

        migrate(dataSource, true);

        assertEquals(hashesBefore, canonicalDataHashes(dataSource));
        try (Connection connection = dataSource.getConnection()) {
            assertHistory(connection, "1:BASELINE:1", "2:SQL:1", "3:SQL:1", "4:SQL:1", "5:SQL:1");
            assertEquals(7, countApplicationTables(connection));
            assertEquals(1, countRows(connection, "organizacoes"));
            assertEquals(3, countRows(connection, "organizacao_membros"));
            assertEquals(0, countMismatchedLegacyProfiles(connection));
            assertEquals(0, countOperationalRowsOutsideLegacyOrganization(connection));
            assertEquals(0, foreignKeyViolationCount(connection));
        }
    }

    @ParameterizedTest(name = "baseline rejeitada: {0}")
    @MethodSource("incompatibleSchemas")
    void deveRejeitarAssinaturasParcialmenteCompativeis(
            String scenario,
            SchemaMutation mutation
    ) throws Exception {
        DataSource dataSource = createKnownLegacyDatabase(safeFileName(scenario) + ".db");
        try (Connection connection = dataSource.getConnection()) {
            mutation.apply(connection);
            assertNotEquals(
                    SQLiteLegacyBaselineCallback.EXPECTED_LEGACY_SIGNATURE,
                    SQLiteSchemaSignature.calculate(connection).sha256(),
                    scenario
            );
        }

        assertThrows(FlywayException.class, () -> migrate(dataSource, true), scenario);

        try (Connection connection = dataSource.getConnection()) {
            assertFalse(tableExists(connection, "flyway_schema_history"), scenario);
        }
    }

    @Test
    void bancoNovoVazioDeveAplicarV1AteV5SemBaseline() throws Exception {
        DataSource dataSource = sqliteDataSource(temporaryDirectory.resolve("empty.db"));

        migrate(dataSource, true);

        try (Connection connection = dataSource.getConnection()) {
            assertHistory(connection, "1:SQL:1", "2:SQL:1", "3:SQL:1", "4:SQL:1", "5:SQL:1");
            assertEquals(7, countApplicationTables(connection));
            assertEquals(0, countRows(connection, "organizacoes"));
            assertEquals(0, foreignKeyViolationCount(connection));
        }
    }

    @Test
    void deveMigrarBancoParadoEmV3ParaV4SemPerderDadosOperacionais() throws Exception {
        DataSource dataSource = sqliteDataSource(temporaryDirectory.resolve("v3-to-v4.db"));
        migrateToVersion2(dataSource);
        try (Connection connection = dataSource.getConnection()) {
            execute(connection, """
                    INSERT INTO usuarios (id, versao, nome, email, perfil, ativo)
                    VALUES (101, 4, 'Usuário Existente', 'existente@example.com', 'CONSULTA', 1)
                    """);
            execute(connection, """
                    INSERT INTO itens_estoque (
                        id, versao, codigo, nome, quantidade_atual, quantidade_minima, ativo
                    ) VALUES (201, 3, 'LEGADO-ITEM', 'Item legado', 17, 4, 1)
                    """);
            execute(connection, """
                    INSERT INTO ferramentas (
                        id, versao, patrimonio, nome, status, ativo
                    ) VALUES (301, 2, 'LEGADO-PAT', 'Ferramenta legada', 'DISPONIVEL', 1)
                    """);
            execute(connection, """
                    INSERT INTO movimentacoes_estoque (
                        id, item_estoque_id, usuario_id, tipo_movimentacao,
                        quantidade, data_hora, observacao
                    ) VALUES (
                        401, 201, 101, 'ENTRADA', 17,
                        '2026-08-01 10:00:00', 'Histórico legado'
                    )
                    """);
            execute(connection, """
                    INSERT INTO movimentacoes_ferramenta (
                        id, ferramenta_id, usuario_id, tipo_movimentacao, data_hora, observacao
                    ) VALUES (
                        501, 301, 101, 'MANUTENCAO',
                        '2026-08-02 11:00:00', 'Histórico legado'
                    )
                    """);
        }
        migrateToVersion3(dataSource);
        Map<String, String> hashesBefore = canonicalDataHashes(dataSource);

        migrate(dataSource, false);

        assertEquals(hashesBefore, canonicalDataHashes(dataSource));
        try (Connection connection = dataSource.getConnection()) {
            assertHistory(connection, "1:SQL:1", "2:SQL:1", "3:SQL:1", "4:SQL:1", "5:SQL:1");
            assertEquals(1, countRows(connection, "usuarios"));
            assertEquals(1, countRows(connection, "organizacoes"));
            assertEquals(1, countRows(connection, "organizacao_membros"));
            assertEquals(0, countMismatchedLegacyProfiles(connection));
            assertEquals(0, countOperationalRowsOutsideLegacyOrganization(connection));
            assertEquals(0, foreignKeyViolationCount(connection));
        }
    }

    @Test
    void deveMigrarBancoPopuladoDeV4ParaV5SemInventarCredencial() throws Exception {
        DataSource dataSource = sqliteDataSource(temporaryDirectory.resolve("v4-to-v5.db"));
        migrateToVersion4(dataSource);
        try (Connection connection = dataSource.getConnection()) {
            execute(connection, """
                    INSERT INTO usuarios (id, versao, nome, email, perfil, ativo)
                    VALUES (701, 9, 'Legado V4', 'legado-v5@example.com', 'CONSULTA', 1)
                    """);
        }

        migrate(dataSource, false);

        try (Connection connection = dataSource.getConnection()) {
            assertHistory(connection, "1:SQL:1", "2:SQL:1", "3:SQL:1", "4:SQL:1", "5:SQL:1");
            assertEquals(1, countRows(connection, "usuarios"));
            try (Statement statement = connection.createStatement();
                 ResultSet result = statement.executeQuery("""
                         SELECT versao, senha_hash, senha_alterada_em, ultimo_login_em
                           FROM usuarios WHERE id = 701
                         """)) {
                assertTrue(result.next());
                assertEquals(9, result.getInt("versao"));
                assertEquals(null, result.getString("senha_hash"));
                assertEquals(null, result.getString("senha_alterada_em"));
                assertEquals(null, result.getString("ultimo_login_em"));
            }
        }
    }

    @Test
    void seedDeDesenvolvimentoDeveSerOpcionalEIdempotente() throws Exception {
        DataSource dataSource = sqliteDataSource(temporaryDirectory.resolve("development-seed.db"));
        Flyway flyway = Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration/sqlite", "classpath:db/seed/sqlite")
                .load();

        flyway.migrate();
        Map<String, Integer> countsAfterFirstRun = developmentSeedCounts(dataSource);
        flyway.migrate();

        assertEquals(countsAfterFirstRun, developmentSeedCounts(dataSource));
        assertEquals(Map.of(
                "usuarios", 3,
                "organizacoes", 1,
                "organizacao_membros", 3,
                "itens_estoque", 3,
                "ferramentas", 3
        ), countsAfterFirstRun);
    }

    private static Stream<Arguments> incompatibleSchemas() {
        return Stream.of(
                Arguments.of(
                        "indice composto incorreto",
                        (SchemaMutation) connection -> replaceUsuarios(
                                connection,
                                "UNIQUE (email, nome)",
                                "email varchar(255) not null",
                                false
                        )
                ),
                Arguments.of(
                        "trigger adicional",
                        (SchemaMutation) connection -> execute(
                                connection,
                                """
                                        CREATE TRIGGER trg_usuarios_adicional
                                        AFTER UPDATE ON usuarios
                                        BEGIN
                                            SELECT NEW.id;
                                        END
                                        """
                        )
                ),
                Arguments.of(
                        "view adicional",
                        (SchemaMutation) connection -> execute(
                                connection,
                                "CREATE VIEW vw_usuarios_ativos AS SELECT id FROM usuarios WHERE ativo = 1"
                        )
                ),
                Arguments.of(
                        "collation diferente",
                        (SchemaMutation) connection -> replaceUsuarios(
                                connection,
                                "UNIQUE (email)",
                                "email varchar(255) COLLATE NOCASE not null",
                                false
                        )
                ),
                Arguments.of(
                        "ordem de coluna diferente",
                        (SchemaMutation) SQLiteLegacyBaselineCallbackTest::replaceUsuariosWithDifferentOrder
                ),
                Arguments.of(
                        "tabela STRICT adicional",
                        (SchemaMutation) connection -> execute(
                                connection,
                                "CREATE TABLE extensao_strict (id INTEGER PRIMARY KEY) STRICT"
                        )
                ),
                Arguments.of(
                        "tabela WITHOUT ROWID adicional",
                        (SchemaMutation) connection -> execute(
                                connection,
                                "CREATE TABLE extensao_without_rowid (id INTEGER PRIMARY KEY) WITHOUT ROWID"
                        )
                )
        );
    }

    private DataSource createKnownLegacyDatabase(String fileName) throws SQLException {
        DataSource dataSource = sqliteDataSource(temporaryDirectory.resolve(fileName));
        try (Connection connection = dataSource.getConnection()) {
            ScriptUtils.executeSqlScript(
                    connection,
                    new ClassPathResource(LEGACY_SCHEMA_RESOURCE)
            );
        }
        return dataSource;
    }

    private static DataSource sqliteDataSource(Path database) {
        SQLiteConfig configuration = new SQLiteConfig();
        configuration.enforceForeignKeys(true);
        SQLiteDataSource dataSource = new SQLiteDataSource(configuration);
        dataSource.setUrl("jdbc:sqlite:" + database.toAbsolutePath().toString().replace('\\', '/'));
        return dataSource;
    }

    private static void migrate(DataSource dataSource, boolean baselineOnMigrate) {
        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration/sqlite")
                .baselineOnMigrate(baselineOnMigrate)
                .baselineVersion("1")
                .baselineDescription("Legacy SQLite schema verified before Flyway adoption")
                .callbacks(new SQLiteLegacyBaselineCallback())
                .load()
                .migrate();
    }

    private static void migrateToVersion2(DataSource dataSource) {
        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration/sqlite")
                .target("2")
                .load()
                .migrate();
    }

    private static void migrateToVersion3(DataSource dataSource) {
        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration/sqlite")
                .target("3")
                .load()
                .migrate();
    }

    private static void migrateToVersion4(DataSource dataSource) {
        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration/sqlite")
                .target("4")
                .load()
                .migrate();
    }

    private static void replaceUsuarios(
            Connection connection,
            String uniqueConstraint,
            String emailDefinition,
            boolean swapNameAndEmail
    ) throws SQLException {
        execute(connection, "DROP INDEX idx_usuarios_ativo");
        execute(connection, "ALTER TABLE usuarios RENAME TO usuarios_original");
        String identityColumns = swapNameAndEmail
                ? "nome varchar(255) not null, " + emailDefinition + ","
                : emailDefinition + ", nome varchar(255) not null,";
        execute(
                connection,
                """
                        CREATE TABLE usuarios_candidate (
                            id integer,
                            ativo boolean not null,
                            %s
                            perfil varchar(255) not null
                                check (perfil in ('ADMIN','OPERADOR','CONSULTA')),
                            versao BIGINT DEFAULT 0 not null,
                            %s,
                            primary key (id)
                        )
                        """.formatted(identityColumns, uniqueConstraint)
        );
        execute(
                connection,
                """
                        INSERT INTO usuarios_candidate (id, ativo, email, nome, perfil, versao)
                        SELECT id, ativo, email, nome, perfil, versao FROM usuarios_original
                        """
        );
        execute(connection, "DROP TABLE usuarios_original");
        execute(connection, "ALTER TABLE usuarios_candidate RENAME TO usuarios");
        execute(connection, "CREATE INDEX idx_usuarios_ativo ON usuarios (ativo)");
    }

    private static void replaceUsuariosWithDifferentOrder(Connection connection) throws SQLException {
        replaceUsuarios(
                connection,
                "UNIQUE (email)",
                "email varchar(255) not null",
                true
        );
    }

    private static void execute(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute(sql);
        }
    }

    private static Map<String, String> canonicalDataHashes(DataSource dataSource) throws SQLException {
        Map<String, String> hashes = new LinkedHashMap<>();
        try (Connection connection = dataSource.getConnection()) {
            for (Map.Entry<String, String> entry : DATA_QUERIES.entrySet()) {
                hashes.put(entry.getKey(), hashRows(connection, entry.getValue()));
            }
        }
        return hashes;
    }

    private static Map<String, Integer> developmentSeedCounts(DataSource dataSource) throws SQLException {
        Map<String, Integer> counts = new LinkedHashMap<>();
        try (Connection connection = dataSource.getConnection()) {
            counts.put("usuarios", countRows(connection, "usuarios"));
            counts.put("organizacoes", countRows(connection, "organizacoes"));
            counts.put("organizacao_membros", countRows(connection, "organizacao_membros"));
            counts.put("itens_estoque", countRows(connection, "itens_estoque"));
            counts.put("ferramentas", countRows(connection, "ferramentas"));
        }
        return Map.copyOf(counts);
    }

    private static String hashRows(Connection connection, String sql) throws SQLException {
        MessageDigest digest = sha256Digest();
        try (PreparedStatement statement = connection.prepareStatement(sql);
             ResultSet result = statement.executeQuery()) {
            int columns = result.getMetaData().getColumnCount();
            while (result.next()) {
                for (int column = 1; column <= columns; column++) {
                    String value = result.getString(column);
                    String canonical = value == null ? "-1:" : value.length() + ":" + value;
                    digest.update(canonical.getBytes(StandardCharsets.UTF_8));
                    digest.update((byte) '|');
                }
                digest.update((byte) '\n');
            }
        }
        return HexFormat.of().formatHex(digest.digest());
    }

    private static MessageDigest sha256Digest() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }

    private static void assertHistory(Connection connection, String... expected) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("""
                     SELECT version, type, success
                       FROM flyway_schema_history
                      ORDER BY installed_rank
                     """)) {
            int index = 0;
            while (result.next()) {
                assertTrue(index < expected.length, "Flyway history contains unexpected rows");
                String actual = result.getString("version")
                        + ':' + result.getString("type")
                        + ':' + result.getInt("success");
                assertEquals(expected[index++], actual);
            }
            assertEquals(expected.length, index);
        }
    }

    private static int countApplicationTables(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("""
                     SELECT COUNT(*)
                       FROM sqlite_schema
                      WHERE type = 'table'
                        AND name IN (
                            'usuarios', 'itens_estoque', 'ferramentas',
                            'movimentacoes_estoque', 'movimentacoes_ferramenta',
                            'organizacoes', 'organizacao_membros'
                        )
                     """)) {
            return result.getInt(1);
        }
    }

    private static int countRows(Connection connection, String table) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COUNT(*) FROM " + table)) {
            return result.getInt(1);
        }
    }

    private static int countMismatchedLegacyProfiles(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("""
                     SELECT COUNT(*)
                       FROM organizacao_membros membro
                       JOIN usuarios usuario ON usuario.id = membro.usuario_id
                      WHERE membro.perfil <> usuario.perfil
                         OR membro.status <> 'ATIVO'
                     """)) {
            return result.getInt(1);
        }
    }

    private static int countOperationalRowsOutsideLegacyOrganization(Connection connection)
            throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("""
                     WITH legacy AS (
                         SELECT id
                           FROM organizacoes
                          WHERE nome = 'Organização Legada'
                            AND criada_em = '2000-01-01 00:00:00'
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
                     """)) {
            return result.getInt(1);
        }
    }

    private static int foreignKeyViolationCount(Connection connection) throws SQLException {
        int violations = 0;
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("PRAGMA foreign_key_check")) {
            while (result.next()) {
                violations++;
            }
        }
        return violations;
    }

    private static boolean tableExists(Connection connection, String table) throws SQLException {
        String sql = """
                SELECT COUNT(*)
                  FROM sqlite_schema
                 WHERE type = 'table' AND name = ?
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, table);
            try (ResultSet result = statement.executeQuery()) {
                return result.getInt(1) > 0;
            }
        }
    }

    private static String safeFileName(String scenario) {
        return scenario.replace(' ', '-').replaceAll("[^a-zA-Z0-9-]", "");
    }

    private static Map<String, String> createDataQueries() {
        Map<String, String> queries = new LinkedHashMap<>();
        queries.put("usuarios", """
                SELECT id, versao, nome, email, perfil, ativo FROM usuarios ORDER BY id
                """);
        queries.put("itens_estoque", """
                SELECT id, versao, codigo, nome, categoria, quantidade_atual,
                       quantidade_minima, localizacao, ativo
                  FROM itens_estoque ORDER BY id
                """);
        queries.put("ferramentas", """
                SELECT id, versao, patrimonio, nome, categoria, status,
                       responsavel_atual_id, localizacao, ativo
                  FROM ferramentas ORDER BY id
                """);
        queries.put("movimentacoes_estoque", """
                SELECT id, item_estoque_id, usuario_id, tipo_movimentacao,
                       quantidade, data_hora, observacao
                  FROM movimentacoes_estoque ORDER BY id
                """);
        queries.put("movimentacoes_ferramenta", """
                SELECT id, ferramenta_id, usuario_id, tipo_movimentacao,
                       data_hora, observacao
                  FROM movimentacoes_ferramenta ORDER BY id
                """);
        return Map.copyOf(queries);
    }

    @FunctionalInterface
    private interface SchemaMutation {
        void apply(Connection connection) throws SQLException;
    }
}
