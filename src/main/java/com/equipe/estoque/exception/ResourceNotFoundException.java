package com.equipe.estoque.exception;

/**
 * Exception lançada quando um registro não é encontrado no banco
 * (ex: buscar usuário com ID que não existe).
 * Resulta em HTTP 404 (Not Found).
 */
public class ResourceNotFoundException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
