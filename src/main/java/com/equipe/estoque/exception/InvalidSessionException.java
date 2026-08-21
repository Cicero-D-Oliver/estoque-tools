package com.equipe.estoque.exception;

public class InvalidSessionException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    public InvalidSessionException() {
        super("Sessão inválida");
    }
}
