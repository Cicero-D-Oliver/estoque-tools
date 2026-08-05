package com.equipe.estoque.service;

import com.equipe.estoque.dto.usuario.UsuarioRequestDTO;
import com.equipe.estoque.dto.usuario.UsuarioResponseDTO;
import com.equipe.estoque.entity.Usuario;
import com.equipe.estoque.exception.BusinessException;
import com.equipe.estoque.exception.ResourceNotFoundException;
import com.equipe.estoque.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;

    @Transactional
    public UsuarioResponseDTO criar(UsuarioRequestDTO dto) {
        String email = normalizeEmail(dto.getEmail());
        if (usuarioRepository.existsByEmail(email)) {
            throw new BusinessException("Já existe um usuário cadastrado com esse e-mail");
        }

        Usuario usuario = Usuario.builder()
                .nome(dto.getNome().trim())
                .email(email)
                .perfil(dto.getPerfil())
                .ativo(true)
                .build();

        usuario = usuarioRepository.save(usuario);
        log.info("Usuário criado id={}", usuario.getId());
        return paraResponseDTO(usuario);
    }

    public List<UsuarioResponseDTO> listarTodos() {
        return usuarioRepository.findAll().stream().map(this::paraResponseDTO).toList();
    }

    public UsuarioResponseDTO buscarPorId(Long id) {
        return paraResponseDTO(buscarEntidadePorId(id));
    }

    @Transactional
    public UsuarioResponseDTO atualizar(Long id, UsuarioRequestDTO dto) {
        Usuario usuario = buscarEntidadePorId(id);
        String email = normalizeEmail(dto.getEmail());

        if (!usuario.getEmail().equals(email) && usuarioRepository.existsByEmail(email)) {
            throw new BusinessException("Já existe um usuário cadastrado com esse e-mail");
        }

        usuario.setNome(dto.getNome().trim());
        usuario.setEmail(email);
        usuario.setPerfil(dto.getPerfil());

        usuario = usuarioRepository.save(usuario);
        log.info("Usuário atualizado id={}", usuario.getId());
        return paraResponseDTO(usuario);
    }

    @Transactional
    public void inativar(Long id) {
        Usuario usuario = buscarEntidadePorId(id);
        usuario.setAtivo(false);
        usuarioRepository.save(usuario);
        log.info("Usuário inativado id={}", usuario.getId());
    }

    public Usuario buscarEntidadePorId(Long id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário com id " + id + " não encontrado"));
    }

    public Usuario buscarUsuarioAtivo(Long id) {
        Usuario usuario = buscarEntidadePorId(id);
        if (!Boolean.TRUE.equals(usuario.getAtivo())) {
            throw new BusinessException("O usuário responsável está inativo");
        }
        return usuario;
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private UsuarioResponseDTO paraResponseDTO(Usuario usuario) {
        return UsuarioResponseDTO.builder()
                .id(usuario.getId())
                .nome(usuario.getNome())
                .email(usuario.getEmail())
                .perfil(usuario.getPerfil())
                .ativo(usuario.getAtivo())
                .build();
    }
}
