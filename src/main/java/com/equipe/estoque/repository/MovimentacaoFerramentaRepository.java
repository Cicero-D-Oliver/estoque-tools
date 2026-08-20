package com.equipe.estoque.repository;

import com.equipe.estoque.entity.MovimentacaoFerramenta;
import com.equipe.estoque.enums.TipoMovimentacaoFerramenta;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MovimentacaoFerramentaRepository extends JpaRepository<MovimentacaoFerramenta, Long> {

    @Override
    @EntityGraph(attributePaths = {"ferramenta", "usuario"})
    List<MovimentacaoFerramenta> findAll();

    @EntityGraph(attributePaths = {"ferramenta", "usuario"})
    List<MovimentacaoFerramenta> findAllByOrganizacaoId(Long organizacaoId);

    @EntityGraph(attributePaths = {"ferramenta", "usuario"})
    List<MovimentacaoFerramenta> findByFerramentaIdOrderByDataHoraDescIdDesc(Long ferramentaId);

    @EntityGraph(attributePaths = {"ferramenta", "usuario"})
    List<MovimentacaoFerramenta> findByOrganizacaoIdAndFerramentaIdOrderByDataHoraDescIdDesc(
            Long organizacaoId,
            Long ferramentaId
    );

    @EntityGraph(attributePaths = {"ferramenta", "usuario"})
    Optional<MovimentacaoFerramenta> findTopByFerramentaIdAndTipoMovimentacaoOrderByDataHoraDescIdDesc(
            Long ferramentaId,
            TipoMovimentacaoFerramenta tipoMovimentacao
    );

    @EntityGraph(attributePaths = {"ferramenta", "usuario"})
    Optional<MovimentacaoFerramenta>
            findTopByOrganizacaoIdAndFerramentaIdAndTipoMovimentacaoOrderByDataHoraDescIdDesc(
                    Long organizacaoId,
                    Long ferramentaId,
                    TipoMovimentacaoFerramenta tipoMovimentacao
            );
}
