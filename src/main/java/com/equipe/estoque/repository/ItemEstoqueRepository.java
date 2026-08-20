package com.equipe.estoque.repository;

import com.equipe.estoque.entity.ItemEstoque;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ItemEstoqueRepository extends JpaRepository<ItemEstoque, Long> {

    boolean existsByCodigo(String codigo);

    boolean existsByCodigoAndOrganizacaoId(String codigo, Long organizacaoId);

    List<ItemEstoque> findAllByOrganizacaoId(Long organizacaoId);

    Optional<ItemEstoque> findByIdAndOrganizacaoId(Long id, Long organizacaoId);

    @Query("SELECT i FROM ItemEstoque i WHERE i.ativo = true AND i.quantidadeAtual < i.quantidadeMinima")
    List<ItemEstoque> findItensAbaixoDoMinimo();

    @Query("""
            SELECT i FROM ItemEstoque i
             WHERE i.organizacao.id = :organizacaoId
               AND i.ativo = true
               AND i.quantidadeAtual < i.quantidadeMinima
            """)
    List<ItemEstoque> findItensAbaixoDoMinimoByOrganizacaoId(Long organizacaoId);
}
