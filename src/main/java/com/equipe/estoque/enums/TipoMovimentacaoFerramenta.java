package com.equipe.estoque.enums;

/**
 * RETIRADA   → usuário pegou a ferramenta emprestada
 * DEVOLUCAO  → usuário devolveu
 * TRANSFERENCIA → responsabilidade passou explicitamente para outro membro
 * MANUTENCAO → foi para reparo
 * CONCLUSAO_MANUTENCAO → reparo concluído e ferramenta voltou a ficar disponível
 * PERDA      → foi extraviada
 * CORRECAO   → correção de registro incorreto (exige observação)
 */
public enum TipoMovimentacaoFerramenta {
    RETIRADA,
    DEVOLUCAO,
    TRANSFERENCIA,
    MANUTENCAO,
    CONCLUSAO_MANUTENCAO,
    PERDA,
    CORRECAO
}
