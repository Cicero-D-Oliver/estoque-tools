package com.equipe.estoque.security;

import com.equipe.estoque.enums.PerfilMembroOrganizacao;
import com.equipe.estoque.enums.StatusMembroOrganizacao;
import com.equipe.estoque.repository.OrganizacaoMembroRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.List;

@Component("organizationAuthorization")
@RequiredArgsConstructor
public class OrganizationAuthorization {

    public static final String HEADER_NAME = "X-Organization-Id";

    private static final List<PerfilMembroOrganizacao> READ_PROFILES = List.of(
            PerfilMembroOrganizacao.ADMIN,
            PerfilMembroOrganizacao.OPERADOR,
            PerfilMembroOrganizacao.CONSULTA
    );
    private static final List<PerfilMembroOrganizacao> OPERATION_PROFILES = List.of(
            PerfilMembroOrganizacao.ADMIN,
            PerfilMembroOrganizacao.OPERADOR
    );
    private static final List<PerfilMembroOrganizacao> ADMIN_PROFILE = List.of(
            PerfilMembroOrganizacao.ADMIN
    );

    private final OrganizacaoMembroRepository membroRepository;
    private final AuthenticatedAccount authenticatedAccount;

    public boolean canRead(Long organizacaoId, Authentication authentication) {
        return hasProfile(organizacaoId, authentication, READ_PROFILES);
    }

    public boolean canOperate(Long organizacaoId, Authentication authentication) {
        return hasProfile(organizacaoId, authentication, OPERATION_PROFILES);
    }

    public boolean canAdmin(Long organizacaoId, Authentication authentication) {
        return hasProfile(organizacaoId, authentication, ADMIN_PROFILE);
    }

    private boolean hasProfile(
            Long organizacaoId,
            Authentication authentication,
            List<PerfilMembroOrganizacao> profiles
    ) {
        if (organizacaoId == null || organizacaoId <= 0) {
            return false;
        }
        try {
            return membroRepository.possuiAcessoAtivo(
                    organizacaoId,
                    authenticatedAccount.id(authentication),
                    StatusMembroOrganizacao.ATIVO,
                    profiles
            );
        } catch (RuntimeException exception) {
            return false;
        }
    }
}
