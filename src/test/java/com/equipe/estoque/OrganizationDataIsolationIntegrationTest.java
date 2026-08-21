package com.equipe.estoque;

import com.equipe.estoque.dto.ferramenta.FerramentaRequestDTO;
import com.equipe.estoque.dto.item.ItemEstoqueRequestDTO;
import com.equipe.estoque.dto.movimentacao.MovimentacaoEstoqueRequestDTO;
import com.equipe.estoque.dto.movimentacao.MovimentacaoFerramentaRequestDTO;
import com.equipe.estoque.entity.Organizacao;
import com.equipe.estoque.entity.Usuario;
import com.equipe.estoque.enums.PerfilUsuario;
import com.equipe.estoque.exception.BusinessException;
import com.equipe.estoque.exception.ResourceNotFoundException;
import com.equipe.estoque.repository.MovimentacaoEstoqueRepository;
import com.equipe.estoque.repository.MovimentacaoFerramentaRepository;
import com.equipe.estoque.repository.UsuarioRepository;
import com.equipe.estoque.service.FerramentaService;
import com.equipe.estoque.service.ItemEstoqueService;
import com.equipe.estoque.service.OrganizacaoService;
import jakarta.persistence.EntityManagerFactory;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class OrganizationDataIsolationIntegrationTest {

    @Autowired
    private Flyway flyway;

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private OrganizacaoService organizacaoService;

    @Autowired
    private ItemEstoqueService itemEstoqueService;

    @Autowired
    private FerramentaService ferramentaService;

    @Autowired
    private MovimentacaoEstoqueRepository movimentacaoEstoqueRepository;

    @Autowired
    private MovimentacaoFerramentaRepository movimentacaoFerramentaRepository;

    @Test
    void deveIsolarConsultasEBuscasDeItensEFerramentas() {
        Usuario usuario = criarUsuario("isolamento-consultas@example.com");
        Organizacao organizacaoA = organizacaoService.criar("Isolamento A", usuario.getId());
        Organizacao organizacaoB = organizacaoService.criar("Isolamento B", usuario.getId());

        Long itemAId = itemEstoqueService.criar(
                organizacaoA.getId(), itemRequest("ITEM-A")
        ).getId();
        Long itemBId = itemEstoqueService.criar(
                organizacaoB.getId(), itemRequest("ITEM-B")
        ).getId();
        Long ferramentaAId = ferramentaService.criar(
                organizacaoA.getId(), ferramentaRequest("PAT-A")
        ).getId();
        Long ferramentaBId = ferramentaService.criar(
                organizacaoB.getId(), ferramentaRequest("PAT-B")
        ).getId();

        assertEquals(List.of(itemAId), itemEstoqueService.listarTodos(organizacaoA.getId())
                .stream().map(item -> item.getId()).toList());
        assertEquals(List.of(itemBId), itemEstoqueService.listarTodos(organizacaoB.getId())
                .stream().map(item -> item.getId()).toList());
        assertEquals(List.of(ferramentaAId), ferramentaService.listarTodas(organizacaoA.getId())
                .stream().map(ferramenta -> ferramenta.getId()).toList());
        assertEquals(List.of(ferramentaBId), ferramentaService.listarTodas(organizacaoB.getId())
                .stream().map(ferramenta -> ferramenta.getId()).toList());

        assertThrows(
                ResourceNotFoundException.class,
                () -> itemEstoqueService.buscarPorId(organizacaoB.getId(), itemAId)
        );
        assertThrows(
                ResourceNotFoundException.class,
                () -> ferramentaService.buscarPorId(organizacaoB.getId(), ferramentaAId)
        );
    }

    @Test
    void deveAplicarUnicidadeSomenteDentroDaOrganizacao() {
        Usuario usuario = criarUsuario("isolamento-unicidade@example.com");
        Organizacao organizacaoA = organizacaoService.criar("Unicidade A", usuario.getId());
        Organizacao organizacaoB = organizacaoService.criar("Unicidade B", usuario.getId());

        itemEstoqueService.criar(organizacaoA.getId(), itemRequest("CODIGO-IGUAL"));
        itemEstoqueService.criar(organizacaoB.getId(), itemRequest("CODIGO-IGUAL"));
        ferramentaService.criar(organizacaoA.getId(), ferramentaRequest("PATRIMONIO-IGUAL"));
        ferramentaService.criar(organizacaoB.getId(), ferramentaRequest("PATRIMONIO-IGUAL"));

        assertThrows(
                BusinessException.class,
                () -> itemEstoqueService.criar(
                        organizacaoA.getId(), itemRequest("CODIGO-IGUAL")
                )
        );
        assertThrows(
                BusinessException.class,
                () -> ferramentaService.criar(
                        organizacaoA.getId(), ferramentaRequest("PATRIMONIO-IGUAL")
                )
        );
    }

    @Test
    void deveRejeitarMovimentacoesEntreOrganizacoesNoServiceENoSQLite() {
        Usuario usuario = criarUsuario("isolamento-movimentacoes@example.com");
        Organizacao organizacaoA = organizacaoService.criar("Movimentações A", usuario.getId());
        Organizacao organizacaoB = organizacaoService.criar("Movimentações B", usuario.getId());
        Long itemAId = itemEstoqueService.criar(
                organizacaoA.getId(), itemRequest("MOV-ITEM-A")
        ).getId();
        Long ferramentaAId = ferramentaService.criar(
                organizacaoA.getId(), ferramentaRequest("MOV-PAT-A")
        ).getId();

        MovimentacaoEstoqueRequestDTO estoqueRequest = new MovimentacaoEstoqueRequestDTO();
        estoqueRequest.setQuantidade(2);
        estoqueRequest.setObservacao("Entrada isolada");
        assertThrows(
                ResourceNotFoundException.class,
                () -> itemEstoqueService.registrarEntrada(
                        organizacaoB.getId(), itemAId, usuario.getId(), estoqueRequest
                )
        );
        itemEstoqueService.registrarEntrada(
                organizacaoA.getId(), itemAId, usuario.getId(), estoqueRequest);
        assertEquals(1, movimentacaoEstoqueRepository
                .findAllByOrganizacaoId(organizacaoA.getId()).size());
        assertEquals(0, movimentacaoEstoqueRepository
                .findAllByOrganizacaoId(organizacaoB.getId()).size());

        MovimentacaoFerramentaRequestDTO ferramentaRequest =
                new MovimentacaoFerramentaRequestDTO();
        ferramentaRequest.setObservacao("Retirada isolada");
        assertThrows(
                ResourceNotFoundException.class,
                () -> ferramentaService.registrarRetirada(
                        organizacaoB.getId(), ferramentaAId, usuario.getId(), ferramentaRequest
                )
        );
        ferramentaService.registrarRetirada(
                organizacaoA.getId(), ferramentaAId, usuario.getId(), ferramentaRequest
        );
        assertEquals(1, movimentacaoFerramentaRepository
                .findAllByOrganizacaoId(organizacaoA.getId()).size());
        assertEquals(0, movimentacaoFerramentaRepository
                .findAllByOrganizacaoId(organizacaoB.getId()).size());

        assertThrows(DataAccessException.class, () -> jdbcTemplate.update("""
                INSERT INTO movimentacoes_estoque (
                    organizacao_id, item_estoque_id, usuario_id,
                    tipo_movimentacao, quantidade, data_hora
                ) VALUES (?, ?, ?, 'ENTRADA', 1, CURRENT_TIMESTAMP)
                """, organizacaoB.getId(), itemAId, usuario.getId()));
        assertThrows(DataAccessException.class, () -> jdbcTemplate.update("""
                INSERT INTO movimentacoes_ferramenta (
                    organizacao_id, ferramenta_id, usuario_id,
                    tipo_movimentacao, data_hora
                ) VALUES (?, ?, ?, 'MANUTENCAO', CURRENT_TIMESTAMP)
                """, organizacaoB.getId(), ferramentaAId, usuario.getId()));
    }

    @Test
    void deveValidarSchemaV4ComHibernateEFlywayNoSQLite() {
        assertEquals("6", flyway.info().current().getVersion().toString());
        assertEquals(List.of("1", "2", "3", "4", "5", "6"), jdbcTemplate.queryForList("""
                SELECT version
                  FROM flyway_schema_history
                 WHERE version IS NOT NULL
                 ORDER BY installed_rank
                """, String.class));
        assertEquals(0, jdbcTemplate.queryForList("PRAGMA foreign_key_check").size());
        assertTrue(entityManagerFactory.isOpen());
    }

    private Usuario criarUsuario(String email) {
        return usuarioRepository.saveAndFlush(Usuario.builder()
                .nome("Usuário de isolamento")
                .email(email)
                .perfil(PerfilUsuario.OPERADOR)
                .ativo(true)
                .build());
    }

    private ItemEstoqueRequestDTO itemRequest(String codigo) {
        ItemEstoqueRequestDTO request = new ItemEstoqueRequestDTO();
        request.setCodigo(codigo);
        request.setNome("Item isolado");
        request.setQuantidadeAtual(0);
        request.setQuantidadeMinima(0);
        return request;
    }

    private FerramentaRequestDTO ferramentaRequest(String patrimonio) {
        FerramentaRequestDTO request = new FerramentaRequestDTO();
        request.setPatrimonio(patrimonio);
        request.setNome("Ferramenta isolada");
        return request;
    }
}
