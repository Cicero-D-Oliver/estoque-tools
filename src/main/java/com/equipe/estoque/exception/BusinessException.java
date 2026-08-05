package com.equipe.estoque.exception;

/**
 * Exception lançada quando uma regra de negócio é violada.
 * Exemplos: estoque insuficiente, ferramenta já emprestada, usuário inativo, etc.
 *
 * É uma RuntimeException (unchecked) para não precisarmos declarar "throws"
 * em todos os métodos dos services.
 */
public class BusinessException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    public BusinessException(String message) {
        super(message);
    }
}
