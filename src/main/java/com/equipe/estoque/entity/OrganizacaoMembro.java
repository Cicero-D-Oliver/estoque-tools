package com.equipe.estoque.entity;

import com.equipe.estoque.enums.PerfilMembroOrganizacao;
import com.equipe.estoque.enums.StatusMembroOrganizacao;
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
        name = "organizacao_membros",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_organizacao_membros_organizacao_usuario",
                columnNames = {"organizacao_id", "usuario_id"}
        ),
        indexes = {
                @Index(
                        name = "idx_org_membros_organizacao_status",
                        columnList = "organizacao_id, status"
                ),
                @Index(name = "idx_org_membros_usuario_status", columnList = "usuario_id, status"),
                @Index(name = "idx_org_membros_aprovado_por", columnList = "aprovado_por_usuario_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrganizacaoMembro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    @Builder.Default
    @Column(nullable = false, columnDefinition = "BIGINT DEFAULT 0")
    private Long versao = 0L;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organizacao_id", nullable = false)
    private Organizacao organizacao;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PerfilMembroOrganizacao perfil;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusMembroOrganizacao status;

    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime solicitadoEm = LocalDateTime.now();

    @Column
    private LocalDateTime aprovadoEm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "aprovado_por_usuario_id")
    private Usuario aprovadoPorUsuario;

    @Column
    private LocalDateTime removidoEm;

    @Column
    private LocalDateTime ultimaVisualizacaoMovimentacoesEm;
}
