package com.equipe.estoque.exception;

public class InvalidPasswordResetTokenException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    public InvalidPasswordResetTokenException() {
        super("Token de recuperação inválido");
    }
}
