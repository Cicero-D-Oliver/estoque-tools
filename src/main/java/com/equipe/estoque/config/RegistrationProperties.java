package com.equipe.estoque.config;

import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "app.registration")
public class RegistrationProperties {

    @NotEmpty
    private List<String> allowedEmailDomains = new ArrayList<>();

    private boolean publicRegistrationEnabled;
}
