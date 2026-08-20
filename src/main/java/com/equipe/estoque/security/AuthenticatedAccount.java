package com.equipe.estoque.security;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class AuthenticatedAccount {

    public Long id() {
        return id(SecurityContextHolder.getContext().getAuthentication());
    }

    public Long id(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Acesso negado");
        }
        try {
            return Long.valueOf(authentication.getName());
        } catch (NumberFormatException exception) {
            throw new AccessDeniedException("Acesso negado", exception);
        }
    }
}
