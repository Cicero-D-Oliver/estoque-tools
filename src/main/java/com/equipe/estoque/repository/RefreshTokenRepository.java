package com.equipe.estoque.repository;

import com.equipe.estoque.entity.RefreshToken;
import com.equipe.estoque.enums.MotivoRevogacaoRefresh;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM RefreshToken t JOIN FETCH t.usuario WHERE t.tokenHash = :tokenHash")
    Optional<RefreshToken> findByTokenHashForUpdate(@Param("tokenHash") String tokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM RefreshToken t WHERE t.familiaId = :familiaId ORDER BY t.id")
    List<RefreshToken> findByFamiliaIdForUpdate(@Param("familiaId") String familiaId);

    @Modifying
    @Query("""
            UPDATE RefreshToken t
               SET t.revogadoEm = :revogadoEm,
                   t.motivoRevogacao = :motivo
             WHERE t.usuario.id = :usuarioId
               AND t.revogadoEm IS NULL
            """)
    int revokeAllActiveByUsuarioId(
            @Param("usuarioId") Long usuarioId,
            @Param("revogadoEm") LocalDateTime revogadoEm,
            @Param("motivo") MotivoRevogacaoRefresh motivo
    );

    List<RefreshToken> findAllByUsuarioIdOrderById(Long usuarioId);

    boolean existsByTokenHash(String tokenHash);
}
