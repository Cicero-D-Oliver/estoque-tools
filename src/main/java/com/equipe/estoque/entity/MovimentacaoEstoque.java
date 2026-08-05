package com.equipe.estoque.entity;

import com.equipe.estoque.enums.TipoMovimentacaoEstoque;
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
        name = "movimentacoes_estoque",
        indexes = {
                @Index(name = "idx_mov_estoque_item_data", columnList = "item_estoque_id, data_hora"),
                @Index(name = "idx_mov_estoque_usuario", columnList = "usuario_id")
        }
)
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MovimentacaoEstoque {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_estoque_id", nullable = false)
    private ItemEstoque itemEstoque;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoMovimentacaoEstoque tipoMovimentacao;

    @Column(nullable = false)
    private Integer quantidade;

    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime dataHora = LocalDateTime.now();

    @Column(length = 700)
    private String observacao;
}
