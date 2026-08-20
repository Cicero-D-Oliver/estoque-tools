package com.equipe.estoque.entity;

import com.equipe.estoque.enums.PerfilUsuario;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "usuarios",
        uniqueConstraints = @UniqueConstraint(name = "uk_usuarios_email", columnNames = "email"),
        indexes = @Index(name = "idx_usuarios_ativo", columnList = "ativo")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    @Builder.Default
    @Column(nullable = false, columnDefinition = "BIGINT DEFAULT 0")
    private Long versao = 0L;

    @Column(nullable = false, length = 120)
    private String nome;

    @Column(nullable = false, length = 254)
    private String email;

    @JsonIgnore
    @Column(name = "senha_hash", length = 100)
    private String senhaHash;

    @Column(name = "senha_alterada_em")
    private LocalDateTime senhaAlteradaEm;

    @Column(name = "ultimo_login_em")
    private LocalDateTime ultimoLoginEm;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PerfilUsuario perfil;

    @Builder.Default
    @Column(nullable = false)
    private Boolean ativo = true;
}
