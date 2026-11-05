package com.equipe.estoque.repository;

import com.equipe.estoque.entity.ConviteOnboarding;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ConviteOnboardingRepository extends JpaRepository<ConviteOnboarding, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT c FROM ConviteOnboarding c
            LEFT JOIN FETCH c.organizacao
            LEFT JOIN FETCH c.criadoPorUsuario
            WHERE c.tokenHash = :tokenHash
            """)
    Optional<ConviteOnboarding> findByTokenHashForUpdate(@Param("tokenHash") String tokenHash);

    @EntityGraph(attributePaths = {"organizacao"})
    Optional<ConviteOnboarding> findByTokenHash(String tokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT c FROM ConviteOnboarding c
            JOIN FETCH c.organizacao
            LEFT JOIN FETCH c.criadoPorUsuario
            WHERE c.organizacao.id = :organizacaoId AND c.email = :email
            """)
    Optional<ConviteOnboarding> findByOrganizacaoIdAndEmailForUpdate(
            @Param("organizacaoId") Long organizacaoId,
            @Param("email") String email
    );

    @EntityGraph(attributePaths = {"organizacao", "criadoPorUsuario", "usuarioConfirmado"})
    List<ConviteOnboarding> findByOrganizacaoIdOrderByCriadoEmDescIdDesc(Long organizacaoId);
}
