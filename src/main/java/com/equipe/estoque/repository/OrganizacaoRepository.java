package com.equipe.estoque.repository;

import com.equipe.estoque.entity.Organizacao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface OrganizacaoRepository extends JpaRepository<Organizacao, Long> {

    Optional<Organizacao> findByNomeAndCriadaEm(String nome, LocalDateTime criadaEm);
}
