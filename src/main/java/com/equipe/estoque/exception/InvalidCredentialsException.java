package com.equipe.estoque.exception;

public class InvalidCredentialsException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    public InvalidCredentialsException() {
        super("Credenciais inválidas");
    }
}
