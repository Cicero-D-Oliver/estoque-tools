package com.equipe.estoque.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("prod")
@RequiredArgsConstructor
public class ProductionSecurityConfigurationValidator {

    private final SecurityProperties securityProperties;
    private final CorsProperties corsProperties;

    @PostConstruct
    @SuppressWarnings("PMD.AvoidUsingHardCodedIP")
    void validate() {
        if (!securityProperties.getRefreshCookie().isSecure()) {
            throw new IllegalStateException("Produção exige cookie de refresh Secure");
        }
        if (!corsProperties.isAllowCredentials()) {
            throw new IllegalStateException("Produção exige CORS credentials para a sessão web");
        }
        // O loopback literal é intencional: uma origem local nunca é válida no profile de produção.
        boolean localOrigin = corsProperties.getAllowedOrigins().stream()
                .map(String::toLowerCase)
                .anyMatch(origin -> origin.contains("localhost") || origin.contains("127.0.0.1"));
        if (localOrigin) {
            throw new IllegalStateException("Produção exige origens CORS externas explícitas");
        }
    }
}
