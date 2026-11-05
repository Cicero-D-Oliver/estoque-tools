package com.equipe.estoque.mail;

import com.equipe.estoque.config.MailDeliveryProperties;
import com.equipe.estoque.enums.TipoConviteOnboarding;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "app.mail", name = "delivery-mode", havingValue = "smtp")
public class SmtpOnboardingEmailSender implements OnboardingEmailSender {

    private final JavaMailSender mailSender;
    private final MailDeliveryProperties properties;

    public SmtpOnboardingEmailSender(JavaMailSender mailSender, MailDeliveryProperties properties) {
        this.mailSender = mailSender;
        this.properties = properties;
    }

    @Override
    public void send(OnboardingEmail email) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(properties.getFrom());
        message.setTo(email.destination());
        message.setSubject(email.type() == TipoConviteOnboarding.BOOTSTRAP
                ? "Ative o administrador inicial do Estoque Tools"
                : "Convite para o Estoque Tools");
        message.setText("Use o link abaixo para confirmar seu e-mail e concluir o acesso:\n\n"
                + email.activationUrl()
                + "\n\nO link expira em " + email.expiresAt() + " UTC.");
        mailSender.send(message);
    }
}
