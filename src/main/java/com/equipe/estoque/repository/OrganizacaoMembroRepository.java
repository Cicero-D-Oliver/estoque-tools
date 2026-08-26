package com.equipe.estoque.repository;

import com.equipe.estoque.entity.OrganizacaoMembro;
import com.equipe.estoque.enums.PerfilMembroOrganizacao;
import com.equipe.estoque.enums.StatusMembroOrganizacao;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OrganizacaoMembroRepository extends JpaRepository<OrganizacaoMembro, Long> {

    boolean existsByOrganizacaoIdAndUsuarioId(Long organizacaoId, Long usuarioId);

    @EntityGraph(attributePaths = {"organizacao", "usuario"})
    Optional<OrganizacaoMembro> findByOrganizacaoIdAndUsuarioId(Long organizacaoId, Long usuarioId);

    @EntityGraph(attributePaths = "organizacao")
    List<OrganizacaoMembro> findByUsuarioIdOrderByOrganizacaoId(Long usuarioId);

    @EntityGraph(attributePaths = {"organizacao", "usuario", "aprovadoPorUsuario"})
    List<OrganizacaoMembro> findByOrganizacaoIdAndStatusOrderBySolicitadoEmAscIdAsc(
            Long organizacaoId,
            StatusMembroOrganizacao status
    );

    @EntityGraph(attributePaths = {"organizacao", "usuario", "aprovadoPorUsuario"})
    List<OrganizacaoMembro> findByOrganizacaoIdOrderByUsuarioNomeAscIdAsc(Long organizacaoId);

    @EntityGraph(attributePaths = {"organizacao", "usuario"})
    @Query("""
            SELECT m FROM OrganizacaoMembro m
             WHERE m.organizacao.id = :organizacaoId
               AND m.organizacao.ativa = true
               AND m.usuario.ativo = true
               AND m.status = :status
               AND m.perfil IN :perfis
             ORDER BY m.usuario.nome ASC, m.usuario.id ASC
            """)
    List<OrganizacaoMembro> findResponsaveisAptos(
            @Param("organizacaoId") Long organizacaoId,
            @Param("status") StatusMembroOrganizacao status,
            @Param("perfis") List<PerfilMembroOrganizacao> perfis
    );

    @EntityGraph(attributePaths = {"organizacao", "usuario", "aprovadoPorUsuario"})
    Optional<OrganizacaoMembro> findByIdAndOrganizacaoId(Long id, Long organizacaoId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT m FROM OrganizacaoMembro m
             JOIN FETCH m.organizacao
             JOIN FETCH m.usuario
             LEFT JOIN FETCH m.aprovadoPorUsuario
            WHERE m.id = :membroId AND m.organizacao.id = :organizacaoId
            """)
    Optional<OrganizacaoMembro> findByIdAndOrganizacaoIdForUpdate(
            @Param("membroId") Long membroId,
            @Param("organizacaoId") Long organizacaoId
    );

    long countByOrganizacaoIdAndStatusAndPerfil(
            Long organizacaoId,
            StatusMembroOrganizacao status,
            PerfilMembroOrganizacao perfil
    );

    @Query("""
            SELECT CASE WHEN COUNT(m) > 0 THEN true ELSE false END
              FROM OrganizacaoMembro m
             WHERE m.organizacao.id = :organizacaoId
               AND m.organizacao.ativa = true
               AND m.usuario.id = :usuarioId
               AND m.usuario.ativo = true
               AND m.status = :status
               AND m.perfil IN :perfis
            """)
    boolean possuiAcessoAtivo(
            @Param("organizacaoId") Long organizacaoId,
            @Param("usuarioId") Long usuarioId,
            @Param("status") StatusMembroOrganizacao status,
            @Param("perfis") List<PerfilMembroOrganizacao> perfis
    );
}
