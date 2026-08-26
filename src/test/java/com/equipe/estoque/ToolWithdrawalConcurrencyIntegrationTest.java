package com.equipe.estoque;

import com.equipe.estoque.dto.ferramenta.FerramentaRequestDTO;
import com.equipe.estoque.dto.movimentacao.MovimentacaoFerramentaRequestDTO;
import com.equipe.estoque.entity.Organizacao;
import com.equipe.estoque.entity.OrganizacaoMembro;
import com.equipe.estoque.entity.Usuario;
import com.equipe.estoque.enums.PerfilMembroOrganizacao;
import com.equipe.estoque.enums.PerfilUsuario;
import com.equipe.estoque.enums.StatusFerramenta;
import com.equipe.estoque.enums.StatusMembroOrganizacao;
import com.equipe.estoque.enums.TipoMovimentacaoFerramenta;
import com.equipe.estoque.repository.FerramentaRepository;
import com.equipe.estoque.repository.MovimentacaoFerramentaRepository;
import com.equipe.estoque.repository.OrganizacaoMembroRepository;
import com.equipe.estoque.repository.UsuarioRepository;
import com.equipe.estoque.service.FerramentaService;
import com.equipe.estoque.service.OrganizacaoService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class ToolWithdrawalConcurrencyIntegrationTest {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private OrganizacaoMembroRepository membroRepository;

    @Autowired
    private FerramentaRepository ferramentaRepository;

    @Autowired
    private MovimentacaoFerramentaRepository movementRepository;

    @Autowired
    private OrganizacaoService organizacaoService;

    @Autowired
    private FerramentaService ferramentaService;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    void duasRetiradasConcorrentesDevemProduzirSomenteUmaPosseValida() throws Exception {
        ConcurrentFixture fixture = createFixture();
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<Boolean> first = executor.submit(() -> attemptWithdrawal(
                    fixture,
                    fixture.firstOperatorId(),
                    ready,
                    start
            ));
            Future<Boolean> second = executor.submit(() -> attemptWithdrawal(
                    fixture,
                    fixture.secondOperatorId(),
                    ready,
                    start
            ));
            ready.await();
            start.countDown();

            int successes = (first.get() ? 1 : 0) + (second.get() ? 1 : 0);
            assertEquals(1, successes);
        } finally {
            executor.shutdownNow();
        }

        var tool = ferramentaRepository.findById(fixture.toolId()).orElseThrow();
        assertEquals(StatusFerramenta.EMPRESTADA, tool.getStatus());
        assertNotNull(tool.getResponsavelAtual());
        assertTrue(List.of(fixture.firstOperatorId(), fixture.secondOperatorId())
                .contains(tool.getResponsavelAtual().getId()));
        assertEquals(1, movementRepository.findAllByOrganizacaoId(fixture.organizationId()).stream()
                .filter(movement -> movement.getFerramenta().getId().equals(fixture.toolId()))
                .filter(movement -> movement.getTipoMovimentacao() == TipoMovimentacaoFerramenta.RETIRADA)
                .count());
    }

    @Test
    void duasConclusoesConcorrentesDevemProduzirSomenteUmEventoValido() throws Exception {
        ConcurrentFixture fixture = createFixture();
        MovimentacaoFerramentaRequestDTO maintenance = new MovimentacaoFerramentaRequestDTO();
        ferramentaService.registrarManutencao(
                fixture.organizationId(), fixture.toolId(), fixture.firstOperatorId(), maintenance
        );
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<Boolean> first = executor.submit(() -> attemptMaintenanceCompletion(
                    fixture, fixture.firstOperatorId(), ready, start
            ));
            Future<Boolean> second = executor.submit(() -> attemptMaintenanceCompletion(
                    fixture, fixture.secondOperatorId(), ready, start
            ));
            ready.await();
            start.countDown();

            assertEquals(1, (first.get() ? 1 : 0) + (second.get() ? 1 : 0));
        } finally {
            executor.shutdownNow();
        }

        var tool = ferramentaRepository.findById(fixture.toolId()).orElseThrow();
        assertEquals(StatusFerramenta.DISPONIVEL, tool.getStatus());
        assertEquals(1, movementRepository.findAllByOrganizacaoId(fixture.organizationId()).stream()
                .filter(movement -> movement.getFerramenta().getId().equals(fixture.toolId()))
                .filter(movement -> movement.getTipoMovimentacao()
                        == TipoMovimentacaoFerramenta.CONCLUSAO_MANUTENCAO)
                .count());
    }

    private boolean attemptWithdrawal(
            ConcurrentFixture fixture,
            Long operatorId,
            CountDownLatch ready,
            CountDownLatch start
    ) {
        ready.countDown();
        try {
            start.await();
            return Boolean.TRUE.equals(new TransactionTemplate(transactionManager).execute(status -> {
                MovimentacaoFerramentaRequestDTO request = new MovimentacaoFerramentaRequestDTO();
                request.setObservacao("Retirada concorrente");
                ferramentaService.registrarRetirada(
                        fixture.organizationId(),
                        fixture.toolId(),
                        operatorId,
                        request
                );
                return true;
            }));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return false;
        } catch (RuntimeException exception) {
            return false;
        }
    }

    private boolean attemptMaintenanceCompletion(
            ConcurrentFixture fixture,
            Long operatorId,
            CountDownLatch ready,
            CountDownLatch start
    ) {
        ready.countDown();
        try {
            start.await();
            return Boolean.TRUE.equals(new TransactionTemplate(transactionManager).execute(status -> {
                MovimentacaoFerramentaRequestDTO request = new MovimentacaoFerramentaRequestDTO();
                request.setObservacao("Conclusão concorrente");
                ferramentaService.registrarConclusaoManutencao(
                        fixture.organizationId(), fixture.toolId(), operatorId, request
                );
                return true;
            }));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return false;
        } catch (RuntimeException exception) {
            return false;
        }
    }

    private ConcurrentFixture createFixture() {
        String suffix = UUID.randomUUID().toString();
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        return transaction.execute(status -> {
            Usuario admin = saveUser("Admin concorrência", "admin-" + suffix + "@example.com");
            Usuario first = saveUser("Operador concorrente 1", "operador-1-" + suffix + "@example.com");
            Usuario second = saveUser("Operador concorrente 2", "operador-2-" + suffix + "@example.com");
            Organizacao organization = organizacaoService.criar("Concorrência " + suffix, admin.getId());
            saveMembership(organization, first, admin);
            saveMembership(organization, second, admin);
            FerramentaRequestDTO toolRequest = new FerramentaRequestDTO();
            toolRequest.setPatrimonio("CONCORRENTE-" + suffix);
            toolRequest.setNome("Furadeira concorrente");
            Long toolId = ferramentaService.criar(organization.getId(), toolRequest).getId();
            return new ConcurrentFixture(organization.getId(), toolId, first.getId(), second.getId());
        });
    }

    private Usuario saveUser(String name, String email) {
        return usuarioRepository.save(Usuario.builder()
                .nome(name)
                .email(email)
                .perfil(PerfilUsuario.OPERADOR)
                .ativo(true)
                .build());
    }

    private void saveMembership(Organizacao organization, Usuario user, Usuario admin) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        membroRepository.save(OrganizacaoMembro.builder()
                .organizacao(organization)
                .usuario(user)
                .perfil(PerfilMembroOrganizacao.OPERADOR)
                .status(StatusMembroOrganizacao.ATIVO)
                .solicitadoEm(now)
                .aprovadoEm(now)
                .aprovadoPorUsuario(admin)
                .build());
    }

    private record ConcurrentFixture(
            Long organizationId,
            Long toolId,
            Long firstOperatorId,
            Long secondOperatorId
    ) {
    }
}
