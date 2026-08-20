package com.equipe.estoque.security;

import com.equipe.estoque.config.RequestCorrelationFilter;
import com.equipe.estoque.exception.ErroResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class ApiSecurityErrorHandler implements AuthenticationEntryPoint, AccessDeniedHandler {

    private final ObjectMapper objectMapper;

    @Override
    public void commence(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException exception
    ) throws IOException {
        write(
                request,
                response,
                HttpStatus.UNAUTHORIZED,
                "NAO_AUTENTICADO",
                "Autenticação necessária",
                "Credenciais ausentes ou inválidas."
        );
    }

    @Override
    public void handle(
            HttpServletRequest request,
            HttpServletResponse response,
            AccessDeniedException exception
    ) throws IOException {
        write(
                request,
                response,
                HttpStatus.FORBIDDEN,
                "ACESSO_NEGADO",
                "Acesso negado",
                "A conta autenticada não possui permissão para esta operação."
        );
    }

    private void write(
            HttpServletRequest request,
            HttpServletResponse response,
            HttpStatus status,
            String code,
            String title,
            String message
    ) throws IOException {
        if (response.isCommitted()) {
            return;
        }
        String reference = reference(request);
        String path = safePath(request);
        log.warn("Acesso rejeitado codigo={} status={} metodo={} caminho={} referencia={}",
                code, status.value(), request.getMethod(), path, reference);
        response.setStatus(status.value());
        response.setCharacterEncoding("UTF-8");
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), ErroResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(status.value())
                .codigo(code)
                .erro(title)
                .mensagem(message)
                .caminho(path)
                .referencia(reference)
                .build());
    }

    private String reference(HttpServletRequest request) {
        Object value = request.getAttribute(RequestCorrelationFilter.REQUEST_ATTRIBUTE);
        return value instanceof String correlationId ? correlationId : "indisponivel";
    }

    private String safePath(HttpServletRequest request) {
        String path = request.getRequestURI().replace('\r', '_').replace('\n', '_');
        return path.length() <= 200 ? path : path.substring(0, 200);
    }
}
