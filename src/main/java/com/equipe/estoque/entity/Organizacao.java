package com.equipe.estoque.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

import java.time.LocalDateTime;

@Entity
@Table(
        name = "organizacoes",
        indexes = {
                @Index(name = "idx_organizacoes_ativa", columnList = "ativa"),
                @Index(name = "idx_organizacoes_criada_por", columnList = "criada_por_usuario_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Organizacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    @Builder.Default
    @Column(nullable = false, columnDefinition = "BIGINT DEFAULT 0")
    private Long versao = 0L;

    @Column(nullable = false, length = 120)
    private String nome;

    @Builder.Default
    @Column(nullable = false)
    private Boolean ativa = true;

    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime criadaEm = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "criada_por_usuario_id", nullable = false)
    private Usuario criadaPorUsuario;
}
