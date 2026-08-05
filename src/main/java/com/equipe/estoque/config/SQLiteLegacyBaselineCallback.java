package com.equipe.estoque.config;

import org.flywaydb.core.api.FlywayException;
import org.flywaydb.core.api.callback.Callback;
import org.flywaydb.core.api.callback.Context;
import org.flywaydb.core.api.callback.Event;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.sql.SQLException;

/**
 * Bloqueia a baseline quando o catalogo SQLite nao e exatamente o legado aceito.
 */
@Component
@ConditionalOnProperty(
        prefix = "spring.datasource",
        name = "driver-class-name",
        havingValue = "org.sqlite.JDBC"
)
public final class SQLiteLegacyBaselineCallback implements Callback {

    static final String EXPECTED_LEGACY_SIGNATURE =
            "f8d17cb13b640a8fc723887749da512a7ba681feebedf3afb7136c254c5365d6";

    @Override
    public boolean supports(Event event, Context context) {
        return event == Event.BEFORE_BASELINE;
    }

    @Override
    public boolean canHandleInTransaction(Event event, Context context) {
        return true;
    }

    @Override
    public void handle(Event event, Context context) {
        try {
            String databaseUrl = context.getConnection().getMetaData().getURL();
            if (databaseUrl == null || !databaseUrl.startsWith("jdbc:sqlite:")) {
                throw new FlywayException("SQLite legacy baseline callback received a non-SQLite connection");
            }

            SQLiteSchemaSignature.Signature actual =
                    SQLiteSchemaSignature.calculate(context.getConnection());
            if (!EXPECTED_LEGACY_SIGNATURE.equals(actual.sha256())) {
                throw new FlywayException(
                        "SQLite legacy schema signature mismatch; baseline aborted before metadata creation. "
                                + "Expected=" + EXPECTED_LEGACY_SIGNATURE
                                + ", actual=" + actual.sha256()
                );
            }
        } catch (SQLException exception) {
            throw new FlywayException(
                    "Could not calculate the SQLite legacy schema signature; baseline aborted",
                    exception
            );
        }
    }

    @Override
    public String getCallbackName() {
        return "verify-known-sqlite-legacy-schema-signature";
    }
}
