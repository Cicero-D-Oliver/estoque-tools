package com.equipe.estoque.mail;

import com.equipe.estoque.exception.BusinessException;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(
        prefix = "app.mail",
        name = "delivery-mode",
        havingValue = "disabled",
        matchIfMissing = true
)
public class DisabledOnboardingEmailSender implements OnboardingEmailSender {

    @Override
    public void send(OnboardingEmail email) {
        throw new BusinessException("A entrega de e-mail ainda não está configurada.");
    }
}
