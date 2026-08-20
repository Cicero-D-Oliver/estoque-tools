package com.equipe.estoque.repository;

import com.equipe.estoque.entity.MovimentacaoEstoque;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MovimentacaoEstoqueRepository extends JpaRepository<MovimentacaoEstoque, Long> {

    @Override
    @EntityGraph(attributePaths = {"itemEstoque", "usuario"})
    List<MovimentacaoEstoque> findAll();

    @EntityGraph(attributePaths = {"itemEstoque", "usuario"})
    List<MovimentacaoEstoque> findAllByOrganizacaoId(Long organizacaoId);

    @EntityGraph(attributePaths = {"itemEstoque", "usuario"})
    List<MovimentacaoEstoque> findByItemEstoqueIdOrderByDataHoraDescIdDesc(Long itemEstoqueId);

    @EntityGraph(attributePaths = {"itemEstoque", "usuario"})
    List<MovimentacaoEstoque> findByOrganizacaoIdAndItemEstoqueIdOrderByDataHoraDescIdDesc(
            Long organizacaoId,
            Long itemEstoqueId
    );
}
