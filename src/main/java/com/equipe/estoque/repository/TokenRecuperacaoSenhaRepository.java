package com.equipe.estoque.repository;

import com.equipe.estoque.entity.TokenRecuperacaoSenha;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface TokenRecuperacaoSenhaRepository extends JpaRepository<TokenRecuperacaoSenha, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT t FROM TokenRecuperacaoSenha t
            JOIN FETCH t.usuario
            WHERE t.tokenHash = :tokenHash
            """)
    Optional<TokenRecuperacaoSenha> findByTokenHashForUpdate(@Param("tokenHash") String tokenHash);

    @Modifying
    @Query("""
            UPDATE TokenRecuperacaoSenha t
               SET t.revogadoEm = :revogadoEm
             WHERE t.usuario.id = :usuarioId
               AND t.usadoEm IS NULL
               AND t.revogadoEm IS NULL
            """)
    int revokeAllActiveByUsuarioId(
            @Param("usuarioId") Long usuarioId,
            @Param("revogadoEm") LocalDateTime revogadoEm
    );

    List<TokenRecuperacaoSenha> findAllByUsuarioIdOrderById(Long usuarioId);

    boolean existsByTokenHash(String tokenHash);
}
