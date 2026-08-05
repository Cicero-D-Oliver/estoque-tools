package com.equipe.estoque.config;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;

/**
 * Produz uma assinatura deterministica do catalogo persistente de um banco SQLite.
 */
final class SQLiteSchemaSignature {

    private static final String OBJECTS_SQL = """
            SELECT type, name, tbl_name, sql
              FROM sqlite_schema
             WHERE sql IS NOT NULL
               AND name NOT LIKE 'sqlite_%'
             ORDER BY type, name, tbl_name
            """;

    private SQLiteSchemaSignature() {
        throw new IllegalStateException("Utility class");
    }

    static Signature calculate(Connection connection) throws SQLException {
        StringBuilder canonical = new StringBuilder("sqlite-schema-signature-v1\n");
        List<String> tables = appendSchemaObjects(connection, canonical);

        for (String table : tables) {
            appendTableOptions(connection, canonical, table);
            appendColumns(connection, canonical, table);
            appendForeignKeys(connection, canonical, table);
            appendIndexes(connection, canonical, table);
        }

        String snapshot = canonical.toString();
        return new Signature(sha256(snapshot), snapshot);
    }

    private static List<String> appendSchemaObjects(
            Connection connection,
            StringBuilder canonical
    ) throws SQLException {
        List<String> tables = new ArrayList<>();
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery(OBJECTS_SQL)) {
            while (result.next()) {
                String type = result.getString("type");
                String name = result.getString("name");
                appendRecord(
                        canonical,
                        "object",
                        type,
                        name,
                        result.getString("tbl_name"),
                        normalizeSql(result.getString("sql"))
                );
                if ("table".equals(type)) {
                    tables.add(name);
                }
            }
        }
        tables.sort(String::compareTo);
        return tables;
    }

    private static void appendTableOptions(
            Connection connection,
            StringBuilder canonical,
            String table
    ) throws SQLException {
        String sql = """
                SELECT type, ncol, wr, strict
                  FROM pragma_table_list
                 WHERE schema = 'main' AND name = ?
                 ORDER BY type
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, table);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) {
                    appendRecord(
                            canonical,
                            "table-options",
                            table,
                            result.getString("type"),
                            result.getInt("ncol"),
                            result.getInt("wr"),
                            result.getInt("strict")
                    );
                }
            }
        }
    }

    private static void appendColumns(
            Connection connection,
            StringBuilder canonical,
            String table
    ) throws SQLException {
        String sql = """
                SELECT cid, name, type, "notnull", dflt_value, pk, hidden
                  FROM pragma_table_xinfo(?)
                 ORDER BY cid
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, table);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) {
                    appendRecord(
                            canonical,
                            "column",
                            table,
                            result.getInt("cid"),
                            result.getString("name"),
                            result.getString("type"),
                            result.getInt("notnull"),
                            result.getString("dflt_value"),
                            result.getInt("pk"),
                            result.getInt("hidden")
                    );
                }
            }
        }
    }

    private static void appendForeignKeys(
            Connection connection,
            StringBuilder canonical,
            String table
    ) throws SQLException {
        String sql = """
                SELECT id, seq, "table", "from", "to", on_update, on_delete, "match"
                  FROM pragma_foreign_key_list(?)
                 ORDER BY id, seq
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, table);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) {
                    appendRecord(
                            canonical,
                            "foreign-key",
                            table,
                            result.getInt("id"),
                            result.getInt("seq"),
                            result.getString("table"),
                            result.getString("from"),
                            result.getString("to"),
                            result.getString("on_update"),
                            result.getString("on_delete"),
                            result.getString("match")
                    );
                }
            }
        }
    }

    private static void appendIndexes(
            Connection connection,
            StringBuilder canonical,
            String table
    ) throws SQLException {
        String sql = """
                SELECT name, "unique", origin, partial
                  FROM pragma_index_list(?)
                 ORDER BY name
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, table);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) {
                    String index = result.getString("name");
                    appendRecord(
                            canonical,
                            "index",
                            table,
                            index,
                            result.getInt("unique"),
                            result.getString("origin"),
                            result.getInt("partial")
                    );
                    appendIndexColumns(connection, canonical, table, index);
                }
            }
        }
    }

    private static void appendIndexColumns(
            Connection connection,
            StringBuilder canonical,
            String table,
            String index
    ) throws SQLException {
        String sql = """
                SELECT seqno, cid, name, "desc", coll, key
                  FROM pragma_index_xinfo(?)
                 ORDER BY seqno
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, index);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) {
                    appendRecord(
                            canonical,
                            "index-column",
                            table,
                            index,
                            result.getInt("seqno"),
                            result.getInt("cid"),
                            result.getString("name"),
                            result.getInt("desc"),
                            result.getString("coll"),
                            result.getInt("key")
                    );
                }
            }
        }
    }

    private static void appendRecord(
            StringBuilder canonical,
            String section,
            Object... values
    ) {
        appendValue(canonical, section);
        for (Object value : values) {
            appendValue(canonical, value);
        }
        canonical.append('\n');
    }

    private static void appendValue(StringBuilder canonical, Object value) {
        canonical.append('|');
        if (value == null) {
            canonical.append("-1:");
            return;
        }
        String text = value.toString();
        canonical.append(text.length()).append(':').append(text);
    }

    private static String normalizeSql(String sql) {
        StringBuilder normalized = new StringBuilder(sql.length());
        boolean whitespacePending = false;
        char quoteEnd = 0;

        for (int index = 0; index < sql.length(); index++) {
            char current = sql.charAt(index);
            if (quoteEnd != 0) {
                normalized.append(current);
                if (current == quoteEnd) {
                    if (isEscapedQuote(sql, index, quoteEnd)) {
                        normalized.append(sql.charAt(++index));
                    } else {
                        quoteEnd = 0;
                    }
                }
                continue;
            }

            if (Character.isWhitespace(current)) {
                whitespacePending = true;
                continue;
            }

            char canonicalChar = Character.toLowerCase(current);
            if (whitespacePending && requiresSeparator(normalized, canonicalChar)) {
                normalized.append(' ');
            }
            whitespacePending = false;
            normalized.append(canonicalChar);
            quoteEnd = closingQuote(current);
        }
        return normalized.toString();
    }

    private static boolean isEscapedQuote(String sql, int index, char quoteEnd) {
        return quoteEnd != ']' && index + 1 < sql.length() && sql.charAt(index + 1) == quoteEnd;
    }

    private static char closingQuote(char current) {
        return switch (current) {
            case '\'', '"', '`' -> current;
            case '[' -> ']';
            default -> 0;
        };
    }

    private static boolean requiresSeparator(StringBuilder normalized, char current) {
        if (normalized.isEmpty()) {
            return false;
        }
        char previous = normalized.charAt(normalized.length() - 1);
        return isTokenBoundary(previous) && isTokenBoundary(current);
    }

    private static boolean isTokenBoundary(char value) {
        return Character.isLetterOrDigit(value)
                || value == '_'
                || value == '$'
                || value == '\''
                || value == '"'
                || value == '`'
                || value == ']'
                || value == '[';
    }

    private static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }

    record Signature(String sha256, String canonicalSnapshot) {
    }
}
