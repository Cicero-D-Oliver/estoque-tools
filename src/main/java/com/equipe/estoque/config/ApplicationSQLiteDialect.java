package com.equipe.estoque.config;

import org.hibernate.community.dialect.SQLiteDialect;

import java.sql.Types;

/**
 * Mantém o dialect comunitário e corrige apenas a equivalência usada pelo
 * schema validator para chaves identity Long do SQLite.
 */
public class ApplicationSQLiteDialect extends SQLiteDialect {

    @Override
    public boolean equivalentTypes(int firstTypeCode, int secondTypeCode) {
        return super.equivalentTypes(firstTypeCode, secondTypeCode)
                || isIntegerAndBigInt(firstTypeCode, secondTypeCode);
    }

    private boolean isIntegerAndBigInt(int firstTypeCode, int secondTypeCode) {
        return firstTypeCode == Types.INTEGER && secondTypeCode == Types.BIGINT
                || firstTypeCode == Types.BIGINT && secondTypeCode == Types.INTEGER;
    }
}
