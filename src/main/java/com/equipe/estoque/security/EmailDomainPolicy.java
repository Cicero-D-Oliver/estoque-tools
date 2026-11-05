package com.equipe.estoque.security;

import com.equipe.estoque.config.RegistrationProperties;
import com.equipe.estoque.exception.BusinessException;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class EmailDomainPolicy {

    private final Set<String> allowedDomains;

    public EmailDomainPolicy(RegistrationProperties properties) {
        this.allowedDomains = properties.getAllowedEmailDomains().stream()
                .map(String::trim)
                .map(domain -> domain.toLowerCase(Locale.ROOT))
                .filter(domain -> !domain.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (allowedDomains.isEmpty()) {
            throw new IllegalStateException("Ao menos um domínio de e-mail deve ser configurado");
        }
    }

    public void validate(String email) {
        if (!isAllowed(email)) {
            throw new BusinessException(guidanceMessage());
        }
    }

    public boolean isAllowed(String email) {
        if (email == null) {
            return false;
        }
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        int separator = normalizedEmail.lastIndexOf('@');
        String domain = separator < 0 ? "" : normalizedEmail.substring(separator + 1);
        return separator > 0 && separator == normalizedEmail.indexOf('@')
                && separator < normalizedEmail.length() - 1
                && allowedDomains.contains(domain);
    }

    private String guidanceMessage() {
        if (allowedDomains.size() == 1) {
            return "Use seu e-mail corporativo @" + allowedDomains.iterator().next() + ".";
        }
        return "Use um e-mail corporativo autorizado.";
    }
}
