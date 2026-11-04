package com.equipe.estoque.mail;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Component
@ConditionalOnProperty(prefix = "app.mail", name = "delivery-mode", havingValue = "memory")
public class InMemoryOnboardingEmailSender implements OnboardingEmailSender {

    private final Map<String, OnboardingEmail> deliveries = new ConcurrentHashMap<>();

    @Override
    public void send(OnboardingEmail email) {
        deliveries.put(email.destination(), email);
    }

    public Optional<OnboardingEmail> latestFor(String email) {
        return Optional.ofNullable(deliveries.get(email));
    }

    public void clear() {
        deliveries.clear();
    }
}
