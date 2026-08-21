package com.equipe.estoque.service;

import com.equipe.estoque.dto.ferramenta.FerramentaRequestDTO;
import com.equipe.estoque.dto.ferramenta.FerramentaResponseDTO;
import com.equipe.estoque.dto.movimentacao.MovimentacaoFerramentaRequestDTO;
import com.equipe.estoque.dto.movimentacao.MovimentacaoFerramentaResponseDTO;
import com.equipe.estoque.entity.Ferramenta;
import com.equipe.estoque.entity.MovimentacaoFerramenta;
import com.equipe.estoque.entity.Organizacao;
import com.equipe.estoque.entity.OrganizacaoMembro;
import com.equipe.estoque.entity.Usuario;
import com.equipe.estoque.enums.PerfilMembroOrganizacao;
import com.equipe.estoque.enums.StatusFerramenta;
import com.equipe.estoque.enums.StatusMembroOrganizacao;
import com.equipe.estoque.enums.StatusRevisaoMovimentacao;
import com.equipe.estoque.enums.TipoMovimentacaoFerramenta;
import com.equipe.estoque.exception.BusinessException;
import com.equipe.estoque.exception.ResourceNotFoundException;
import com.equipe.estoque.repository.FerramentaRepository;
import com.equipe.estoque.repository.MovimentacaoFerramentaRepository;
import com.equipe.estoque.repository.OrganizacaoMembroRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class FerramentaService {

    private final FerramentaRepository ferramentaRepository;
    private final MovimentacaoFerramentaRepository movimentacaoFerramentaRepository;
    private final OrganizacaoService organizacaoService;
    private final OrganizacaoMembroRepository membroRepository;

    @Transactional
    public FerramentaResponseDTO criar(FerramentaRequestDTO dto) {
        return criar(organizacaoService.obterOuCriarOrganizacaoLegada().getId(), dto);
    }

    @Transactional
    public FerramentaResponseDTO criar(Long organizacaoId, FerramentaRequestDTO dto) {
        Organizacao organizacao = organizacaoService.buscarOrganizacaoAtiva(organizacaoId);
        String patrimonio = dto.getPatrimonio().trim();
        if (ferramentaRepository.existsByPatrimonioAndOrganizacaoId(patrimonio, organizacaoId)) {
            throw new BusinessException("Já existe uma ferramenta com esse patrimônio");
        }

        Ferramenta ferramenta = Ferramenta.builder()
                .organizacao(organizacao)
                .patrimonio(patrimonio)
                .nome(dto.getNome().trim())
                .categoria(normalizeOptional(dto.getCategoria(), 80, "Categoria"))
                .localizacao(normalizeOptional(dto.getLocalizacao(), 120, "Localização"))
                .status(StatusFerramenta.DISPONIVEL)
                .ativo(true)
                .build();

        ferramenta = ferramentaRepository.save(ferramenta);
        log.info("Ferramenta criada id={} organizacaoId={}", ferramenta.getId(), organizacaoId);
        return paraResponseDTO(ferramenta);
    }

    public List<FerramentaResponseDTO> listarTodas() {
        return organizacaoService.buscarIdOrganizacaoLegada()
                .map(this::listarTodas)
                .orElseGet(List::of);
    }

    public List<FerramentaResponseDTO> listarTodas(Long organizacaoId) {
        organizacaoService.buscarOrganizacaoAtiva(organizacaoId);
        return ferramentaRepository.findAllByOrganizacaoId(organizacaoId)
                .stream().map(this::paraResponseDTO).toList();
    }

    public FerramentaResponseDTO buscarPorId(Long id) {
        return paraResponseDTO(buscarEntidadeLegadaPorId(id));
    }

    public FerramentaResponseDTO buscarPorId(Long organizacaoId, Long id) {
        return paraResponseDTO(buscarEntidadePorId(organizacaoId, id));
    }

    @Transactional
    public FerramentaResponseDTO atualizar(Long id, FerramentaRequestDTO dto) {
        return atualizar(idOrganizacaoLegadaOuNaoEncontrada(), id, dto);
    }

    @Transactional
    public FerramentaResponseDTO atualizar(Long organizacaoId, Long id, FerramentaRequestDTO dto) {
        Ferramenta ferramenta = buscarEntidadePorId(organizacaoId, id);
        String patrimonio = dto.getPatrimonio().trim();

        if (!ferramenta.getPatrimonio().equals(patrimonio)
                && ferramentaRepository.existsByPatrimonioAndOrganizacaoId(patrimonio, organizacaoId)) {
            throw new BusinessException("Já existe uma ferramenta com esse patrimônio");
        }

        ferramenta.setPatrimonio(patrimonio);
        ferramenta.setNome(dto.getNome().trim());
        ferramenta.setCategoria(normalizeOptional(dto.getCategoria(), 80, "Categoria"));
        ferramenta.setLocalizacao(normalizeOptional(dto.getLocalizacao(), 120, "Localização"));

        ferramenta = ferramentaRepository.save(ferramenta);
        log.info("Ferramenta atualizada id={} organizacaoId={}", ferramenta.getId(), organizacaoId);
        return paraResponseDTO(ferramenta);
    }

    @Transactional
    public void inativar(Long id) {
        inativar(idOrganizacaoLegadaOuNaoEncontrada(), id);
    }

    @Transactional
    public void inativar(Long organizacaoId, Long id) {
        Ferramenta ferramenta = buscarEntidadePorId(organizacaoId, id);
        if (ferramenta.getStatus() == StatusFerramenta.EMPRESTADA) {
            throw new BusinessException("Uma ferramenta emprestada não pode ser inativada antes da devolução");
        }
        ferramenta.setAtivo(false);
        ferramentaRepository.save(ferramenta);
        log.info("Ferramenta inativada id={} organizacaoId={}", ferramenta.getId(), organizacaoId);
    }

    @Transactional
    public MovimentacaoFerramentaResponseDTO registrarRetirada(
            Long organizacaoId,
            Long ferramentaId,
            Long executorUsuarioId,
            MovimentacaoFerramentaRequestDTO dto
    ) {
        OrganizacaoMembro executor = requireOperationalMember(organizacaoId, executorUsuarioId);
        Usuario usuario = executor.getUsuario();
        Ferramenta ferramenta = buscarFerramentaAtivaParaAtualizacao(organizacaoId, ferramentaId);
        if (ferramenta.getStatus() != StatusFerramenta.DISPONIVEL) {
            throw new BusinessException("Ferramenta não está disponível para retirada. Status atual: "
                    + ferramenta.getStatus());
        }
        LocalDateTime operationTime = now();
        String destination = normalizeOptional(dto.getDestino(), 160, "Destino");
        ferramenta.setStatus(StatusFerramenta.EMPRESTADA);
        ferramenta.setResponsavelAtual(usuario);
        ferramenta.setResponsavelDesde(operationTime);
        ferramenta.setDestinoAtual(destination);
        ferramentaRepository.saveAndFlush(ferramenta);
        MovimentacaoFerramenta movimentacao = salvarMovimentacao(
                ferramenta,
                usuario,
                usuario,
                null,
                TipoMovimentacaoFerramenta.RETIRADA,
                operationTime,
                dto.getObservacao(),
                destination
        );
        log.info("Retirada registrada ferramentaId={} organizacaoId={} usuarioId={}",
                ferramenta.getId(), organizacaoId, usuario.getId());
        return MovimentacaoFerramentaMapper.toResponse(movimentacao);
    }

    @Transactional
    public MovimentacaoFerramentaResponseDTO registrarDevolucao(
            Long organizacaoId,
            Long ferramentaId,
            Long executorUsuarioId,
            MovimentacaoFerramentaRequestDTO dto
    ) {
        OrganizacaoMembro executor = requireOperationalMember(organizacaoId, executorUsuarioId);
        Usuario usuario = executor.getUsuario();
        Ferramenta ferramenta = buscarFerramentaAtivaParaAtualizacao(organizacaoId, ferramentaId);
        if (ferramenta.getStatus() != StatusFerramenta.EMPRESTADA) {
            throw new BusinessException("Ferramenta não está emprestada. Status atual: " + ferramenta.getStatus());
        }
        Usuario previousResponsible = ferramenta.getResponsavelAtual();
        String previousDestination = ferramenta.getDestinoAtual();
        LocalDateTime operationTime = now();
        ferramenta.setStatus(StatusFerramenta.DISPONIVEL);
        ferramenta.setResponsavelAtual(null);
        ferramenta.setResponsavelDesde(null);
        ferramenta.setDestinoAtual(null);
        ferramentaRepository.saveAndFlush(ferramenta);
        MovimentacaoFerramenta movimentacao = salvarMovimentacao(
                ferramenta,
                usuario,
                null,
                previousResponsible,
                TipoMovimentacaoFerramenta.DEVOLUCAO,
                operationTime,
                dto.getObservacao(),
                previousDestination
        );
        log.info("Devolução registrada ferramentaId={} organizacaoId={} usuarioId={}",
                ferramenta.getId(), organizacaoId, usuario.getId());
        return MovimentacaoFerramentaMapper.toResponse(movimentacao);
    }

    @Transactional
    public MovimentacaoFerramentaResponseDTO registrarTransferencia(
            Long organizacaoId,
            Long ferramentaId,
            Long executorUsuarioId,
            MovimentacaoFerramentaRequestDTO dto
    ) {
        if (dto.getNovoResponsavelUsuarioId() == null) {
            throw new BusinessException("Novo responsável é obrigatório para transferência");
        }
        OrganizacaoMembro executor = requireOperationalMember(organizacaoId, executorUsuarioId);
        OrganizacaoMembro target = requireOperationalMember(
                organizacaoId,
                dto.getNovoResponsavelUsuarioId()
        );
        Ferramenta ferramenta = buscarFerramentaAtivaParaAtualizacao(organizacaoId, ferramentaId);
        if (ferramenta.getStatus() != StatusFerramenta.EMPRESTADA
                || ferramenta.getResponsavelAtual() == null) {
            throw new BusinessException("Somente uma ferramenta em uso pode ser transferida");
        }
        Usuario previousResponsible = ferramenta.getResponsavelAtual();
        if (!previousResponsible.getId().equals(executorUsuarioId)
                && executor.getPerfil() != PerfilMembroOrganizacao.ADMIN) {
            throw new AccessDeniedException("Acesso negado");
        }
        if (previousResponsible.getId().equals(target.getUsuario().getId())) {
            throw new BusinessException("O novo responsável deve ser diferente do responsável atual");
        }

        String requestedDestination = normalizeOptional(dto.getDestino(), 160, "Destino");
        String resultingDestination = requestedDestination == null
                ? ferramenta.getDestinoAtual()
                : requestedDestination;
        LocalDateTime operationTime = now();
        ferramenta.setResponsavelAtual(target.getUsuario());
        ferramenta.setResponsavelDesde(operationTime);
        ferramenta.setDestinoAtual(resultingDestination);
        ferramentaRepository.saveAndFlush(ferramenta);
        MovimentacaoFerramenta movement = salvarMovimentacao(
                ferramenta,
                executor.getUsuario(),
                target.getUsuario(),
                previousResponsible,
                TipoMovimentacaoFerramenta.TRANSFERENCIA,
                operationTime,
                dto.getObservacao(),
                resultingDestination
        );
        log.info("Transferência registrada ferramentaId={} organizacaoId={} executorId={} responsavelId={}",
                ferramentaId, organizacaoId, executorUsuarioId, target.getUsuario().getId());
        return MovimentacaoFerramentaMapper.toResponse(movement);
    }

    @Transactional
    public MovimentacaoFerramentaResponseDTO registrarManutencao(
            Long organizacaoId,
            Long ferramentaId,
            Long executorUsuarioId,
            MovimentacaoFerramentaRequestDTO dto
    ) {
        Usuario usuario = requireOperationalMember(organizacaoId, executorUsuarioId).getUsuario();
        Ferramenta ferramenta = buscarFerramentaAtivaParaAtualizacao(organizacaoId, ferramentaId);
        if (ferramenta.getStatus() == StatusFerramenta.PERDIDA) {
            throw new BusinessException("Ferramenta perdida não pode ser enviada para manutenção");
        }
        if (ferramenta.getStatus() == StatusFerramenta.MANUTENCAO) {
            throw new BusinessException("Ferramenta já está em manutenção");
        }
        Usuario previousResponsible = ferramenta.getResponsavelAtual();
        String previousDestination = ferramenta.getDestinoAtual();
        LocalDateTime operationTime = now();
        ferramenta.setStatus(StatusFerramenta.MANUTENCAO);
        ferramenta.setResponsavelAtual(null);
        ferramenta.setResponsavelDesde(null);
        ferramenta.setDestinoAtual(null);
        ferramentaRepository.saveAndFlush(ferramenta);
        MovimentacaoFerramenta movimentacao = salvarMovimentacao(
                ferramenta, usuario, null, previousResponsible,
                TipoMovimentacaoFerramenta.MANUTENCAO, operationTime,
                dto.getObservacao(), previousDestination);
        log.info("Manutenção registrada ferramentaId={} organizacaoId={} usuarioId={}",
                ferramenta.getId(), organizacaoId, usuario.getId());
        return MovimentacaoFerramentaMapper.toResponse(movimentacao);
    }

    @Transactional
    public MovimentacaoFerramentaResponseDTO registrarPerda(
            Long organizacaoId,
            Long ferramentaId,
            Long executorUsuarioId,
            MovimentacaoFerramentaRequestDTO dto
    ) {
        Usuario usuario = requireOperationalMember(organizacaoId, executorUsuarioId).getUsuario();
        Ferramenta ferramenta = buscarFerramentaAtivaParaAtualizacao(organizacaoId, ferramentaId);
        if (ferramenta.getStatus() == StatusFerramenta.PERDIDA) {
            throw new BusinessException("Ferramenta já está marcada como perdida");
        }
        Usuario previousResponsible = ferramenta.getResponsavelAtual();
        String previousDestination = ferramenta.getDestinoAtual();
        LocalDateTime operationTime = now();
        ferramenta.setStatus(StatusFerramenta.PERDIDA);
        ferramenta.setResponsavelAtual(null);
        ferramenta.setResponsavelDesde(null);
        ferramenta.setDestinoAtual(null);
        ferramentaRepository.saveAndFlush(ferramenta);
        MovimentacaoFerramenta movimentacao = salvarMovimentacao(
                ferramenta, usuario, null, previousResponsible,
                TipoMovimentacaoFerramenta.PERDA, operationTime,
                dto.getObservacao(), previousDestination);
        log.info("Perda registrada ferramentaId={} organizacaoId={} usuarioId={}",
                ferramenta.getId(), organizacaoId, usuario.getId());
        return MovimentacaoFerramentaMapper.toResponse(movimentacao);
    }

    @Transactional
    public MovimentacaoFerramentaResponseDTO registrarCorrecao(
            Long organizacaoId,
            Long ferramentaId,
            Long executorUsuarioId,
            MovimentacaoFerramentaRequestDTO dto
    ) {
        if (dto.getNovoStatus() == null) {
            throw new BusinessException("novoStatus é obrigatório para registrar uma correção");
        }
        if (dto.getNovoStatus() == StatusFerramenta.EMPRESTADA) {
            throw new BusinessException("Use a retirada para definir o status EMPRESTADA e registrar o responsável");
        }
        String observacao = requireObservation(dto.getObservacao());
        Usuario usuario = requireOperationalMember(organizacaoId, executorUsuarioId).getUsuario();
        Ferramenta ferramenta = buscarFerramentaAtivaParaAtualizacao(organizacaoId, ferramentaId);
        StatusFerramenta statusAnterior = ferramenta.getStatus();
        if (statusAnterior == dto.getNovoStatus()) {
            throw new BusinessException("O novo status deve ser diferente do status atual");
        }
        Usuario previousResponsible = ferramenta.getResponsavelAtual();
        String previousDestination = ferramenta.getDestinoAtual();
        LocalDateTime operationTime = now();
        ferramenta.setStatus(dto.getNovoStatus());
        ferramenta.setResponsavelAtual(null);
        ferramenta.setResponsavelDesde(null);
        ferramenta.setDestinoAtual(null);
        ferramentaRepository.saveAndFlush(ferramenta);
        String auditObservation = observacao + " (status anterior: " + statusAnterior
                + ", novo: " + dto.getNovoStatus() + ")";
        MovimentacaoFerramenta movimentacao = salvarMovimentacao(
                ferramenta, usuario, null, previousResponsible,
                TipoMovimentacaoFerramenta.CORRECAO, operationTime,
                auditObservation, previousDestination);
        log.info("Correção registrada ferramentaId={} organizacaoId={} usuarioId={} statusAnterior={} novoStatus={}",
                ferramenta.getId(), organizacaoId, usuario.getId(), statusAnterior, dto.getNovoStatus());
        return MovimentacaoFerramentaMapper.toResponse(movimentacao);
    }

    public List<MovimentacaoFerramentaResponseDTO> consultarHistorico(Long ferramentaId) {
        return consultarHistorico(idOrganizacaoLegadaOuNaoEncontrada(), ferramentaId);
    }

    public List<MovimentacaoFerramentaResponseDTO> consultarHistorico(
            Long organizacaoId,
            Long ferramentaId
    ) {
        buscarEntidadePorId(organizacaoId, ferramentaId);
        return movimentacaoFerramentaRepository
                .findByOrganizacaoIdAndFerramentaIdOrderByDataHoraDescIdDesc(organizacaoId, ferramentaId)
                .stream().map(MovimentacaoFerramentaMapper::toResponse).toList();
    }

    public List<FerramentaResponseDTO> listarEmprestadas() {
        return organizacaoService.buscarIdOrganizacaoLegada()
                .map(this::listarEmprestadas)
                .orElseGet(List::of);
    }

    public List<FerramentaResponseDTO> listarEmprestadas(Long organizacaoId) {
        organizacaoService.buscarOrganizacaoAtiva(organizacaoId);
        return ferramentaRepository.findByOrganizacaoIdAndStatus(organizacaoId, StatusFerramenta.EMPRESTADA)
                .stream().map(this::paraResponseDTO).toList();
    }

    public MovimentacaoFerramentaResponseDTO consultarUltimoResponsavel(Long ferramentaId) {
        return consultarUltimoResponsavel(idOrganizacaoLegadaOuNaoEncontrada(), ferramentaId);
    }

    public MovimentacaoFerramentaResponseDTO consultarUltimoResponsavel(
            Long organizacaoId,
            Long ferramentaId
    ) {
        buscarEntidadePorId(organizacaoId, ferramentaId);
        MovimentacaoFerramenta ultima = movimentacaoFerramentaRepository
                .findTopByOrganizacaoIdAndFerramentaIdAndTipoMovimentacaoInOrderByDataHoraDescIdDesc(
                        organizacaoId,
                        ferramentaId,
                        List.of(
                                TipoMovimentacaoFerramenta.RETIRADA,
                                TipoMovimentacaoFerramenta.TRANSFERENCIA
                        ))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Esta ferramenta ainda não possui registro de retirada"));
        return MovimentacaoFerramentaMapper.toResponse(ultima);
    }

    public Ferramenta buscarEntidadePorId(Long organizacaoId, Long id) {
        organizacaoService.buscarOrganizacaoAtiva(organizacaoId);
        return ferramentaRepository.findByIdAndOrganizacaoId(id, organizacaoId)
                .orElseThrow(() -> new ResourceNotFoundException("Ferramenta com id " + id + " não encontrada"));
    }

    private Ferramenta buscarEntidadeLegadaPorId(Long id) {
        return buscarEntidadePorId(idOrganizacaoLegadaOuNaoEncontrada(), id);
    }

    private Ferramenta buscarFerramentaAtivaParaAtualizacao(Long organizacaoId, Long id) {
        organizacaoService.buscarOrganizacaoAtiva(organizacaoId);
        Ferramenta ferramenta = ferramentaRepository.findByIdAndOrganizacaoIdForUpdate(id, organizacaoId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Ferramenta com id " + id + " não encontrada"));
        if (!Boolean.TRUE.equals(ferramenta.getAtivo())) {
            throw new BusinessException("A ferramenta está inativa");
        }
        return ferramenta;
    }

    private Long idOrganizacaoLegadaOuNaoEncontrada() {
        return organizacaoService.buscarIdOrganizacaoLegada()
                .orElseThrow(() -> new ResourceNotFoundException("Organização legada não encontrada"));
    }

    private String requireObservation(String value) {
        if (value == null || value.isBlank()) {
            throw new BusinessException("Observação é obrigatória para registrar uma correção");
        }
        return value.trim();
    }

    private MovimentacaoFerramenta salvarMovimentacao(
            Ferramenta ferramenta,
            Usuario executor,
            Usuario responsible,
            Usuario previousResponsible,
            TipoMovimentacaoFerramenta tipo,
            LocalDateTime operationTime,
            String observacao,
            String destination
    ) {
        return movimentacaoFerramentaRepository.save(MovimentacaoFerramenta.builder()
                .organizacao(ferramenta.getOrganizacao())
                .ferramenta(ferramenta)
                .usuario(executor)
                .responsavelUsuario(responsible)
                .responsavelAnteriorUsuario(previousResponsible)
                .tipoMovimentacao(tipo)
                .dataHora(operationTime)
                .observacao(normalizeOptional(observacao, 500, "Observação"))
                .destino(destination)
                .statusRevisao(StatusRevisaoMovimentacao.PENDENTE)
                .build());
    }

    private FerramentaResponseDTO paraResponseDTO(Ferramenta ferramenta) {
        Usuario responsavel = ferramenta.getResponsavelAtual();
        return FerramentaResponseDTO.builder()
                .id(ferramenta.getId()).patrimonio(ferramenta.getPatrimonio()).nome(ferramenta.getNome())
                .categoria(ferramenta.getCategoria()).status(ferramenta.getStatus())
                .responsavelAtualId(responsavel != null ? responsavel.getId() : null)
                .responsavelAtualNome(responsavel != null ? responsavel.getNome() : null)
                .responsavelDesde(ferramenta.getResponsavelDesde())
                .destinoAtual(ferramenta.getDestinoAtual())
                .localizacao(ferramenta.getLocalizacao()).ativo(ferramenta.getAtivo()).build();
    }

    private OrganizacaoMembro requireOperationalMember(Long organizacaoId, Long usuarioId) {
        return membroRepository.findByOrganizacaoIdAndUsuarioId(organizacaoId, usuarioId)
                .filter(member -> member.getStatus() == StatusMembroOrganizacao.ATIVO)
                .filter(member -> member.getPerfil() == PerfilMembroOrganizacao.ADMIN
                        || member.getPerfil() == PerfilMembroOrganizacao.OPERADOR)
                .filter(member -> Boolean.TRUE.equals(member.getOrganizacao().getAtiva()))
                .filter(member -> Boolean.TRUE.equals(member.getUsuario().getAtivo()))
                .orElseThrow(() -> new AccessDeniedException("Acesso negado"));
    }

    private String normalizeOptional(String value, int maximumLength, String fieldName) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.length() > maximumLength) {
            throw new BusinessException(fieldName + " deve ter no máximo " + maximumLength + " caracteres");
        }
        if (normalized.chars().anyMatch(Character::isISOControl)) {
            throw new BusinessException(fieldName + " contém caracteres inválidos");
        }
        return normalized;
    }

    private LocalDateTime now() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }
}
