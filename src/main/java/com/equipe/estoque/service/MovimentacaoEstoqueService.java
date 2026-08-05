package com.equipe.estoque.service;

import com.equipe.estoque.dto.movimentacao.MovimentacaoEstoqueResponseDTO;
import com.equipe.estoque.entity.MovimentacaoEstoque;
import com.equipe.estoque.repository.MovimentacaoEstoqueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service SOMENTE LEITURA para movimentações de estoque.
 *
 * Por que existe separado do ItemEstoqueService, que já tem consultarHistorico()?
 *   - ItemEstoqueService.consultarHistorico() → histórico de UM item específico
 *   - Este service → listagem GERAL de todas as movimentações do sistema
 *     (útil para uma tela de auditoria, por exemplo)
 *
 * Importante: este service NUNCA terá métodos de update ou delete.
 * Isso é o que mantém os logs imutáveis na prática.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MovimentacaoEstoqueService {

    private final MovimentacaoEstoqueRepository movimentacaoEstoqueRepository;

    /**
     * Lista todas as movimentações de estoque já registradas no sistema.
     */
    public List<MovimentacaoEstoqueResponseDTO> listarTodas() {
        return movimentacaoEstoqueRepository.findAll()
                .stream()
                .map(this::paraResponseDTO)
                .toList();
    }

    private MovimentacaoEstoqueResponseDTO paraResponseDTO(MovimentacaoEstoque mov) {
        return MovimentacaoEstoqueResponseDTO.builder()
                .id(mov.getId())
                .itemEstoqueId(mov.getItemEstoque().getId())
                .itemEstoqueNome(mov.getItemEstoque().getNome())
                .usuarioId(mov.getUsuario().getId())
                .usuarioNome(mov.getUsuario().getNome())
                .tipoMovimentacao(mov.getTipoMovimentacao())
                .quantidade(mov.getQuantidade())
                .dataHora(mov.getDataHora())
                .observacao(mov.getObservacao())
                .build();
    }
}
