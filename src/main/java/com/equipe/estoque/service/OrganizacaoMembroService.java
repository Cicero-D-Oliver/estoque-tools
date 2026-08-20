package com.equipe.estoque.service;

import com.equipe.estoque.dto.organizacao.MembroOrganizacaoResponseDTO;
import com.equipe.estoque.dto.organizacao.OrganizacaoResponseDTO;
import com.equipe.estoque.entity.Organizacao;
import com.equipe.estoque.entity.OrganizacaoMembro;
import com.equipe.estoque.entity.Usuario;
import com.equipe.estoque.enums.PerfilMembroOrganizacao;
import com.equipe.estoque.enums.StatusMembroOrganizacao;
import com.equipe.estoque.exception.BusinessException;
import com.equipe.estoque.exception.ResourceNotFoundException;
import com.equipe.estoque.repository.OrganizacaoMembroRepository;
import com.equipe.estoque.repository.OrganizacaoRepository;
import com.equipe.estoque.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class OrganizacaoMembroService {

    private final OrganizacaoMembroRepository membroRepository;
    private final OrganizacaoRepository organizacaoRepository;
    private final UsuarioRepository usuarioRepository;

    public List<OrganizacaoResponseDTO> listarOrganizacoesDoUsuario(Long usuarioId) {
        return membroRepository.findByUsuarioIdOrderByOrganizacaoId(usuarioId).stream()
                .map(this::toOrganizationResponse)
                .toList();
    }

    public MembroOrganizacaoResponseDTO buscarVinculo(Long organizacaoId, Long usuarioId) {
        return membroRepository.findByOrganizacaoIdAndUsuarioId(organizacaoId, usuarioId)
                .map(this::toMemberResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Vínculo não encontrado"));
    }

    @Transactional
    public MembroOrganizacaoResponseDTO solicitarParticipacao(Long organizacaoId, Long usuarioId) {
        Organizacao organizacao = findActiveOrganization(organizacaoId);
        Usuario usuario = findActiveUser(usuarioId);
        LocalDateTime now = LocalDateTime.now();
        OrganizacaoMembro membro = membroRepository
                .findByOrganizacaoIdAndUsuarioId(organizacaoId, usuarioId)
                .map(existing -> reactivateRequest(existing, now))
                .orElseGet(() -> OrganizacaoMembro.builder()
                        .organizacao(organizacao)
                        .usuario(usuario)
                        .perfil(PerfilMembroOrganizacao.CONSULTA)
                        .status(StatusMembroOrganizacao.PENDENTE)
                        .solicitadoEm(now)
                        .build());
        membro = membroRepository.save(membro);
        log.info("Participação solicitada organizacaoId={} usuarioId={} membroId={}",
                organizacaoId, usuarioId, membro.getId());
        return toMemberResponse(membro);
    }

    public List<MembroOrganizacaoResponseDTO> listarSolicitacoes(Long organizacaoId, Long adminId) {
        requireActiveAdmin(organizacaoId, adminId);
        return membroRepository.findByOrganizacaoIdAndStatusOrderBySolicitadoEmAscIdAsc(
                        organizacaoId,
                        StatusMembroOrganizacao.PENDENTE
                ).stream()
                .map(this::toMemberResponse)
                .toList();
    }

    public List<MembroOrganizacaoResponseDTO> listarMembros(Long organizacaoId, Long adminId) {
        requireActiveAdmin(organizacaoId, adminId);
        return membroRepository.findByOrganizacaoIdOrderByUsuarioNomeAscIdAsc(organizacaoId).stream()
                .map(this::toMemberResponse)
                .toList();
    }

    @Transactional
    public MembroOrganizacaoResponseDTO aprovar(
            Long organizacaoId,
            Long membroId,
            Long adminId,
            PerfilMembroOrganizacao profile
    ) {
        lockActiveOrganization(organizacaoId);
        Usuario admin = requireActiveAdmin(organizacaoId, adminId).getUsuario();
        if (profile == PerfilMembroOrganizacao.ADMIN) {
            throw new BusinessException("Solicitações somente podem ser aprovadas como OPERADOR ou CONSULTA");
        }
        OrganizacaoMembro membro = findMemberForUpdate(organizacaoId, membroId);
        if (membro.getStatus() != StatusMembroOrganizacao.PENDENTE) {
            throw new BusinessException("Somente solicitações pendentes podem ser aprovadas");
        }
        LocalDateTime now = LocalDateTime.now();
        membro.setPerfil(profile);
        membro.setStatus(StatusMembroOrganizacao.ATIVO);
        membro.setAprovadoEm(now);
        membro.setAprovadoPorUsuario(admin);
        membro.setRemovidoEm(null);
        membro = membroRepository.save(membro);
        log.info("Participação aprovada organizacaoId={} membroId={} perfil={} adminId={}",
                organizacaoId, membroId, profile, adminId);
        return toMemberResponse(membro);
    }

    @Transactional
    public MembroOrganizacaoResponseDTO alterarPerfil(
            Long organizacaoId,
            Long membroId,
            Long adminId,
            PerfilMembroOrganizacao newProfile
    ) {
        lockActiveOrganization(organizacaoId);
        requireActiveAdmin(organizacaoId, adminId);
        OrganizacaoMembro membro = findMemberForUpdate(organizacaoId, membroId);
        if (membro.getStatus() != StatusMembroOrganizacao.ATIVO) {
            throw new BusinessException("Somente membros ativos podem ter o perfil alterado");
        }
        protectLastAdmin(membro, newProfile);
        membro.setPerfil(newProfile);
        membro = membroRepository.save(membro);
        log.info("Perfil de membro alterado organizacaoId={} membroId={} perfil={} adminId={}",
                organizacaoId, membroId, newProfile, adminId);
        return toMemberResponse(membro);
    }

    @Transactional
    public void remover(Long organizacaoId, Long membroId, Long adminId) {
        lockActiveOrganization(organizacaoId);
        requireActiveAdmin(organizacaoId, adminId);
        OrganizacaoMembro membro = findMemberForUpdate(organizacaoId, membroId);
        if (membro.getStatus() != StatusMembroOrganizacao.ATIVO) {
            throw new BusinessException("Somente membros ativos podem ser removidos");
        }
        protectLastAdmin(membro, PerfilMembroOrganizacao.CONSULTA);
        membro.setStatus(StatusMembroOrganizacao.REMOVIDO);
        membro.setRemovidoEm(LocalDateTime.now());
        membroRepository.save(membro);
        log.info("Membro removido organizacaoId={} membroId={} adminId={}",
                organizacaoId, membroId, adminId);
    }

    private OrganizacaoMembro reactivateRequest(OrganizacaoMembro membro, LocalDateTime now) {
        if (membro.getStatus() == StatusMembroOrganizacao.ATIVO) {
            throw new BusinessException("A conta já participa desta organização");
        }
        if (membro.getStatus() == StatusMembroOrganizacao.PENDENTE) {
            throw new BusinessException("Já existe uma solicitação pendente");
        }
        membro.setPerfil(PerfilMembroOrganizacao.CONSULTA);
        membro.setStatus(StatusMembroOrganizacao.PENDENTE);
        membro.setSolicitadoEm(now);
        membro.setAprovadoEm(null);
        membro.setAprovadoPorUsuario(null);
        membro.setRemovidoEm(null);
        return membro;
    }

    private void protectLastAdmin(OrganizacaoMembro member, PerfilMembroOrganizacao newProfile) {
        if (member.getPerfil() != PerfilMembroOrganizacao.ADMIN
                || newProfile == PerfilMembroOrganizacao.ADMIN) {
            return;
        }
        long activeAdmins = membroRepository.countByOrganizacaoIdAndStatusAndPerfil(
                member.getOrganizacao().getId(),
                StatusMembroOrganizacao.ATIVO,
                PerfilMembroOrganizacao.ADMIN
        );
        if (activeAdmins <= 1) {
            throw new BusinessException("A organização deve manter ao menos um ADMIN ativo");
        }
    }

    private OrganizacaoMembro requireActiveAdmin(Long organizacaoId, Long usuarioId) {
        return membroRepository.findByOrganizacaoIdAndUsuarioId(organizacaoId, usuarioId)
                .filter(member -> member.getStatus() == StatusMembroOrganizacao.ATIVO)
                .filter(member -> member.getPerfil() == PerfilMembroOrganizacao.ADMIN)
                .filter(member -> Boolean.TRUE.equals(member.getOrganizacao().getAtiva()))
                .filter(member -> Boolean.TRUE.equals(member.getUsuario().getAtivo()))
                .orElseThrow(() -> new AccessDeniedException("Acesso negado"));
    }

    private Organizacao lockActiveOrganization(Long organizacaoId) {
        return organizacaoRepository.findByIdForUpdate(organizacaoId)
                .filter(organization -> Boolean.TRUE.equals(organization.getAtiva()))
                .orElseThrow(() -> new ResourceNotFoundException("Organização não encontrada"));
    }

    private Organizacao findActiveOrganization(Long organizacaoId) {
        return organizacaoRepository.findById(organizacaoId)
                .filter(organization -> Boolean.TRUE.equals(organization.getAtiva()))
                .orElseThrow(() -> new ResourceNotFoundException("Organização não encontrada"));
    }

    private Usuario findActiveUser(Long usuarioId) {
        return usuarioRepository.findById(usuarioId)
                .filter(user -> Boolean.TRUE.equals(user.getAtivo()))
                .orElseThrow(() -> new ResourceNotFoundException("Conta não encontrada"));
    }

    private OrganizacaoMembro findMemberForUpdate(Long organizacaoId, Long membroId) {
        return membroRepository.findByIdAndOrganizacaoIdForUpdate(membroId, organizacaoId)
                .orElseThrow(() -> new ResourceNotFoundException("Vínculo não encontrado"));
    }

    private OrganizacaoResponseDTO toOrganizationResponse(OrganizacaoMembro member) {
        Organizacao organization = member.getOrganizacao();
        return OrganizacaoResponseDTO.builder()
                .id(organization.getId())
                .nome(organization.getNome())
                .ativa(organization.getAtiva())
                .criadaEm(organization.getCriadaEm())
                .perfil(member.getPerfil())
                .status(member.getStatus())
                .build();
    }

    private MembroOrganizacaoResponseDTO toMemberResponse(OrganizacaoMembro member) {
        Usuario approvedBy = member.getAprovadoPorUsuario();
        return MembroOrganizacaoResponseDTO.builder()
                .id(member.getId())
                .organizacaoId(member.getOrganizacao().getId())
                .usuarioId(member.getUsuario().getId())
                .usuarioNome(member.getUsuario().getNome())
                .usuarioEmail(member.getUsuario().getEmail())
                .perfil(member.getPerfil())
                .status(member.getStatus())
                .solicitadoEm(member.getSolicitadoEm())
                .aprovadoEm(member.getAprovadoEm())
                .aprovadoPorUsuarioId(approvedBy == null ? null : approvedBy.getId())
                .removidoEm(member.getRemovidoEm())
                .build();
    }
}
