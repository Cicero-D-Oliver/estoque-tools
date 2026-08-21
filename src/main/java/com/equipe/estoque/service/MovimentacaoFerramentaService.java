package com.equipe.estoque.service;

import com.equipe.estoque.dto.movimentacao.MovimentacaoFerramentaResponseDTO;
import com.equipe.estoque.dto.movimentacao.ResumoMovimentacoesFerramentaResponseDTO;
import com.equipe.estoque.entity.MovimentacaoFerramenta;
import com.equipe.estoque.entity.OrganizacaoMembro;
import com.equipe.estoque.entity.Usuario;
import com.equipe.estoque.enums.PerfilMembroOrganizacao;
import com.equipe.estoque.enums.StatusFerramenta;
import com.equipe.estoque.enums.StatusMembroOrganizacao;
import com.equipe.estoque.enums.StatusRevisaoMovimentacao;
import com.equipe.estoque.exception.BusinessException;
import com.equipe.estoque.exception.ResourceNotFoundException;
import com.equipe.estoque.repository.FerramentaRepository;
import com.equipe.estoque.repository.MovimentacaoFerramentaRepository;
import com.equipe.estoque.repository.OrganizacaoMembroRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

/**
 * Consultas de auditoria e revisão administrativa das movimentações.
 * Os efeitos operacionais permanecem centralizados no {@link FerramentaService};
 * confirmar registra apenas a revisão posterior do ADMIN.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class MovimentacaoFerramentaService {

    private final MovimentacaoFerramentaRepository movimentacaoFerramentaRepository;
    private final FerramentaRepository ferramentaRepository;
    private final OrganizacaoMembroRepository membroRepository;
    private final OrganizacaoService organizacaoService;

    public List<MovimentacaoFerramentaResponseDTO> listarTodas() {
        return organizacaoService.buscarIdOrganizacaoLegada()
                .map(this::listarTodas)
                .orElseGet(List::of);
    }

    public List<MovimentacaoFerramentaResponseDTO> listarTodas(Long organizacaoId) {
        organizacaoService.buscarOrganizacaoAtiva(organizacaoId);
        return movimentacaoFerramentaRepository.findAllByOrganizacaoIdOrderByDataHoraDescIdDesc(organizacaoId)
                .stream()
                .map(MovimentacaoFerramentaMapper::toResponse)
                .toList();
    }

    public List<MovimentacaoFerramentaResponseDTO> listarPendentes(
            Long organizacaoId,
            Long adminUsuarioId
    ) {
        requireActiveAdmin(organizacaoId, adminUsuarioId);
        return movimentacaoFerramentaRepository
                .findByOrganizacaoIdAndStatusRevisaoOrderByIdAsc(
                        organizacaoId,
                        StatusRevisaoMovimentacao.PENDENTE
                ).stream()
                .map(MovimentacaoFerramentaMapper::toResponse)
                .toList();
    }

    @Transactional
    public MovimentacaoFerramentaResponseDTO confirmar(
            Long organizacaoId,
            Long movimentacaoId,
            Long adminUsuarioId
    ) {
        Usuario admin = requireActiveAdmin(organizacaoId, adminUsuarioId).getUsuario();
        MovimentacaoFerramenta movement = movimentacaoFerramentaRepository
                .findByIdAndOrganizacaoIdForUpdate(movimentacaoId, organizacaoId)
                .orElseThrow(() -> new ResourceNotFoundException("Movimentação não encontrada"));
        if (movement.getStatusRevisao() == StatusRevisaoMovimentacao.CONFIRMADA) {
            return MovimentacaoFerramentaMapper.toResponse(movement);
        }
        movement.setStatusRevisao(StatusRevisaoMovimentacao.CONFIRMADA);
        movement.setConfirmadoPorUsuario(admin);
        movement.setConfirmadoEm(now());
        movement = movimentacaoFerramentaRepository.save(movement);
        log.info("Movimentação confirmada organizacaoId={} movimentacaoId={} adminId={}",
                organizacaoId, movimentacaoId, adminUsuarioId);
        return MovimentacaoFerramentaMapper.toResponse(movement);
    }

    public ResumoMovimentacoesFerramentaResponseDTO resumir(
            Long organizacaoId,
            Long adminUsuarioId,
            Long afterId,
            int limit
    ) {
        requireActiveAdmin(organizacaoId, adminUsuarioId);
        if (limit < 1 || limit > 200) {
            throw new BusinessException("O limite deve estar entre 1 e 200");
        }
        if (afterId != null && afterId < 0) {
            throw new BusinessException("O cursor deve ser zero ou positivo");
        }
        long cursor = afterId == null ? 0L : afterId;
        long totalNew = movimentacaoFerramentaRepository
                .countByOrganizacaoIdAndIdGreaterThan(organizacaoId, cursor);
        List<MovimentacaoFerramentaResponseDTO> movements = movimentacaoFerramentaRepository
                .findByOrganizacaoIdAndIdGreaterThanOrderByIdAsc(
                        organizacaoId,
                        cursor,
                        PageRequest.of(0, limit)
                ).stream()
                .map(MovimentacaoFerramentaMapper::toResponse)
                .toList();
        long nextCursor = movements.isEmpty()
                ? cursor
                : movements.get(movements.size() - 1).getId();
        return ResumoMovimentacoesFerramentaResponseDTO.builder()
                .cursorAnterior(cursor)
                .proximoCursor(nextCursor)
                .quantidadeNovas(totalNew)
                .quantidadeRetornada(movements.size())
                .temMais(totalNew > movements.size())
                .quantidadePendentes(movimentacaoFerramentaRepository
                        .countByOrganizacaoIdAndStatusRevisao(
                                organizacaoId,
                                StatusRevisaoMovimentacao.PENDENTE
                        ))
                .ferramentasEmUso(countTools(organizacaoId, StatusFerramenta.EMPRESTADA))
                .ferramentasEmManutencao(countTools(organizacaoId, StatusFerramenta.MANUTENCAO))
                .ferramentasPerdidas(countTools(organizacaoId, StatusFerramenta.PERDIDA))
                .movimentacoes(movements)
                .build();
    }

    private OrganizacaoMembro requireActiveAdmin(Long organizacaoId, Long usuarioId) {
        return membroRepository.findByOrganizacaoIdAndUsuarioId(organizacaoId, usuarioId)
                .filter(member -> member.getStatus() == StatusMembroOrganizacao.ATIVO)
                .filter(member -> member.getPerfil() == PerfilMembroOrganizacao.ADMIN)
                .filter(member -> Boolean.TRUE.equals(member.getOrganizacao().getAtiva()))
                .filter(member -> Boolean.TRUE.equals(member.getUsuario().getAtivo()))
                .orElseThrow(() -> new AccessDeniedException("Acesso negado"));
    }

    private long countTools(Long organizacaoId, StatusFerramenta status) {
        return ferramentaRepository.countByOrganizacaoIdAndStatusAndAtivoTrue(organizacaoId, status);
    }

    private LocalDateTime now() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }
}
