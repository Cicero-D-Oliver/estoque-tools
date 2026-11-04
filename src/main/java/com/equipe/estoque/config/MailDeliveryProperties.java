package com.equipe.estoque.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "app.mail")
public class MailDeliveryProperties {

    private String deliveryMode = "disabled";
    private String from = "";
}
