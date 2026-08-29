package com.equipe.estoque.security;

import com.equipe.estoque.config.CorsProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

public class RefreshCookieCsrfFilter extends OncePerRequestFilter {

    private static final Set<String> PROTECTED_PATHS = Set.of(
            "/api/auth/login",
            "/api/auth/refresh",
            "/api/auth/logout"
    );

    private final CorsProperties corsProperties;
    private final ApiSecurityErrorHandler securityErrorHandler;

    public RefreshCookieCsrfFilter(
            CorsProperties corsProperties,
            ApiSecurityErrorHandler securityErrorHandler
    ) {
        this.corsProperties = corsProperties;
        this.securityErrorHandler = securityErrorHandler;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        if (requiresOriginValidation(request) && !hasTrustedBrowserOrigin(request)) {
            securityErrorHandler.handle(
                    request,
                    response,
                    new AccessDeniedException("Origem não permitida")
            );
            return;
        }
        filterChain.doFilter(request, response);
    }

    private boolean requiresOriginValidation(HttpServletRequest request) {
        return HttpMethod.POST.matches(request.getMethod())
                && PROTECTED_PATHS.contains(request.getRequestURI());
    }

    private boolean hasTrustedBrowserOrigin(HttpServletRequest request) {
        String origin = request.getHeader(HttpHeaders.ORIGIN);
        if (origin != null) {
            String normalizedOrigin = normalizeOrigin(origin);
            return corsProperties.getAllowedOrigins().stream()
                    .map(this::normalizeOrigin)
                    .anyMatch(normalizedOrigin::equals);
        }
        return !"cross-site".equalsIgnoreCase(request.getHeader("Sec-Fetch-Site"));
    }

    private String normalizeOrigin(String origin) {
        String normalized = origin.trim();
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }
}
