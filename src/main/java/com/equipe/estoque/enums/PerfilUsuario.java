package com.equipe.estoque.enums;

/**
 * ADMIN    → acesso total
 * OPERADOR → pode registrar movimentações
 * CONSULTA → somente leitura
 *
 * Obs: o controle de acesso por perfil pode ser implementado futuramente
 * com Spring Security. Por ora, os perfis estão cadastrados para uso futuro.
 */
public enum PerfilUsuario {
    ADMIN,
    OPERADOR,
    CONSULTA
}
