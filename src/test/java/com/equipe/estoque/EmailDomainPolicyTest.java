package com.equipe.estoque;

import com.equipe.estoque.config.RegistrationProperties;
import com.equipe.estoque.exception.BusinessException;
import com.equipe.estoque.security.EmailDomainPolicy;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class EmailDomainPolicyTest {

    @Test
    void deveAceitarDominioCorporativoExatoSemDiferenciarMaiusculas() {
        EmailDomainPolicy policy = policy("scaladatacenters.com");

        assertDoesNotThrow(() -> policy.validate("Pessoa@SCALADATACENTERS.COM"));
    }

    @Test
    void deveRejeitarDominioExternoSufixoParecidoESubdominio() {
        EmailDomainPolicy policy = policy("scaladatacenters.com");

        assertThrows(BusinessException.class, () -> policy.validate("pessoa@gmail.com"));
        assertThrows(BusinessException.class, () -> policy.validate("pessoa@scaladatacenters.com.br"));
        assertThrows(BusinessException.class, () -> policy.validate("pessoa@fake-scaladatacenters.com"));
        assertThrows(BusinessException.class, () -> policy.validate("pessoa@sub.scaladatacenters.com"));
        assertThrows(BusinessException.class, () -> policy.validate("pessoa@outro@scaladatacenters.com"));
        assertThrows(BusinessException.class, () -> policy.validate(null));
    }

    @Test
    void devePermitirConfiguracaoFuturaComMaisDeUmDominio() {
        EmailDomainPolicy policy = policy("scaladatacenters.com", "outra-empresa.com");

        assertDoesNotThrow(() -> policy.validate("pessoa@outra-empresa.com"));
    }

    private EmailDomainPolicy policy(String... domains) {
        RegistrationProperties properties = new RegistrationProperties();
        properties.setAllowedEmailDomains(List.of(domains));
        return new EmailDomainPolicy(properties);
    }
}
