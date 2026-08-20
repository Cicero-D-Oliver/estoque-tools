package com.equipe.estoque.entity;

import com.equipe.estoque.enums.TipoMovimentacaoFerramenta;
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
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

import java.time.LocalDateTime;

@Entity
@Immutable
@Table(
        name = "movimentacoes_ferramenta",
        indexes = {
                @Index(name = "idx_mov_ferramenta_ferramenta_data", columnList = "ferramenta_id, data_hora"),
                @Index(name = "idx_mov_ferramenta_usuario", columnList = "usuario_id"),
                @Index(name = "idx_mov_ferramenta_tipo_data", columnList = "tipo_movimentacao, data_hora"),
                @Index(
                        name = "idx_mov_ferramenta_organizacao_data",
                        columnList = "organizacao_id, data_hora"
                )
        }
)
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MovimentacaoFerramenta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organizacao_id", nullable = false)
    private Organizacao organizacao;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ferramenta_id", nullable = false)
    private Ferramenta ferramenta;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoMovimentacaoFerramenta tipoMovimentacao;

    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime dataHora = LocalDateTime.now();

    @Column(length = 700)
    private String observacao;
}
