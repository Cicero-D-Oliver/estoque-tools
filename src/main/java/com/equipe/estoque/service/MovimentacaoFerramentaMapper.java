package com.equipe.estoque.service;

import com.equipe.estoque.dto.movimentacao.MovimentacaoFerramentaResponseDTO;
import com.equipe.estoque.entity.MovimentacaoFerramenta;
import com.equipe.estoque.entity.Usuario;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

final class MovimentacaoFerramentaMapper {

    private MovimentacaoFerramentaMapper() {
    }

    static MovimentacaoFerramentaResponseDTO toResponse(MovimentacaoFerramenta movement) {
        Usuario responsible = movement.getResponsavelUsuario();
        Usuario previousResponsible = movement.getResponsavelAnteriorUsuario();
        Usuario confirmedBy = movement.getConfirmadoPorUsuario();
        return MovimentacaoFerramentaResponseDTO.builder()
                .id(movement.getId())
                .ferramentaId(movement.getFerramenta().getId())
                .ferramentaNome(movement.getFerramenta().getNome())
                .ferramentaPatrimonio(movement.getFerramenta().getPatrimonio())
                .usuarioId(movement.getUsuario().getId())
                .usuarioNome(movement.getUsuario().getNome())
                .responsavelUsuarioId(responsible == null ? null : responsible.getId())
                .responsavelUsuarioNome(responsible == null ? null : responsible.getNome())
                .responsavelAnteriorUsuarioId(previousResponsible == null ? null : previousResponsible.getId())
                .responsavelAnteriorUsuarioNome(previousResponsible == null ? null : previousResponsible.getNome())
                .tipoMovimentacao(movement.getTipoMovimentacao())
                .dataHora(toUtc(movement.getDataHora()))
                .observacao(movement.getObservacao())
                .destino(movement.getDestino())
                .statusRevisao(movement.getStatusRevisao())
                .confirmadoPorUsuarioId(confirmedBy == null ? null : confirmedBy.getId())
                .confirmadoPorUsuarioNome(confirmedBy == null ? null : confirmedBy.getNome())
                .confirmadoEm(toUtc(movement.getConfirmadoEm()))
                .build();
    }

    private static OffsetDateTime toUtc(LocalDateTime value) {
        return value == null ? null : value.atOffset(ZoneOffset.UTC);
    }
}
