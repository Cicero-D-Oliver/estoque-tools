package com.equipe.estoque.repository;

import com.equipe.estoque.entity.OrganizacaoMembro;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrganizacaoMembroRepository extends JpaRepository<OrganizacaoMembro, Long> {

    boolean existsByOrganizacaoIdAndUsuarioId(Long organizacaoId, Long usuarioId);

    @EntityGraph(attributePaths = {"organizacao", "usuario"})
    Optional<OrganizacaoMembro> findByOrganizacaoIdAndUsuarioId(Long organizacaoId, Long usuarioId);

    @EntityGraph(attributePaths = "organizacao")
    List<OrganizacaoMembro> findByUsuarioIdOrderByOrganizacaoId(Long usuarioId);
}
