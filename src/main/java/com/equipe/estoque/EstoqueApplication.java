package com.equipe.estoque;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import lombok.extern.slf4j.Slf4j;

/**
 * Ponto de entrada da aplicação.
 *
 * @SpringBootApplication combina três anotações:
 *   - @Configuration: esta classe pode registrar beans no Spring
 *   - @EnableAutoConfiguration: o Spring configura automaticamente o que detectar
 *   - @ComponentScan: o Spring varre este pacote e sub-pacotes procurando
 *     classes anotadas com @Service, @Repository, @Controller, etc.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
@Slf4j
public class EstoqueApplication {

    public static void main(String[] args) {
        SpringApplication.run(EstoqueApplication.class, args);
        log.info("Sistema de estoque iniciado com sucesso");
    }
}
