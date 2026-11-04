package com.equipe.estoque.service;

import com.equipe.estoque.config.OnboardingProperties;
import com.equipe.estoque.dto.onboarding.AtivacaoConcluidaResponseDTO;
import com.equipe.estoque.dto.onboarding.AtivacaoPreviewResponseDTO;
import com.equipe.estoque.dto.onboarding.BootstrapStatusResponseDTO;
import com.equipe.estoque.dto.onboarding.ConcluirAtivacaoRequestDTO;
import com.equipe.estoque.dto.onboarding.ConviteOnboardingResponseDTO;
import com.equipe.estoque.entity.BootstrapOnboarding;
import com.equipe.estoque.entity.ConviteOnboarding;
import com.equipe.estoque.entity.Organizacao;
import com.equipe.estoque.entity.OrganizacaoMembro;
import com.equipe.estoque.entity.Usuario;
import com.equipe.estoque.enums.PerfilMembroOrganizacao;
import com.equipe.estoque.enums.PerfilUsuario;
import com.equipe.estoque.enums.StatusConviteOnboarding;
import com.equipe.estoque.enums.StatusMembroOrganizacao;
import com.equipe.estoque.enums.TipoConviteOnboarding;
import com.equipe.estoque.exception.BusinessException;
import com.equipe.estoque.exception.ResourceNotFoundException;
import com.equipe.estoque.mail.OnboardingEmail;
import com.equipe.estoque.mail.OnboardingEmailSender;
import com.equipe.estoque.repository.BootstrapOnboardingRepository;
import com.equipe.estoque.repository.ConviteOnboardingRepository;
import com.equipe.estoque.repository.OrganizacaoMembroRepository;
import com.equipe.estoque.repository.OrganizacaoRepository;
import com.equipe.estoque.repository.UsuarioRepository;
import com.equipe.estoque.security.EmailDomainPolicy;
import com.equipe.estoque.security.OpaqueTokenService;
import com.equipe.estoque.security.PasswordPolicy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class OnboardingService {

    private static final String INVALID_ACTIVATION = "Link de ativação inválido ou indisponível.";

    private final BootstrapOnboardingRepository bootstrapRepository;
    private final ConviteOnboardingRepository conviteRepository;
    private final OrganizacaoRepository organizacaoRepository;
    private final OrganizacaoMembroRepository membroRepository;
    private final UsuarioRepository usuarioRepository;
    private final OrganizacaoService organizacaoService;
    private final OnboardingProperties properties;
    private final OpaqueTokenService opaqueTokenService;
    private final OnboardingEmailSender emailSender;
    private final EmailDomainPolicy emailDomainPolicy;
    private final PasswordPolicy passwordPolicy;
    private final PasswordEncoder passwordEncoder;

    public BootstrapStatusResponseDTO bootstrapStatus() {
        BootstrapOnboarding bootstrap = bootstrapRepository.findById(BootstrapOnboarding.SINGLETON_ID)
                .orElseThrow(() -> new IllegalStateException("Estado de bootstrap ausente"));
        return new BootstrapStatusResponseDTO(!Boolean.TRUE.equals(bootstrap.getConcluido())
                && bootstrapConfigurationPresent());
    }

    @Transactional
    public void requestBootstrap(String requestedEmail) {
        String email = normalizeEmail(requestedEmail);
        emailDomainPolicy.validate(email);
        BootstrapOnboarding bootstrap = lockBootstrap();
        if (Boolean.TRUE.equals(bootstrap.getConcluido())) {
            throw new BusinessException("A ativação inicial já foi concluída.");
        }
        if (!bootstrapConfigurationPresent()
                || !normalizeEmail(properties.getInitialAdminEmail()).equals(email)) {
            throw new BusinessException("Não foi possível iniciar a ativação com os dados informados.");
        }

        ConviteOnboarding invitation = bootstrap.getConvite();
        LocalDateTime currentTime = now();
        if (invitation != null
                && invitation.getStatus() == StatusConviteOnboarding.PENDENTE
                && invitation.getReenvioPermitidoEm().isAfter(currentTime)) {
            return;
        }
        InvitationDelivery delivery = issueInvitation(
                invitation,
                TipoConviteOnboarding.BOOTSTRAP,
                email,
                null,
                PerfilMembroOrganizacao.ADMIN,
                null,
                currentTime
        );
        bootstrap.setEmailConfigurado(email);
        bootstrap.setConvite(delivery.invitation());
        bootstrapRepository.save(bootstrap);
        send(delivery);
        log.info("Ativação inicial solicitada conviteId={}", delivery.invitation().getId());
    }

    @Transactional
    public ConviteOnboardingResponseDTO createInvitation(
            Long organizationId,
            Long adminId,
            String requestedEmail,
            PerfilMembroOrganizacao profile
    ) {
        Organizacao organization = lockActiveOrganization(organizationId);
        Usuario admin = requireActiveAdmin(organizationId, adminId).getUsuario();
        validateInvitableProfile(profile);
        String email = normalizeEmail(requestedEmail);
        emailDomainPolicy.validate(email);

        Usuario account = usuarioRepository.findByEmailIgnoreCase(email).orElse(null);
        if (account != null) {
            membroRepository.findByOrganizacaoIdAndUsuarioId(organizationId, account.getId())
                    .filter(member -> member.getStatus() == StatusMembroOrganizacao.ATIVO)
                    .ifPresent(member -> {
                        throw new BusinessException("Esta pessoa já faz parte da equipe.");
                    });
        }

        ConviteOnboarding existing = conviteRepository
                .findByOrganizacaoIdAndEmailForUpdate(organizationId, email)
                .orElse(null);
        LocalDateTime currentTime = now();
        if (existing != null
                && existing.getStatus() == StatusConviteOnboarding.PENDENTE
                && existing.getReenvioPermitidoEm().isAfter(currentTime)) {
            return toResponse(existing, currentTime);
        }

        InvitationDelivery delivery = issueInvitation(
                existing,
                TipoConviteOnboarding.ORGANIZACAO,
                email,
                organization,
                profile,
                admin,
                currentTime
        );
        send(delivery);
        log.info("Convite de organização emitido organizacaoId={} conviteId={} adminId={}",
                organizationId, delivery.invitation().getId(), adminId);
        return toResponse(delivery.invitation(), currentTime);
    }

    public List<ConviteOnboardingResponseDTO> listInvitations(Long organizationId, Long adminId) {
        requireActiveAdmin(organizationId, adminId);
        LocalDateTime currentTime = now();
        return conviteRepository.findByOrganizacaoIdOrderByCriadoEmDescIdDesc(organizationId).stream()
                .map(invitation -> toResponse(invitation, currentTime))
                .toList();
    }

    public AtivacaoPreviewResponseDTO preview(String rawToken) {
        if (rawToken == null || rawToken.isBlank() || rawToken.length() > 200) {
            return invalidPreview();
        }
        ConviteOnboarding invitation = conviteRepository
                .findByTokenHash(opaqueTokenService.hash(rawToken))
                .orElse(null);
        if (invitation == null || invitation.getStatus() == StatusConviteOnboarding.REVOGADO) {
            return invalidPreview();
        }
        if (invitation.getStatus() == StatusConviteOnboarding.CONFIRMADO) {
            return previewOf(invitation, "UTILIZADO", false);
        }
        if (!invitation.getExpiraEm().isAfter(now())) {
            return previewOf(invitation, "EXPIRADO", false);
        }
        boolean requiresAccountData = usuarioRepository.findByEmailIgnoreCase(invitation.getEmail())
                .map(account -> account.getSenhaHash() == null)
                .orElse(true);
        return previewOf(invitation, "VALIDO", requiresAccountData);
    }

    @Transactional
    public AtivacaoConcluidaResponseDTO complete(ConcluirAtivacaoRequestDTO request) {
        ConviteOnboarding invitation = conviteRepository
                .findByTokenHashForUpdate(opaqueTokenService.hash(request.getToken()))
                .orElseThrow(() -> new BusinessException(INVALID_ACTIVATION));
        LocalDateTime currentTime = now();
        if (invitation.getStatus() != StatusConviteOnboarding.PENDENTE) {
            throw new BusinessException(INVALID_ACTIVATION);
        }
        if (!invitation.getExpiraEm().isAfter(currentTime)) {
            invitation.setStatus(StatusConviteOnboarding.EXPIRADO);
            conviteRepository.save(invitation);
            throw new BusinessException(INVALID_ACTIVATION);
        }

        Usuario account = usuarioRepository.findByEmailIgnoreCaseForUpdate(invitation.getEmail())
                .map(existing -> initializeCredentialsIfRequired(existing, request, currentTime))
                .orElseGet(() -> createAccount(request, invitation.getEmail(), currentTime));
        if (!Boolean.TRUE.equals(account.getAtivo())) {
            throw new BusinessException(INVALID_ACTIVATION);
        }

        if (invitation.getTipo() == TipoConviteOnboarding.BOOTSTRAP) {
            completeBootstrap(invitation, account, currentTime);
        } else {
            activateMembership(invitation, account, currentTime);
        }
        invitation.setStatus(StatusConviteOnboarding.CONFIRMADO);
        invitation.setConfirmadoEm(currentTime);
        invitation.setUsuarioConfirmado(account);
        conviteRepository.save(invitation);
        log.info("Ativação concluída conviteId={} usuarioId={} tipo={}",
                invitation.getId(), account.getId(), invitation.getTipo());
        return new AtivacaoConcluidaResponseDTO("Acesso ativado. Entre com seu e-mail e senha.");
    }

    private void completeBootstrap(
            ConviteOnboarding invitation,
            Usuario account,
            LocalDateTime currentTime
    ) {
        BootstrapOnboarding bootstrap = lockBootstrap();
        if (Boolean.TRUE.equals(bootstrap.getConcluido())
                || bootstrap.getConvite() == null
                || !bootstrap.getConvite().getId().equals(invitation.getId())
                || !normalizeEmail(properties.getInitialAdminEmail()).equals(invitation.getEmail())) {
            throw new BusinessException(INVALID_ACTIVATION);
        }
        Organizacao organization = organizacaoService.criar(
                properties.getInitialOrganizationName(),
                account.getId()
        );
        bootstrap.setConcluido(true);
        bootstrap.setUsuario(account);
        bootstrap.setOrganizacao(organization);
        bootstrap.setConcluidoEm(currentTime);
        bootstrapRepository.save(bootstrap);
    }

    private void activateMembership(
            ConviteOnboarding invitation,
            Usuario account,
            LocalDateTime currentTime
    ) {
        Long organizationId = invitation.getOrganizacao().getId();
        Organizacao organization = lockActiveOrganization(organizationId);
        Usuario admin = invitation.getCriadoPorUsuario();
        requireActiveAdmin(organizationId, admin.getId());
        OrganizacaoMembro member = membroRepository
                .findByOrganizacaoIdAndUsuarioId(organizationId, account.getId())
                .orElseGet(() -> OrganizacaoMembro.builder()
                        .organizacao(organization)
                        .usuario(account)
                        .build());
        if (member.getStatus() == StatusMembroOrganizacao.ATIVO) {
            throw new BusinessException("Esta pessoa já faz parte da equipe.");
        }
        if (member.getStatus() == StatusMembroOrganizacao.REJEITADO) {
            throw new BusinessException("Este acesso não pode ser reativado por convite.");
        }
        member.setPerfil(invitation.getPerfil());
        member.setStatus(StatusMembroOrganizacao.ATIVO);
        member.setSolicitadoEm(currentTime);
        member.setAprovadoEm(currentTime);
        member.setAprovadoPorUsuario(admin);
        member.setRemovidoEm(null);
        membroRepository.save(member);
    }

    private Usuario createAccount(
            ConcluirAtivacaoRequestDTO request,
            String email,
            LocalDateTime currentTime
    ) {
        if (request.getNome() == null || request.getNome().isBlank()) {
            throw new BusinessException("Nome é obrigatório para criar a conta.");
        }
        if (!Objects.equals(request.getSenha(), request.getConfirmacaoSenha())) {
            throw new BusinessException("As senhas não coincidem.");
        }
        passwordPolicy.validate(request.getSenha());
        return usuarioRepository.save(Usuario.builder()
                .nome(request.getNome().trim())
                .email(email)
                .senhaHash(passwordEncoder.encode(request.getSenha()))
                .senhaAlteradaEm(currentTime)
                .perfil(PerfilUsuario.CONSULTA)
                .ativo(true)
                .build());
    }

    private Usuario initializeCredentialsIfRequired(
            Usuario account,
            ConcluirAtivacaoRequestDTO request,
            LocalDateTime currentTime
    ) {
        if (account.getSenhaHash() != null) {
            return account;
        }
        if (!Objects.equals(request.getSenha(), request.getConfirmacaoSenha())) {
            throw new BusinessException("As senhas não coincidem.");
        }
        passwordPolicy.validate(request.getSenha());
        account.setSenhaHash(passwordEncoder.encode(request.getSenha()));
        account.setSenhaAlteradaEm(currentTime);
        return usuarioRepository.save(account);
    }

    private InvitationDelivery issueInvitation(
            ConviteOnboarding existing,
            TipoConviteOnboarding type,
            String email,
            Organizacao organization,
            PerfilMembroOrganizacao profile,
            Usuario creator,
            LocalDateTime currentTime
    ) {
        OpaqueTokenService.TokenMaterial token = opaqueTokenService.issue();
        ConviteOnboarding invitation = existing == null ? new ConviteOnboarding() : existing;
        invitation.setTipo(type);
        invitation.setStatus(StatusConviteOnboarding.PENDENTE);
        invitation.setEmail(email);
        invitation.setOrganizacao(organization);
        invitation.setPerfil(profile);
        invitation.setTokenHash(token.hash());
        invitation.setCriadoEm(existing == null ? currentTime : invitation.getCriadoEm());
        invitation.setEnviadoEm(currentTime);
        invitation.setExpiraEm(currentTime.plus(properties.getEmailVerificationTokenTtl()));
        invitation.setReenvioPermitidoEm(currentTime.plus(properties.getInvitationResendCooldown()));
        invitation.setConfirmadoEm(null);
        invitation.setCriadoPorUsuario(creator);
        invitation.setUsuarioConfirmado(null);
        invitation = conviteRepository.save(invitation);
        String activationUrl = UriComponentsBuilder
                .fromUriString(properties.getPublicBaseUrl())
                .path("/ativar")
                .queryParam("token", token.raw())
                .build()
                .toUriString();
        return new InvitationDelivery(invitation, activationUrl);
    }

    private void send(InvitationDelivery delivery) {
        ConviteOnboarding invitation = delivery.invitation();
        emailSender.send(new OnboardingEmail(
                invitation.getEmail(),
                delivery.activationUrl(),
                invitation.getExpiraEm(),
                invitation.getTipo()
        ));
    }

    private ConviteOnboardingResponseDTO toResponse(
            ConviteOnboarding invitation,
            LocalDateTime currentTime
    ) {
        StatusConviteOnboarding status = invitation.getStatus();
        if (status == StatusConviteOnboarding.PENDENTE
                && !invitation.getExpiraEm().isAfter(currentTime)) {
            status = StatusConviteOnboarding.EXPIRADO;
        }
        return new ConviteOnboardingResponseDTO(
                invitation.getId(),
                invitation.getEmail(),
                invitation.getPerfil(),
                status,
                invitation.getEnviadoEm(),
                invitation.getExpiraEm(),
                invitation.getConfirmadoEm()
        );
    }

    private AtivacaoPreviewResponseDTO previewOf(
            ConviteOnboarding invitation,
            String state,
            boolean requiresAccountData
    ) {
        String organizationName = invitation.getOrganizacao() == null
                ? properties.getInitialOrganizationName()
                : invitation.getOrganizacao().getNome();
        return new AtivacaoPreviewResponseDTO(
                state,
                maskEmail(invitation.getEmail()),
                organizationName,
                requiresAccountData
        );
    }

    private AtivacaoPreviewResponseDTO invalidPreview() {
        return new AtivacaoPreviewResponseDTO("INVALIDO", null, null, false);
    }

    private String maskEmail(String email) {
        int separator = email.indexOf('@');
        String local = email.substring(0, separator);
        String visible = local.substring(0, Math.min(2, local.length()));
        return visible + "***" + email.substring(separator);
    }

    private BootstrapOnboarding lockBootstrap() {
        return bootstrapRepository.findByIdForUpdate(BootstrapOnboarding.SINGLETON_ID)
                .orElseThrow(() -> new IllegalStateException("Estado de bootstrap ausente"));
    }

    private Organizacao lockActiveOrganization(Long organizationId) {
        return organizacaoRepository.findByIdForUpdate(organizationId)
                .filter(organization -> Boolean.TRUE.equals(organization.getAtiva()))
                .orElseThrow(() -> new ResourceNotFoundException("Organização não encontrada"));
    }

    private OrganizacaoMembro requireActiveAdmin(Long organizationId, Long userId) {
        return membroRepository.findByOrganizacaoIdAndUsuarioId(organizationId, userId)
                .filter(member -> member.getStatus() == StatusMembroOrganizacao.ATIVO)
                .filter(member -> member.getPerfil() == PerfilMembroOrganizacao.ADMIN)
                .filter(member -> Boolean.TRUE.equals(member.getOrganizacao().getAtiva()))
                .filter(member -> Boolean.TRUE.equals(member.getUsuario().getAtivo()))
                .orElseThrow(() -> new AccessDeniedException("Acesso negado"));
    }

    private void validateInvitableProfile(PerfilMembroOrganizacao profile) {
        if (profile != PerfilMembroOrganizacao.OPERADOR
                && profile != PerfilMembroOrganizacao.CONSULTA) {
            throw new BusinessException("Convites permitem somente os perfis OPERADOR ou CONSULTA.");
        }
    }

    private boolean bootstrapConfigurationPresent() {
        return properties.getInitialAdminEmail() != null
                && !properties.getInitialAdminEmail().isBlank()
                && properties.getInitialOrganizationName() != null
                && !properties.getInitialOrganizationName().isBlank()
                && properties.getPublicBaseUrl() != null
                && !properties.getPublicBaseUrl().isBlank();
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private LocalDateTime now() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }

    private record InvitationDelivery(ConviteOnboarding invitation, String activationUrl) {
    }
}
