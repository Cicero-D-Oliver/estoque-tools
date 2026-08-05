package com.equipe.estoque.service;

import com.equipe.estoque.dto.movimentacao.MovimentacaoFerramentaResponseDTO;
import com.equipe.estoque.entity.MovimentacaoFerramenta;
import com.equipe.estoque.repository.MovimentacaoFerramentaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service SOMENTE LEITURA para movimentações de ferramentas.
 * Assim como MovimentacaoEstoqueService, este service serve para listagem
 * GERAL de todas as movimentações (útil para telas de auditoria).
 * As ações que efetivamente mudam o estado da ferramenta (retirada, devolução,
 * etc.) ficam centralizadas no FerramentaService.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MovimentacaoFerramentaService {

    private final MovimentacaoFerramentaRepository movimentacaoFerramentaRepository;

    public List<MovimentacaoFerramentaResponseDTO> listarTodas() {
        return movimentacaoFerramentaRepository.findAll()
                .stream()
                .map(this::paraResponseDTO)
                .toList();
    }

    private MovimentacaoFerramentaResponseDTO paraResponseDTO(MovimentacaoFerramenta mov) {
        return MovimentacaoFerramentaResponseDTO.builder()
                .id(mov.getId())
                .ferramentaId(mov.getFerramenta().getId())
                .ferramentaNome(mov.getFerramenta().getNome())
                .ferramentaPatrimonio(mov.getFerramenta().getPatrimonio())
                .usuarioId(mov.getUsuario().getId())
                .usuarioNome(mov.getUsuario().getNome())
                .tipoMovimentacao(mov.getTipoMovimentacao())
                .dataHora(mov.getDataHora())
                .observacao(mov.getObservacao())
                .build();
    }
}
