package com.equipe.estoque.entity;

import com.equipe.estoque.enums.StatusFerramenta;
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
import org.hibernate.annotations.Check;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "ferramentas",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_ferramentas_organizacao_patrimonio",
                        columnNames = {"organizacao_id", "patrimonio"}
                ),
                @UniqueConstraint(
                        name = "uk_ferramentas_organizacao_id",
                        columnNames = {"organizacao_id", "id"}
                )
        },
        indexes = {
                @Index(name = "idx_ferramentas_status_ativo", columnList = "status, ativo"),
                @Index(name = "idx_ferramentas_responsavel", columnList = "responsavel_atual_id"),
                @Index(
                        name = "idx_ferramentas_organizacao_status_ativo",
                        columnList = "organizacao_id, status, ativo"
                )
        }
)
@Check(constraints = "((status = 'EMPRESTADA' AND responsavel_atual_id IS NOT NULL) OR "
        + "(status <> 'EMPRESTADA' AND responsavel_atual_id IS NULL)) AND "
        + "(status = 'EMPRESTADA' OR (responsavel_desde IS NULL AND destino_atual IS NULL))")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ferramenta {

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

    @Column(nullable = false, length = 60)
    private String patrimonio;

    @Column(nullable = false, length = 120)
    private String nome;

    @Column(length = 80)
    private String categoria;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusFerramenta status = StatusFerramenta.DISPONIVEL;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsavel_atual_id")
    private Usuario responsavelAtual;

    @Column(name = "responsavel_desde")
    private LocalDateTime responsavelDesde;

    @Column(name = "destino_atual", length = 160)
    private String destinoAtual;

    @Column(length = 120)
    private String localizacao;

    @Builder.Default
    @Column(nullable = false)
    private Boolean ativo = true;
}
