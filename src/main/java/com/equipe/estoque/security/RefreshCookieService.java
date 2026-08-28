package com.equipe.estoque.security;

import com.equipe.estoque.config.SecurityProperties;
import com.equipe.estoque.exception.InvalidSessionException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;

@Component
@RequiredArgsConstructor
public class RefreshCookieService {

    public static final String COOKIE_NAME = "ESTOQUE_REFRESH";

    private final SecurityProperties securityProperties;

    public String require(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            throw new InvalidSessionException();
        }
        return Arrays.stream(cookies)
                .filter(cookie -> COOKIE_NAME.equals(cookie.getName()))
                .map(Cookie::getValue)
                .filter(value -> !value.isBlank())
                .findFirst()
                .orElseThrow(InvalidSessionException::new);
    }

    public ResponseCookie create(String rawToken, Instant expiresAt) {
        Duration maxAge = Duration.between(Instant.now(), expiresAt);
        if (maxAge.isNegative()) {
            maxAge = Duration.ZERO;
        }
        return base(rawToken)
                .maxAge(maxAge)
                .build();
    }

    public ResponseCookie expire() {
        return base("")
                .maxAge(Duration.ZERO)
                .build();
    }

    private ResponseCookie.ResponseCookieBuilder base(String value) {
        SecurityProperties.RefreshCookie properties = securityProperties.getRefreshCookie();
        return ResponseCookie.from(COOKIE_NAME, value)
                .httpOnly(true)
                .secure(properties.isSecure())
                .sameSite(normalizedSameSite(properties.getSameSite()))
                .path(properties.getPath());
    }

    private String normalizedSameSite(String sameSite) {
        if ("Strict".equalsIgnoreCase(sameSite)) {
            return "Strict";
        }
        if ("None".equalsIgnoreCase(sameSite)) {
            return "None";
        }
        return "Lax";
    }
}
