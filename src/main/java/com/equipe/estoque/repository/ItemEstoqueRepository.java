package com.equipe.estoque.repository;

import com.equipe.estoque.entity.ItemEstoque;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ItemEstoqueRepository extends JpaRepository<ItemEstoque, Long> {

    boolean existsByCodigo(String codigo);

    @Query("SELECT i FROM ItemEstoque i WHERE i.ativo = true AND i.quantidadeAtual < i.quantidadeMinima")
    List<ItemEstoque> findItensAbaixoDoMinimo();
}
