package com.equipe.estoque.repository;

import com.equipe.estoque.entity.MovimentacaoFerramenta;
import com.equipe.estoque.enums.TipoMovimentacaoFerramenta;
import com.equipe.estoque.enums.StatusRevisaoMovimentacao;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MovimentacaoFerramentaRepository extends JpaRepository<MovimentacaoFerramenta, Long> {

    @Override
    @EntityGraph(attributePaths = {
            "ferramenta", "usuario", "responsavelUsuario",
            "responsavelAnteriorUsuario", "confirmadoPorUsuario"
    })
    List<MovimentacaoFerramenta> findAll();

    @EntityGraph(attributePaths = {
            "ferramenta", "usuario", "responsavelUsuario",
            "responsavelAnteriorUsuario", "confirmadoPorUsuario"
    })
    List<MovimentacaoFerramenta> findAllByOrganizacaoIdOrderByDataHoraDescIdDesc(Long organizacaoId);

    @EntityGraph(attributePaths = {
            "ferramenta", "usuario", "responsavelUsuario",
            "responsavelAnteriorUsuario", "confirmadoPorUsuario"
    })
    List<MovimentacaoFerramenta> findAllByOrganizacaoId(Long organizacaoId);

    @EntityGraph(attributePaths = {
            "ferramenta", "usuario", "responsavelUsuario",
            "responsavelAnteriorUsuario", "confirmadoPorUsuario"
    })
    List<MovimentacaoFerramenta> findByFerramentaIdOrderByDataHoraDescIdDesc(Long ferramentaId);

    @EntityGraph(attributePaths = {
            "ferramenta", "usuario", "responsavelUsuario",
            "responsavelAnteriorUsuario", "confirmadoPorUsuario"
    })
    List<MovimentacaoFerramenta> findByOrganizacaoIdAndFerramentaIdOrderByDataHoraDescIdDesc(
            Long organizacaoId,
            Long ferramentaId
    );

    @EntityGraph(attributePaths = {
            "ferramenta", "usuario", "responsavelUsuario",
            "responsavelAnteriorUsuario", "confirmadoPorUsuario"
    })
    Optional<MovimentacaoFerramenta> findTopByFerramentaIdAndTipoMovimentacaoOrderByDataHoraDescIdDesc(
            Long ferramentaId,
            TipoMovimentacaoFerramenta tipoMovimentacao
    );

    @EntityGraph(attributePaths = {
            "ferramenta", "usuario", "responsavelUsuario",
            "responsavelAnteriorUsuario", "confirmadoPorUsuario"
    })
    Optional<MovimentacaoFerramenta>
            findTopByOrganizacaoIdAndFerramentaIdAndTipoMovimentacaoOrderByDataHoraDescIdDesc(
                    Long organizacaoId,
                    Long ferramentaId,
                    TipoMovimentacaoFerramenta tipoMovimentacao
            );

    @EntityGraph(attributePaths = {
            "ferramenta", "usuario", "responsavelUsuario",
            "responsavelAnteriorUsuario", "confirmadoPorUsuario"
    })
    Optional<MovimentacaoFerramenta>
            findTopByOrganizacaoIdAndFerramentaIdAndTipoMovimentacaoInOrderByDataHoraDescIdDesc(
                    Long organizacaoId,
                    Long ferramentaId,
                    List<TipoMovimentacaoFerramenta> tiposMovimentacao
            );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT m FROM MovimentacaoFerramenta m
             WHERE m.id = :id AND m.organizacao.id = :organizacaoId
            """)
    Optional<MovimentacaoFerramenta> findByIdAndOrganizacaoIdForUpdate(
            @Param("id") Long id,
            @Param("organizacaoId") Long organizacaoId
    );

    @EntityGraph(attributePaths = {
            "ferramenta", "usuario", "responsavelUsuario",
            "responsavelAnteriorUsuario", "confirmadoPorUsuario"
    })
    List<MovimentacaoFerramenta> findByOrganizacaoIdAndStatusRevisaoOrderByIdAsc(
            Long organizacaoId,
            StatusRevisaoMovimentacao statusRevisao
    );

    long countByOrganizacaoIdAndStatusRevisao(
            Long organizacaoId,
            StatusRevisaoMovimentacao statusRevisao
    );

    long countByOrganizacaoIdAndIdGreaterThan(Long organizacaoId, Long id);

    @EntityGraph(attributePaths = {
            "ferramenta", "usuario", "responsavelUsuario",
            "responsavelAnteriorUsuario", "confirmadoPorUsuario"
    })
    List<MovimentacaoFerramenta> findByOrganizacaoIdAndIdGreaterThanOrderByIdAsc(
            Long organizacaoId,
            Long id,
            Pageable pageable
    );
}
