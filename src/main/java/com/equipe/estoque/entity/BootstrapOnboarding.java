package com.equipe.estoque.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "onboarding_bootstrap")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BootstrapOnboarding {

    public static final short SINGLETON_ID = 1;

    @Id
    private Short id;

    @Version
    @Builder.Default
    @Column(nullable = false)
    private Long versao = 0L;

    @Builder.Default
    @Column(nullable = false)
    private Boolean concluido = false;

    @Column(name = "email_configurado", length = 254)
    private String emailConfigurado;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "convite_id")
    private ConviteOnboarding convite;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organizacao_id")
    private Organizacao organizacao;

    @Column(name = "concluido_em")
    private LocalDateTime concluidoEm;
}
