package com.equipe.estoque.config;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.AssertTrue;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "app.cors")
public class CorsProperties {

    @NotEmpty
    private List<String> allowedOrigins = new ArrayList<>();

    @NotEmpty
    private List<String> allowedMethods = new ArrayList<>();

    @NotEmpty
    private List<String> allowedHeaders = new ArrayList<>();

    private List<String> exposedHeaders = new ArrayList<>();

    private boolean allowCredentials;

    @PositiveOrZero
    private long maxAge = 3600;

    @AssertTrue(message = "CORS com credenciais exige origens explícitas")
    public boolean isCredentialsConfigurationSafe() {
        return !allowCredentials || allowedOrigins.stream().noneMatch(origin -> origin.contains("*"));
    }
}
