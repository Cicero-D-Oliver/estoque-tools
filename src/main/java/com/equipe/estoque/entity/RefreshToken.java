package com.equipe.estoque.entity;

import com.equipe.estoque.enums.MotivoRevogacaoRefresh;
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
import jakarta.persistence.OneToOne;
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
        name = "refresh_tokens",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_refresh_tokens_hash", columnNames = "token_hash"),
                @UniqueConstraint(name = "uk_refresh_tokens_substituto", columnNames = "substituido_por_id")
        },
        indexes = {
                @Index(name = "idx_refresh_tokens_usuario_revogado", columnList = "usuario_id, revogado_em"),
                @Index(name = "idx_refresh_tokens_familia", columnList = "familia_id"),
                @Index(name = "idx_refresh_tokens_expiracao", columnList = "expira_em")
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    @Builder.Default
    @Column(nullable = false)
    private Long versao = 0L;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(name = "familia_id", nullable = false, length = 36)
    private String familiaId;

    @JsonIgnore
    @Column(name = "token_hash", nullable = false, length = 64)
    private String tokenHash;

    @Column(name = "token_version", nullable = false)
    private Long tokenVersion;

    @Column(name = "emitido_em", nullable = false)
    private LocalDateTime emitidoEm;

    @Column(name = "expira_em", nullable = false)
    private LocalDateTime expiraEm;

    @Column(name = "revogado_em")
    private LocalDateTime revogadoEm;

    @Enumerated(EnumType.STRING)
    @Column(name = "motivo_revogacao", length = 30)
    private MotivoRevogacaoRefresh motivoRevogacao;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "substituido_por_id")
    private RefreshToken substituidoPor;
}
