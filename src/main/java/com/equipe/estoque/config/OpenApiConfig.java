package com.equipe.estoque.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.DateTimeSchema;
import io.swagger.v3.oas.models.media.IntegerSchema;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.ObjectSchema;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.tags.Tag;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI estoqueOpenApi() {
        Components components = new Components();
        components
                .addSchemas("Erro", errorSchema())
                .addResponses("BadRequest", errorResponse("Requisição inválida ou regra de negócio violada"))
                .addResponses("NotFound", errorResponse("Recurso não encontrado"))
                .addResponses("Conflict", errorResponse("Conflito de integridade ou atualização concorrente"))
                .addResponses("InternalError", errorResponse("Falha interna sem exposição de detalhes técnicos"));

        return new OpenAPI()
                .info(new Info()
                        .title("API de Estoque e Ferramentas")
                        .version("1.0.0")
                        .description("API REST para cadastros, saldos, empréstimos e trilhas imutáveis de movimentação. "
                                + "Autenticação de usuários finais ainda não faz parte desta versão.")
                        .contact(new Contact().name("Equipe do projeto")))
                .components(components)
                .tags(List.of(
                        new Tag().name("Usuários").description("Cadastro de responsáveis pelas operações"),
                        new Tag().name("Itens de estoque").description("Itens consumíveis e movimentações de saldo"),
                        new Tag().name("Ferramentas").description("Ferramentas patrimoniais, empréstimos e estados"),
                        new Tag().name("Auditoria de estoque").description("Consulta imutável de movimentações de itens"),
                        new Tag().name("Auditoria de ferramentas").description("Consulta imutável de movimentações patrimoniais")
                ));
    }

    private ApiResponse errorResponse(String description) {
        Schema<?> schema = new Schema<>().$ref("#/components/schemas/Erro");
        return new ApiResponse().description(description)
                .content(new Content().addMediaType("application/json", new MediaType().schema(schema)));
    }

    private Schema<?> errorSchema() {
        ObjectSchema fields = new ObjectSchema();

        return new ObjectSchema()
                .addProperty("timestamp", new DateTimeSchema().example("2026-08-04T10:15:30"))
                .addProperty("status", new IntegerSchema().example(400))
                .addProperty("codigo", new StringSchema().example("DADOS_INVALIDOS"))
                .addProperty("erro", new StringSchema().example("Dados inválidos"))
                .addProperty("mensagem", new StringSchema().example("Um ou mais campos estão inválidos."))
                .addProperty("caminho", new StringSchema().example("/api/usuarios"))
                .addProperty("referencia", new StringSchema().example("a7662424-1c18-41e5-9c77-fb691a56af12"))
                .addProperty("campos", fields);
    }
}
