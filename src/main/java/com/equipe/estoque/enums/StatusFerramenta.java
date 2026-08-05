package com.equipe.estoque.enums;

/**
 * DISPONIVEL → está no almoxarifado, pode ser retirada
 * EMPRESTADA → está com algum usuário (tem responsavelAtual)
 * MANUTENCAO → foi encaminhada para reparo
 * PERDIDA    → foi extraviada
 */
public enum StatusFerramenta {
    DISPONIVEL,
    EMPRESTADA,
    MANUTENCAO,
    PERDIDA
}
