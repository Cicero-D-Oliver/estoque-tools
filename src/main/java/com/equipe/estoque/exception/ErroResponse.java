package com.equipe.estoque.exception;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(name = "Erro", description = "Formato uniforme de erro da API")
public class ErroResponse {

    @Schema(example = "2026-08-04T10:15:30")
    private LocalDateTime timestamp;

    @Schema(example = "400")
    private Integer status;

    @Schema(example = "DADOS_INVALIDOS")
    private String codigo;

    @Schema(example = "Dados inválidos")
    private String erro;

    @Schema(example = "Um ou mais campos estão inválidos. Veja o detalhe em 'campos'.")
    private String mensagem;

    @Schema(example = "/api/usuarios")
    private String caminho;

    @Schema(description = "Identificador seguro para correlacionar resposta e logs", example = "a7662424-1c18-41e5-9c77-fb691a56af12")
    private String referencia;

    @Schema(description = "Erros de validação organizados por campo", example = "{\"email\":\"E-mail é obrigatório\"}")
    private Map<String, String> campos;
}
