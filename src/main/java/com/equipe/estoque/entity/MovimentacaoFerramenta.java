package com.equipe.estoque.entity;

import com.equipe.estoque.enums.TipoMovimentacaoFerramenta;
import com.equipe.estoque.enums.StatusRevisaoMovimentacao;
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
        name = "movimentacoes_ferramenta",
        indexes = {
                @Index(name = "idx_mov_ferramenta_ferramenta_data", columnList = "ferramenta_id, data_hora"),
                @Index(name = "idx_mov_ferramenta_usuario", columnList = "usuario_id"),
                @Index(name = "idx_mov_ferramenta_tipo_data", columnList = "tipo_movimentacao, data_hora"),
                @Index(
                        name = "idx_mov_ferramenta_organizacao_data",
                        columnList = "organizacao_id, data_hora"
                ),
                @Index(name = "idx_mov_ferramenta_responsavel", columnList = "responsavel_usuario_id"),
                @Index(
                        name = "idx_mov_ferramenta_organizacao_revisao_id",
                        columnList = "organizacao_id, status_revisao, id"
                )
        }
)
@Check(constraints = "((status_revisao = 'PENDENTE' AND confirmado_por_usuario_id IS NULL "
        + "AND confirmado_em IS NULL) OR (status_revisao = 'CONFIRMADA' AND "
        + "((confirmado_por_usuario_id IS NULL AND confirmado_em IS NULL) OR "
        + "(confirmado_por_usuario_id IS NOT NULL AND confirmado_em IS NOT NULL))))")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MovimentacaoFerramenta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    @Builder.Default
    @Column(nullable = false, columnDefinition = "BIGINT DEFAULT 0")
    private Long versao = 0L;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organizacao_id", nullable = false, updatable = false)
    private Organizacao organizacao;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ferramenta_id", nullable = false, updatable = false)
    private Ferramenta ferramenta;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false, updatable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsavel_usuario_id", updatable = false)
    private Usuario responsavelUsuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsavel_anterior_usuario_id", updatable = false)
    private Usuario responsavelAnteriorUsuario;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, updatable = false)
    private TipoMovimentacaoFerramenta tipoMovimentacao;

    @Builder.Default
    @Column(nullable = false, updatable = false)
    private LocalDateTime dataHora = LocalDateTime.now();

    @Column(length = 700, updatable = false)
    private String observacao;

    @Column(length = 160, updatable = false)
    private String destino;

    @Setter
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status_revisao", nullable = false, length = 20)
    private StatusRevisaoMovimentacao statusRevisao = StatusRevisaoMovimentacao.PENDENTE;

    @Setter
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "confirmado_por_usuario_id")
    private Usuario confirmadoPorUsuario;

    @Setter
    @Column(name = "confirmado_em")
    private LocalDateTime confirmadoEm;
}
