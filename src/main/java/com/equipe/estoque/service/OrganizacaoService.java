package com.equipe.estoque.service;

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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class OrganizacaoService {

    private static final int TAMANHO_MAXIMO_NOME = 120;

    private final OrganizacaoRepository organizacaoRepository;
    private final OrganizacaoMembroRepository membroRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional
    public Organizacao criar(String nome, Long criadorUsuarioId) {
        String nomeNormalizado = normalizarNome(nome);
        Usuario criador = usuarioRepository.findById(criadorUsuarioId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Usuário com id " + criadorUsuarioId + " não encontrado"
                ));
        if (!Boolean.TRUE.equals(criador.getAtivo())) {
            throw new BusinessException("O usuário criador está inativo");
        }

        LocalDateTime agora = LocalDateTime.now();
        Organizacao organizacao = organizacaoRepository.save(Organizacao.builder()
                .nome(nomeNormalizado)
                .ativa(true)
                .criadaEm(agora)
                .criadaPorUsuario(criador)
                .build());

        membroRepository.save(OrganizacaoMembro.builder()
                .organizacao(organizacao)
                .usuario(criador)
                .perfil(PerfilMembroOrganizacao.ADMIN)
                .status(StatusMembroOrganizacao.ATIVO)
                .solicitadoEm(agora)
                .aprovadoEm(agora)
                .aprovadoPorUsuario(criador)
                .build());

        log.info("Organização criada id={} criadorUsuarioId={}", organizacao.getId(), criador.getId());
        return organizacao;
    }

    private String normalizarNome(String nome) {
        if (nome == null || nome.isBlank()) {
            throw new BusinessException("O nome da organização é obrigatório");
        }
        String nomeNormalizado = nome.trim();
        if (nomeNormalizado.length() > TAMANHO_MAXIMO_NOME) {
            throw new BusinessException("O nome da organização deve ter no máximo 120 caracteres");
        }
        return nomeNormalizado;
    }
}
