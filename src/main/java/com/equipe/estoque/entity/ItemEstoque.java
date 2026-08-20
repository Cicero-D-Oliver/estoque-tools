package com.equipe.estoque.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

@Entity
@Table(
        name = "itens_estoque",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_itens_estoque_organizacao_codigo",
                        columnNames = {"organizacao_id", "codigo"}
                ),
                @UniqueConstraint(
                        name = "uk_itens_estoque_organizacao_id",
                        columnNames = {"organizacao_id", "id"}
                )
        },
        indexes = {
                @Index(name = "idx_itens_estoque_ativo", columnList = "ativo"),
                @Index(name = "idx_itens_estoque_categoria", columnList = "categoria"),
                @Index(name = "idx_itens_estoque_organizacao_ativo", columnList = "organizacao_id, ativo"),
                @Index(name = "idx_itens_estoque_organizacao_categoria", columnList = "organizacao_id, categoria")
        }
)
@Check(constraints = "quantidade_atual >= 0 AND quantidade_minima >= 0")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemEstoque {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    @Builder.Default
    @Column(nullable = false, columnDefinition = "BIGINT DEFAULT 0")
    private Long versao = 0L;

    @ManyToOne(fetch = jakarta.persistence.FetchType.LAZY, optional = false)
    @JoinColumn(name = "organizacao_id", nullable = false)
    private Organizacao organizacao;

    @Column(nullable = false, length = 60)
    private String codigo;

    @Column(nullable = false, length = 120)
    private String nome;

    @Column(length = 80)
    private String categoria;

    @Builder.Default
    @Column(nullable = false)
    private Integer quantidadeAtual = 0;

    @Builder.Default
    @Column(nullable = false)
    private Integer quantidadeMinima = 0;

    @Column(length = 120)
    private String localizacao;

    @Builder.Default
    @Column(nullable = false)
    private Boolean ativo = true;
}
