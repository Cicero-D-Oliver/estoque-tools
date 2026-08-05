package com.equipe.estoque.enums;

/**
 * RETIRADA   → usuário pegou a ferramenta emprestada
 * DEVOLUCAO  → usuário devolveu
 * MANUTENCAO → foi para reparo
 * PERDA      → foi extraviada
 * CORRECAO   → correção de registro incorreto (exige observação)
 */
public enum TipoMovimentacaoFerramenta {
    RETIRADA,
    DEVOLUCAO,
    MANUTENCAO,
    PERDA,
    CORRECAO
}
