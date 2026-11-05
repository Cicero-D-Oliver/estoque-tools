package com.equipe.estoque.config;

import com.equipe.estoque.security.EmailDomainPolicy;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.net.URI;

@Component
@Profile("prod")
public class ProductionOnboardingValidator implements ApplicationRunner {

    private final OnboardingProperties onboarding;
    private final MailDeliveryProperties mail;
    private final RegistrationProperties registration;
    private final EmailDomainPolicy emailDomainPolicy;
    private final Environment environment;

    public ProductionOnboardingValidator(
            OnboardingProperties onboarding,
            MailDeliveryProperties mail,
            RegistrationProperties registration,
            EmailDomainPolicy emailDomainPolicy,
            Environment environment
    ) {
        this.onboarding = onboarding;
        this.mail = mail;
        this.registration = registration;
        this.emailDomainPolicy = emailDomainPolicy;
        this.environment = environment;
    }

    @Override
    public void run(ApplicationArguments args) {
        require(onboarding.getInitialAdminEmail(), "APP_INITIAL_ADMIN_EMAIL");
        if (!emailDomainPolicy.isAllowed(onboarding.getInitialAdminEmail())) {
            throw new IllegalStateException("APP_INITIAL_ADMIN_EMAIL deve usar um domínio autorizado");
        }
        if (registration.isPublicRegistrationEnabled()) {
            throw new IllegalStateException("APP_PUBLIC_REGISTRATION_ENABLED deve permanecer false em produção");
        }
        require(onboarding.getInitialOrganizationName(), "APP_INITIAL_ORGANIZATION_NAME");
        require(onboarding.getPublicBaseUrl(), "APP_PUBLIC_BASE_URL");
        URI publicUrl = URI.create(onboarding.getPublicBaseUrl());
        if (!"https".equalsIgnoreCase(publicUrl.getScheme()) || publicUrl.getHost() == null) {
            throw new IllegalStateException("APP_PUBLIC_BASE_URL deve ser uma URL HTTPS externa em produção");
        }
        if (!"smtp".equalsIgnoreCase(mail.getDeliveryMode())) {
            throw new IllegalStateException("Produção exige APP_MAIL_DELIVERY_MODE=smtp");
        }
        require(mail.getFrom(), "APP_MAIL_FROM");
        require(environment.getProperty("spring.mail.host", ""), "MAIL_HOST");
        if (environment.getProperty("spring.mail.properties.mail.smtp.auth", Boolean.class, true)) {
            require(environment.getProperty("spring.mail.username", ""), "MAIL_USERNAME");
            require(environment.getProperty("spring.mail.password", ""), "MAIL_PASSWORD");
        }
    }

    private void require(String value, String variable) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(variable + " deve ser configurada em produção");
        }
    }
}
