package com.equipe.estoque.repository;

import com.equipe.estoque.entity.Ferramenta;
import com.equipe.estoque.enums.StatusFerramenta;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FerramentaRepository extends JpaRepository<Ferramenta, Long> {

    boolean existsByPatrimonio(String patrimonio);

    boolean existsByPatrimonioAndOrganizacaoId(String patrimonio, Long organizacaoId);

    @Override
    @EntityGraph(attributePaths = "responsavelAtual")
    List<Ferramenta> findAll();

    @Override
    @EntityGraph(attributePaths = "responsavelAtual")
    Optional<Ferramenta> findById(Long id);

    @EntityGraph(attributePaths = "responsavelAtual")
    List<Ferramenta> findAllByOrganizacaoId(Long organizacaoId);

    @EntityGraph(attributePaths = "responsavelAtual")
    Optional<Ferramenta> findByIdAndOrganizacaoId(Long id, Long organizacaoId);

    @EntityGraph(attributePaths = "responsavelAtual")
    List<Ferramenta> findByStatus(StatusFerramenta status);

    @EntityGraph(attributePaths = "responsavelAtual")
    List<Ferramenta> findByOrganizacaoIdAndStatus(Long organizacaoId, StatusFerramenta status);
}
