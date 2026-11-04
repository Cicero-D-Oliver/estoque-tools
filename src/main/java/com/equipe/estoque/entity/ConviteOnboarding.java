package com.equipe.estoque.entity;

import com.equipe.estoque.enums.PerfilMembroOrganizacao;
import com.equipe.estoque.enums.StatusConviteOnboarding;
import com.equipe.estoque.enums.TipoConviteOnboarding;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "convites_onboarding",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_convites_onboarding_token_hash", columnNames = "token_hash"),
                @UniqueConstraint(
                        name = "uk_convites_onboarding_organizacao_email",
                        columnNames = {"organizacao_id", "email"}
                )
        },
        indexes = {
                @Index(name = "idx_convites_onboarding_estado_expiracao", columnList = "status, expira_em"),
                @Index(name = "idx_convites_onboarding_criado_por", columnList = "criado_por_usuario_id")
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConviteOnboarding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    @Builder.Default
    @Column(nullable = false)
    private Long versao = 0L;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoConviteOnboarding tipo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusConviteOnboarding status;

    @Column(nullable = false, length = 254)
    private String email;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organizacao_id")
    private Organizacao organizacao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PerfilMembroOrganizacao perfil;

    @JsonIgnore
    @Column(name = "token_hash", nullable = false, length = 64)
    private String tokenHash;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    @Column(name = "enviado_em", nullable = false)
    private LocalDateTime enviadoEm;

    @Column(name = "expira_em", nullable = false)
    private LocalDateTime expiraEm;

    @Column(name = "reenvio_permitido_em", nullable = false)
    private LocalDateTime reenvioPermitidoEm;

    @Column(name = "confirmado_em")
    private LocalDateTime confirmadoEm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "criado_por_usuario_id")
    private Usuario criadoPorUsuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_confirmado_id")
    private Usuario usuarioConfirmado;
}
