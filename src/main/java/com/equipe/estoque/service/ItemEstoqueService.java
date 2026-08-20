package com.equipe.estoque.service;

import com.equipe.estoque.dto.item.ItemEstoqueRequestDTO;
import com.equipe.estoque.dto.item.ItemEstoqueResponseDTO;
import com.equipe.estoque.dto.movimentacao.MovimentacaoEstoqueRequestDTO;
import com.equipe.estoque.dto.movimentacao.MovimentacaoEstoqueResponseDTO;
import com.equipe.estoque.entity.ItemEstoque;
import com.equipe.estoque.entity.MovimentacaoEstoque;
import com.equipe.estoque.entity.Organizacao;
import com.equipe.estoque.entity.Usuario;
import com.equipe.estoque.enums.TipoMovimentacaoEstoque;
import com.equipe.estoque.exception.BusinessException;
import com.equipe.estoque.exception.ResourceNotFoundException;
import com.equipe.estoque.repository.ItemEstoqueRepository;
import com.equipe.estoque.repository.MovimentacaoEstoqueRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ItemEstoqueService {

    private static final int MAX_STOCK = 1_000_000_000;

    private final ItemEstoqueRepository itemEstoqueRepository;
    private final MovimentacaoEstoqueRepository movimentacaoEstoqueRepository;
    private final UsuarioService usuarioService;
    private final OrganizacaoService organizacaoService;

    @Transactional
    public ItemEstoqueResponseDTO criar(ItemEstoqueRequestDTO dto) {
        return criar(organizacaoService.obterOuCriarOrganizacaoLegada().getId(), dto);
    }

    @Transactional
    public ItemEstoqueResponseDTO criar(Long organizacaoId, ItemEstoqueRequestDTO dto) {
        Organizacao organizacao = organizacaoService.buscarOrganizacaoAtiva(organizacaoId);
        String codigo = dto.getCodigo().trim();
        if (itemEstoqueRepository.existsByCodigoAndOrganizacaoId(codigo, organizacaoId)) {
            throw new BusinessException("Já existe um item com esse código");
        }

        ItemEstoque item = ItemEstoque.builder()
                .organizacao(organizacao)
                .codigo(codigo)
                .nome(dto.getNome().trim())
                .categoria(trimNullable(dto.getCategoria()))
                .quantidadeAtual(dto.getQuantidadeAtual() != null ? dto.getQuantidadeAtual() : 0)
                .quantidadeMinima(dto.getQuantidadeMinima() != null ? dto.getQuantidadeMinima() : 0)
                .localizacao(trimNullable(dto.getLocalizacao()))
                .ativo(true)
                .build();

        item = itemEstoqueRepository.save(item);
        log.info("Item criado id={} organizacaoId={}", item.getId(), organizacaoId);
        return paraResponseDTO(item);
    }

    public List<ItemEstoqueResponseDTO> listarTodos() {
        return organizacaoService.buscarIdOrganizacaoLegada()
                .map(this::listarTodos)
                .orElseGet(List::of);
    }

    public List<ItemEstoqueResponseDTO> listarTodos(Long organizacaoId) {
        organizacaoService.buscarOrganizacaoAtiva(organizacaoId);
        return itemEstoqueRepository.findAllByOrganizacaoId(organizacaoId)
                .stream().map(this::paraResponseDTO).toList();
    }

    public ItemEstoqueResponseDTO buscarPorId(Long id) {
        return paraResponseDTO(buscarEntidadeLegadaPorId(id));
    }

    public ItemEstoqueResponseDTO buscarPorId(Long organizacaoId, Long id) {
        return paraResponseDTO(buscarEntidadePorId(organizacaoId, id));
    }

    @Transactional
    public ItemEstoqueResponseDTO atualizar(Long id, ItemEstoqueRequestDTO dto) {
        return atualizar(idOrganizacaoLegadaOuNaoEncontrada(), id, dto);
    }

    @Transactional
    public ItemEstoqueResponseDTO atualizar(Long organizacaoId, Long id, ItemEstoqueRequestDTO dto) {
        ItemEstoque item = buscarEntidadePorId(organizacaoId, id);
        String codigo = dto.getCodigo().trim();

        if (!item.getCodigo().equals(codigo)
                && itemEstoqueRepository.existsByCodigoAndOrganizacaoId(codigo, organizacaoId)) {
            throw new BusinessException("Já existe um item com esse código");
        }

        item.setCodigo(codigo);
        item.setNome(dto.getNome().trim());
        item.setCategoria(trimNullable(dto.getCategoria()));
        item.setQuantidadeMinima(dto.getQuantidadeMinima() != null
                ? dto.getQuantidadeMinima() : item.getQuantidadeMinima());
        item.setLocalizacao(trimNullable(dto.getLocalizacao()));

        item = itemEstoqueRepository.save(item);
        log.info("Item atualizado id={} organizacaoId={}", item.getId(), organizacaoId);
        return paraResponseDTO(item);
    }

    @Transactional
    public void inativar(Long id) {
        inativar(idOrganizacaoLegadaOuNaoEncontrada(), id);
    }

    @Transactional
    public void inativar(Long organizacaoId, Long id) {
        ItemEstoque item = buscarEntidadePorId(organizacaoId, id);
        item.setAtivo(false);
        itemEstoqueRepository.save(item);
        log.info("Item inativado id={} organizacaoId={}", item.getId(), organizacaoId);
    }

    @Transactional
    public MovimentacaoEstoqueResponseDTO registrarEntrada(
            Long organizacaoId,
            Long itemId,
            Long executorUsuarioId,
            MovimentacaoEstoqueRequestDTO dto
    ) {
        validarQuantidadePositiva(dto.getQuantidade());
        ItemEstoque item = buscarItemAtivo(organizacaoId, itemId);
        Usuario usuario = usuarioService.buscarUsuarioAtivo(executorUsuarioId);

        long novoSaldo = (long) item.getQuantidadeAtual() + dto.getQuantidade();
        if (novoSaldo > MAX_STOCK) {
            throw new BusinessException("A entrada excede o saldo máximo permitido");
        }

        item.setQuantidadeAtual((int) novoSaldo);
        itemEstoqueRepository.save(item);
        MovimentacaoEstoque movimentacao = salvarMovimentacao(
                item, usuario, TipoMovimentacaoEstoque.ENTRADA, dto.getQuantidade(), dto.getObservacao());
        log.info("Entrada registrada itemId={} organizacaoId={} usuarioId={} quantidade={}",
                item.getId(), organizacaoId, usuario.getId(), dto.getQuantidade());
        return paraMovimentacaoResponseDTO(movimentacao);
    }

    @Transactional
    public MovimentacaoEstoqueResponseDTO registrarSaida(
            Long organizacaoId,
            Long itemId,
            Long executorUsuarioId,
            MovimentacaoEstoqueRequestDTO dto
    ) {
        validarQuantidadePositiva(dto.getQuantidade());
        ItemEstoque item = buscarItemAtivo(organizacaoId, itemId);
        Usuario usuario = usuarioService.buscarUsuarioAtivo(executorUsuarioId);

        if (item.getQuantidadeAtual() < dto.getQuantidade()) {
            throw new BusinessException("Quantidade insuficiente em estoque. Disponível: "
                    + item.getQuantidadeAtual() + ", solicitado: " + dto.getQuantidade());
        }

        item.setQuantidadeAtual(item.getQuantidadeAtual() - dto.getQuantidade());
        itemEstoqueRepository.save(item);
        MovimentacaoEstoque movimentacao = salvarMovimentacao(
                item, usuario, TipoMovimentacaoEstoque.SAIDA, dto.getQuantidade(), dto.getObservacao());
        log.info("Saída registrada itemId={} organizacaoId={} usuarioId={} quantidade={}",
                item.getId(), organizacaoId, usuario.getId(), dto.getQuantidade());
        return paraMovimentacaoResponseDTO(movimentacao);
    }

    @Transactional
    public MovimentacaoEstoqueResponseDTO registrarCorrecao(
            Long organizacaoId,
            Long itemId,
            Long executorUsuarioId,
            MovimentacaoEstoqueRequestDTO dto
    ) {
        String observacao = requireObservation(dto.getObservacao());
        ItemEstoque item = buscarItemAtivo(organizacaoId, itemId);
        Usuario usuario = usuarioService.buscarUsuarioAtivo(executorUsuarioId);

        int quantidadeAnterior = item.getQuantidadeAtual();
        int novaQuantidade = dto.getQuantidade();
        int diferenca = novaQuantidade - quantidadeAnterior;

        item.setQuantidadeAtual(novaQuantidade);
        itemEstoqueRepository.save(item);
        String auditObservation = observacao + " (quantidade anterior: " + quantidadeAnterior
                + ", nova: " + novaQuantidade + ")";
        MovimentacaoEstoque movimentacao = salvarMovimentacao(
                item, usuario, TipoMovimentacaoEstoque.CORRECAO, diferenca, auditObservation);
        log.info("Correção registrada itemId={} organizacaoId={} usuarioId={} diferenca={}",
                item.getId(), organizacaoId, usuario.getId(), diferenca);
        return paraMovimentacaoResponseDTO(movimentacao);
    }

    public List<MovimentacaoEstoqueResponseDTO> consultarHistorico(Long itemId) {
        return consultarHistorico(idOrganizacaoLegadaOuNaoEncontrada(), itemId);
    }

    public List<MovimentacaoEstoqueResponseDTO> consultarHistorico(Long organizacaoId, Long itemId) {
        buscarEntidadePorId(organizacaoId, itemId);
        return movimentacaoEstoqueRepository
                .findByOrganizacaoIdAndItemEstoqueIdOrderByDataHoraDescIdDesc(organizacaoId, itemId)
                .stream().map(this::paraMovimentacaoResponseDTO).toList();
    }

    public List<ItemEstoqueResponseDTO> listarAbaixoDoMinimo() {
        return organizacaoService.buscarIdOrganizacaoLegada()
                .map(this::listarAbaixoDoMinimo)
                .orElseGet(List::of);
    }

    public List<ItemEstoqueResponseDTO> listarAbaixoDoMinimo(Long organizacaoId) {
        organizacaoService.buscarOrganizacaoAtiva(organizacaoId);
        return itemEstoqueRepository.findItensAbaixoDoMinimoByOrganizacaoId(organizacaoId)
                .stream().map(this::paraResponseDTO).toList();
    }

    public ItemEstoque buscarEntidadePorId(Long organizacaoId, Long id) {
        organizacaoService.buscarOrganizacaoAtiva(organizacaoId);
        return itemEstoqueRepository.findByIdAndOrganizacaoId(id, organizacaoId)
                .orElseThrow(() -> new ResourceNotFoundException("Item de estoque com id " + id + " não encontrado"));
    }

    private ItemEstoque buscarEntidadeLegadaPorId(Long id) {
        return buscarEntidadePorId(idOrganizacaoLegadaOuNaoEncontrada(), id);
    }

    private ItemEstoque buscarItemAtivo(Long organizacaoId, Long id) {
        ItemEstoque item = buscarEntidadePorId(organizacaoId, id);
        if (!Boolean.TRUE.equals(item.getAtivo())) {
            throw new BusinessException("O item de estoque está inativo");
        }
        return item;
    }

    private Long idOrganizacaoLegadaOuNaoEncontrada() {
        return organizacaoService.buscarIdOrganizacaoLegada()
                .orElseThrow(() -> new ResourceNotFoundException("Organização legada não encontrada"));
    }

    private void validarQuantidadePositiva(Integer quantidade) {
        if (quantidade == null || quantidade <= 0) {
            throw new BusinessException("A quantidade deve ser maior que zero para entrada ou saída");
        }
    }

    private String requireObservation(String value) {
        if (value == null || value.isBlank()) {
            throw new BusinessException("Observação é obrigatória para registrar uma correção de estoque");
        }
        return value.trim();
    }

    private String trimNullable(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private MovimentacaoEstoque salvarMovimentacao(
            ItemEstoque item,
            Usuario usuario,
            TipoMovimentacaoEstoque tipo,
            Integer quantidade,
            String observacao
    ) {
        return movimentacaoEstoqueRepository.save(MovimentacaoEstoque.builder()
                .organizacao(item.getOrganizacao())
                .itemEstoque(item)
                .usuario(usuario)
                .tipoMovimentacao(tipo)
                .quantidade(quantidade)
                .observacao(trimNullable(observacao))
                .build());
    }

    private ItemEstoqueResponseDTO paraResponseDTO(ItemEstoque item) {
        return ItemEstoqueResponseDTO.builder()
                .id(item.getId()).codigo(item.getCodigo()).nome(item.getNome()).categoria(item.getCategoria())
                .quantidadeAtual(item.getQuantidadeAtual()).quantidadeMinima(item.getQuantidadeMinima())
                .localizacao(item.getLocalizacao()).ativo(item.getAtivo())
                .abaixoMinimo(item.getQuantidadeAtual() < item.getQuantidadeMinima()).build();
    }

    private MovimentacaoEstoqueResponseDTO paraMovimentacaoResponseDTO(MovimentacaoEstoque mov) {
        return MovimentacaoEstoqueResponseDTO.builder()
                .id(mov.getId()).itemEstoqueId(mov.getItemEstoque().getId())
                .itemEstoqueNome(mov.getItemEstoque().getNome()).usuarioId(mov.getUsuario().getId())
                .usuarioNome(mov.getUsuario().getNome()).tipoMovimentacao(mov.getTipoMovimentacao())
                .quantidade(mov.getQuantidade()).dataHora(mov.getDataHora()).observacao(mov.getObservacao()).build();
    }
}
