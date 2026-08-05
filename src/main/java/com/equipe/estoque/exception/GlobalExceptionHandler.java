package com.equipe.estoque.exception;

import com.equipe.estoque.config.RequestCorrelationFilter;
import jakarta.persistence.OptimisticLockException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.TreeMap;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErroResponse> handleBusinessException(
            BusinessException ex,
            HttpServletRequest request
    ) {
        return respond(HttpStatus.BAD_REQUEST, "REGRA_NEGOCIO", "Regra de negócio violada",
                ex.getMessage(), null, request);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErroResponse> handleNotFoundException(
            ResourceNotFoundException ex,
            HttpServletRequest request
    ) {
        return respond(HttpStatus.NOT_FOUND, "RECURSO_NAO_ENCONTRADO", "Recurso não encontrado",
                ex.getMessage(), null, request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErroResponse> handleValidationException(
            MethodArgumentNotValidException ex,
            HttpServletRequest request
    ) {
        Map<String, String> fields = new TreeMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
                fields.putIfAbsent(error.getField(), error.getDefaultMessage()));
        return invalidFields(fields, request);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErroResponse> handleConstraintViolation(
            ConstraintViolationException ex,
            HttpServletRequest request
    ) {
        Map<String, String> fields = new TreeMap<>();
        ex.getConstraintViolations().forEach(violation ->
                fields.putIfAbsent(violation.getPropertyPath().toString(), violation.getMessage()));
        return invalidFields(fields, request);
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ErroResponse> handleMethodValidation(
            HandlerMethodValidationException ex,
            HttpServletRequest request
    ) {
        return respond(HttpStatus.BAD_REQUEST, "DADOS_INVALIDOS", "Dados inválidos",
                "Um ou mais parâmetros da requisição são inválidos.", null, request);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ErroResponse> handleMalformedRequest(Exception ex, HttpServletRequest request) {
        return respond(HttpStatus.BAD_REQUEST, "REQUISICAO_MALFORMADA", "Requisição malformada",
                "O corpo ou um parâmetro contém formato ou valor não suportado.", null, request);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErroResponse> handleMissingParameter(
            MissingServletRequestParameterException ex,
            HttpServletRequest request
    ) {
        return respond(HttpStatus.BAD_REQUEST, "PARAMETRO_OBRIGATORIO", "Parâmetro obrigatório ausente",
                "A requisição não contém todos os parâmetros obrigatórios.", null, request);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErroResponse> handleUnknownRoute(
            NoResourceFoundException ex,
            HttpServletRequest request
    ) {
        return respond(HttpStatus.NOT_FOUND, "ROTA_NAO_ENCONTRADA", "Rota não encontrada",
                "O endereço solicitado não existe.", null, request);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErroResponse> handleMethodNotAllowed(
            HttpRequestMethodNotSupportedException ex,
            HttpServletRequest request
    ) {
        return respond(HttpStatus.METHOD_NOT_ALLOWED, "METODO_NAO_PERMITIDO", "Método não permitido",
                "O método HTTP não é aceito para este endereço.", null, request);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErroResponse> handleDataIntegrity(
            DataIntegrityViolationException ex,
            HttpServletRequest request
    ) {
        return respond(HttpStatus.CONFLICT, "CONFLITO_DADOS", "Conflito de dados",
                "A operação conflita com uma restrição de integridade.", null, request);
    }

    @ExceptionHandler({ObjectOptimisticLockingFailureException.class, OptimisticLockException.class})
    public ResponseEntity<ErroResponse> handleConcurrentUpdate(Exception ex, HttpServletRequest request) {
        return respond(HttpStatus.CONFLICT, "ATUALIZACAO_CONCORRENTE", "Atualização concorrente",
                "O registro foi alterado por outra operação. Consulte-o novamente e repita a ação.", null, request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErroResponse> handleGenericException(Exception ex, HttpServletRequest request) {
        String reference = reference(request);
        log.error("Falha inesperada tipo={} metodo={} caminho={} referencia={}",
                ex.getClass().getSimpleName(), request.getMethod(), safePath(request), reference);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "ERRO_INTERNO", "Erro interno do servidor",
                "Não foi possível concluir a operação. Informe a referência ao suporte.", null, request, reference);
    }

    private ResponseEntity<ErroResponse> invalidFields(Map<String, String> fields, HttpServletRequest request) {
        return respond(HttpStatus.BAD_REQUEST, "DADOS_INVALIDOS", "Dados inválidos",
                "Um ou mais campos estão inválidos. Veja o detalhe em 'campos'.", fields, request);
    }

    private ResponseEntity<ErroResponse> respond(
            HttpStatus status,
            String code,
            String title,
            String message,
            Map<String, String> fields,
            HttpServletRequest request
    ) {
        String reference = reference(request);
        log.warn("Requisição rejeitada codigo={} status={} metodo={} caminho={} referencia={}",
                code, status.value(), request.getMethod(), safePath(request), reference);
        return build(status, code, title, message, fields, request, reference);
    }

    private ResponseEntity<ErroResponse> build(
            HttpStatus status,
            String code,
            String title,
            String message,
            Map<String, String> fields,
            HttpServletRequest request,
            String reference
    ) {
        ErroResponse error = ErroResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(status.value())
                .codigo(code)
                .erro(title)
                .mensagem(message)
                .caminho(safePath(request))
                .referencia(reference)
                .campos(fields)
                .build();
        return ResponseEntity.status(status).body(error);
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
