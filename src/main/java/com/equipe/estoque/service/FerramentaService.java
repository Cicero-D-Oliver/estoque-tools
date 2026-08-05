package com.equipe.estoque.service;

import com.equipe.estoque.dto.ferramenta.FerramentaRequestDTO;
import com.equipe.estoque.dto.ferramenta.FerramentaResponseDTO;
import com.equipe.estoque.dto.movimentacao.MovimentacaoFerramentaRequestDTO;
import com.equipe.estoque.dto.movimentacao.MovimentacaoFerramentaResponseDTO;
import com.equipe.estoque.entity.Ferramenta;
import com.equipe.estoque.entity.MovimentacaoFerramenta;
import com.equipe.estoque.entity.Usuario;
import com.equipe.estoque.enums.StatusFerramenta;
import com.equipe.estoque.enums.TipoMovimentacaoFerramenta;
import com.equipe.estoque.exception.BusinessException;
import com.equipe.estoque.exception.ResourceNotFoundException;
import com.equipe.estoque.repository.FerramentaRepository;
import com.equipe.estoque.repository.MovimentacaoFerramentaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class FerramentaService {

    private final FerramentaRepository ferramentaRepository;
    private final MovimentacaoFerramentaRepository movimentacaoFerramentaRepository;
    private final UsuarioService usuarioService;

    @Transactional
    public FerramentaResponseDTO criar(FerramentaRequestDTO dto) {
        String patrimonio = dto.getPatrimonio().trim();
        if (ferramentaRepository.existsByPatrimonio(patrimonio)) {
            throw new BusinessException("Já existe uma ferramenta com esse patrimônio");
        }

        Ferramenta ferramenta = Ferramenta.builder()
                .patrimonio(patrimonio)
                .nome(dto.getNome().trim())
                .categoria(trimNullable(dto.getCategoria()))
                .localizacao(trimNullable(dto.getLocalizacao()))
                .status(StatusFerramenta.DISPONIVEL)
                .ativo(true)
                .build();

        ferramenta = ferramentaRepository.save(ferramenta);
        log.info("Ferramenta criada id={}", ferramenta.getId());
        return paraResponseDTO(ferramenta);
    }

    public List<FerramentaResponseDTO> listarTodas() {
        return ferramentaRepository.findAll().stream().map(this::paraResponseDTO).toList();
    }

    public FerramentaResponseDTO buscarPorId(Long id) {
        return paraResponseDTO(buscarEntidadePorId(id));
    }

    @Transactional
    public FerramentaResponseDTO atualizar(Long id, FerramentaRequestDTO dto) {
        Ferramenta ferramenta = buscarEntidadePorId(id);
        String patrimonio = dto.getPatrimonio().trim();

        if (!ferramenta.getPatrimonio().equals(patrimonio)
                && ferramentaRepository.existsByPatrimonio(patrimonio)) {
            throw new BusinessException("Já existe uma ferramenta com esse patrimônio");
        }

        ferramenta.setPatrimonio(patrimonio);
        ferramenta.setNome(dto.getNome().trim());
        ferramenta.setCategoria(trimNullable(dto.getCategoria()));
        ferramenta.setLocalizacao(trimNullable(dto.getLocalizacao()));

        ferramenta = ferramentaRepository.save(ferramenta);
        log.info("Ferramenta atualizada id={}", ferramenta.getId());
        return paraResponseDTO(ferramenta);
    }

    @Transactional
    public void inativar(Long id) {
        Ferramenta ferramenta = buscarEntidadePorId(id);
        if (ferramenta.getStatus() == StatusFerramenta.EMPRESTADA) {
            throw new BusinessException("Uma ferramenta emprestada não pode ser inativada antes da devolução");
        }
        ferramenta.setAtivo(false);
        ferramentaRepository.save(ferramenta);
        log.info("Ferramenta inativada id={}", ferramenta.getId());
    }

    @Transactional
    public MovimentacaoFerramentaResponseDTO registrarRetirada(
            Long ferramentaId,
            MovimentacaoFerramentaRequestDTO dto
    ) {
        Ferramenta ferramenta = buscarFerramentaAtiva(ferramentaId);
        Usuario usuario = usuarioService.buscarUsuarioAtivo(dto.getUsuarioId());
        if (ferramenta.getStatus() != StatusFerramenta.DISPONIVEL) {
            throw new BusinessException("Ferramenta não está disponível para retirada. Status atual: "
                    + ferramenta.getStatus());
        }

        ferramenta.setStatus(StatusFerramenta.EMPRESTADA);
        ferramenta.setResponsavelAtual(usuario);
        ferramentaRepository.save(ferramenta);
        MovimentacaoFerramenta movimentacao = salvarMovimentacao(
                ferramenta, usuario, TipoMovimentacaoFerramenta.RETIRADA, dto.getObservacao());
        log.info("Retirada registrada ferramentaId={} usuarioId={}", ferramenta.getId(), usuario.getId());
        return paraMovimentacaoResponseDTO(movimentacao);
    }

    @Transactional
    public MovimentacaoFerramentaResponseDTO registrarDevolucao(
            Long ferramentaId,
            MovimentacaoFerramentaRequestDTO dto
    ) {
        Ferramenta ferramenta = buscarFerramentaAtiva(ferramentaId);
        Usuario usuario = usuarioService.buscarUsuarioAtivo(dto.getUsuarioId());
        if (ferramenta.getStatus() != StatusFerramenta.EMPRESTADA) {
            throw new BusinessException("Ferramenta não está emprestada. Status atual: " + ferramenta.getStatus());
        }

        ferramenta.setStatus(StatusFerramenta.DISPONIVEL);
        ferramenta.setResponsavelAtual(null);
        ferramentaRepository.save(ferramenta);
        MovimentacaoFerramenta movimentacao = salvarMovimentacao(
                ferramenta, usuario, TipoMovimentacaoFerramenta.DEVOLUCAO, dto.getObservacao());
        log.info("Devolução registrada ferramentaId={} usuarioId={}", ferramenta.getId(), usuario.getId());
        return paraMovimentacaoResponseDTO(movimentacao);
    }

    @Transactional
    public MovimentacaoFerramentaResponseDTO registrarManutencao(
            Long ferramentaId,
            MovimentacaoFerramentaRequestDTO dto
    ) {
        Ferramenta ferramenta = buscarFerramentaAtiva(ferramentaId);
        Usuario usuario = usuarioService.buscarUsuarioAtivo(dto.getUsuarioId());
        if (ferramenta.getStatus() == StatusFerramenta.PERDIDA) {
            throw new BusinessException("Ferramenta perdida não pode ser enviada para manutenção");
        }
        if (ferramenta.getStatus() == StatusFerramenta.MANUTENCAO) {
            throw new BusinessException("Ferramenta já está em manutenção");
        }

        ferramenta.setStatus(StatusFerramenta.MANUTENCAO);
        ferramenta.setResponsavelAtual(null);
        ferramentaRepository.save(ferramenta);
        MovimentacaoFerramenta movimentacao = salvarMovimentacao(
                ferramenta, usuario, TipoMovimentacaoFerramenta.MANUTENCAO, dto.getObservacao());
        log.info("Manutenção registrada ferramentaId={} usuarioId={}", ferramenta.getId(), usuario.getId());
        return paraMovimentacaoResponseDTO(movimentacao);
    }

    @Transactional
    public MovimentacaoFerramentaResponseDTO registrarPerda(
            Long ferramentaId,
            MovimentacaoFerramentaRequestDTO dto
    ) {
        Ferramenta ferramenta = buscarFerramentaAtiva(ferramentaId);
        Usuario usuario = usuarioService.buscarUsuarioAtivo(dto.getUsuarioId());
        if (ferramenta.getStatus() == StatusFerramenta.PERDIDA) {
            throw new BusinessException("Ferramenta já está marcada como perdida");
        }

        ferramenta.setStatus(StatusFerramenta.PERDIDA);
        ferramenta.setResponsavelAtual(null);
        ferramentaRepository.save(ferramenta);
        MovimentacaoFerramenta movimentacao = salvarMovimentacao(
                ferramenta, usuario, TipoMovimentacaoFerramenta.PERDA, dto.getObservacao());
        log.info("Perda registrada ferramentaId={} usuarioId={}", ferramenta.getId(), usuario.getId());
        return paraMovimentacaoResponseDTO(movimentacao);
    }

    @Transactional
    public MovimentacaoFerramentaResponseDTO registrarCorrecao(
            Long ferramentaId,
            MovimentacaoFerramentaRequestDTO dto
    ) {
        if (dto.getNovoStatus() == null) {
            throw new BusinessException("novoStatus é obrigatório para registrar uma correção");
        }
        if (dto.getNovoStatus() == StatusFerramenta.EMPRESTADA) {
            throw new BusinessException("Use a retirada para definir o status EMPRESTADA e registrar o responsável");
        }
        String observacao = requireObservation(dto.getObservacao());
        Ferramenta ferramenta = buscarFerramentaAtiva(ferramentaId);
        Usuario usuario = usuarioService.buscarUsuarioAtivo(dto.getUsuarioId());
        StatusFerramenta statusAnterior = ferramenta.getStatus();
        if (statusAnterior == dto.getNovoStatus()) {
            throw new BusinessException("O novo status deve ser diferente do status atual");
        }

        ferramenta.setStatus(dto.getNovoStatus());
        ferramenta.setResponsavelAtual(null);
        ferramentaRepository.save(ferramenta);
        String auditObservation = observacao + " (status anterior: " + statusAnterior
                + ", novo: " + dto.getNovoStatus() + ")";
        MovimentacaoFerramenta movimentacao = salvarMovimentacao(
                ferramenta, usuario, TipoMovimentacaoFerramenta.CORRECAO, auditObservation);
        log.info("Correção registrada ferramentaId={} usuarioId={} statusAnterior={} novoStatus={}",
                ferramenta.getId(), usuario.getId(), statusAnterior, dto.getNovoStatus());
        return paraMovimentacaoResponseDTO(movimentacao);
    }

    public List<MovimentacaoFerramentaResponseDTO> consultarHistorico(Long ferramentaId) {
        buscarEntidadePorId(ferramentaId);
        return movimentacaoFerramentaRepository.findByFerramentaIdOrderByDataHoraDescIdDesc(ferramentaId)
                .stream().map(this::paraMovimentacaoResponseDTO).toList();
    }

    public List<FerramentaResponseDTO> listarEmprestadas() {
        return ferramentaRepository.findByStatus(StatusFerramenta.EMPRESTADA)
                .stream().map(this::paraResponseDTO).toList();
    }

    public MovimentacaoFerramentaResponseDTO consultarUltimoResponsavel(Long ferramentaId) {
        buscarEntidadePorId(ferramentaId);
        MovimentacaoFerramenta ultima = movimentacaoFerramentaRepository
                .findTopByFerramentaIdAndTipoMovimentacaoOrderByDataHoraDescIdDesc(
                        ferramentaId, TipoMovimentacaoFerramenta.RETIRADA)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Esta ferramenta ainda não possui registro de retirada"));
        return paraMovimentacaoResponseDTO(ultima);
    }

    public Ferramenta buscarEntidadePorId(Long id) {
        return ferramentaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ferramenta com id " + id + " não encontrada"));
    }

    private Ferramenta buscarFerramentaAtiva(Long id) {
        Ferramenta ferramenta = buscarEntidadePorId(id);
        if (!Boolean.TRUE.equals(ferramenta.getAtivo())) {
            throw new BusinessException("A ferramenta está inativa");
        }
        return ferramenta;
    }

    private String requireObservation(String value) {
        if (value == null || value.isBlank()) {
            throw new BusinessException("Observação é obrigatória para registrar uma correção");
        }
        return value.trim();
    }

    private String trimNullable(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private MovimentacaoFerramenta salvarMovimentacao(
            Ferramenta ferramenta,
            Usuario usuario,
            TipoMovimentacaoFerramenta tipo,
            String observacao
    ) {
        return movimentacaoFerramentaRepository.save(MovimentacaoFerramenta.builder()
                .ferramenta(ferramenta).usuario(usuario).tipoMovimentacao(tipo)
                .observacao(trimNullable(observacao)).build());
    }

    private FerramentaResponseDTO paraResponseDTO(Ferramenta ferramenta) {
        Usuario responsavel = ferramenta.getResponsavelAtual();
        return FerramentaResponseDTO.builder()
                .id(ferramenta.getId()).patrimonio(ferramenta.getPatrimonio()).nome(ferramenta.getNome())
                .categoria(ferramenta.getCategoria()).status(ferramenta.getStatus())
                .responsavelAtualId(responsavel != null ? responsavel.getId() : null)
                .responsavelAtualNome(responsavel != null ? responsavel.getNome() : null)
                .localizacao(ferramenta.getLocalizacao()).ativo(ferramenta.getAtivo()).build();
    }

    private MovimentacaoFerramentaResponseDTO paraMovimentacaoResponseDTO(MovimentacaoFerramenta mov) {
        return MovimentacaoFerramentaResponseDTO.builder()
                .id(mov.getId()).ferramentaId(mov.getFerramenta().getId())
                .ferramentaNome(mov.getFerramenta().getNome())
                .ferramentaPatrimonio(mov.getFerramenta().getPatrimonio())
                .usuarioId(mov.getUsuario().getId()).usuarioNome(mov.getUsuario().getNome())
                .tipoMovimentacao(mov.getTipoMovimentacao()).dataHora(mov.getDataHora())
                .observacao(mov.getObservacao()).build();
    }
}
