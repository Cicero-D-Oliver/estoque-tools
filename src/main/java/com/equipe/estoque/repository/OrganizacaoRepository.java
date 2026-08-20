package com.equipe.estoque.repository;

import com.equipe.estoque.entity.Organizacao;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.Optional;

public interface OrganizacaoRepository extends JpaRepository<Organizacao, Long> {

    Optional<Organizacao> findByNomeAndCriadaEm(String nome, LocalDateTime criadaEm);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Organizacao o WHERE o.id = :id")
    Optional<Organizacao> findByIdForUpdate(Long id);
}
