import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, RadioButton, Text, TextInput } from 'react-native-paper';
import type { Tool, ToolStatus, TransferResponsible } from '@/types/api';
import type {
  ToolAction,
  ToolActionPayload,
  ToolFormInput,
  ToolMovementInput,
} from '@/services/tool-service';
import { actionLabels } from './tool-ui';
import { colors, spacing } from '@/theme';

interface ToolActionDialogProps {
  action: ToolAction | null;
  tool: Tool | null;
  responsibles: TransferResponsible[];
  responsiblesLoading: boolean;
  responsiblesError: boolean;
  pending: boolean;
  requestError: string | null;
  onClose: () => void;
  onSubmit: (payload: ToolActionPayload) => Promise<void>;
}

interface Values {
  patrimonio: string;
  nome: string;
  categoria: string;
  localizacao: string;
  destino: string;
  observacao: string;
  novoResponsavelUsuarioId: string;
  novoStatus: '' | Exclude<ToolStatus, 'EMPRESTADA'>;
}

type FieldErrors = Partial<Record<keyof Values, string>>;

const emptyValues: Values = {
  patrimonio: '',
  nome: '',
  categoria: '',
  localizacao: '',
  destino: '',
  observacao: '',
  novoResponsavelUsuarioId: '',
  novoStatus: '',
};

const submitLabels: Record<ToolAction, string> = {
  create: 'Cadastrar ferramenta',
  edit: 'Salvar alterações',
  withdraw: 'Registrar retirada',
  return: 'Confirmar devolução',
  transfer: 'Confirmar transferência',
  maintenance: 'Enviar para manutenção',
  'complete-maintenance': 'Concluir manutenção',
  loss: 'Registrar perda',
  correction: 'Registrar correção',
  inactivate: 'Inativar ferramenta',
};

function optional(value: string): string | undefined {
  return value.trim() || undefined;
}

export function buildToolActionPayload(action: ToolAction, values: Values): ToolActionPayload {
  if (action === 'create' || action === 'edit') {
    const form: ToolFormInput = {
      patrimonio: values.patrimonio.trim(),
      nome: values.nome.trim(),
      categoria: optional(values.categoria),
      localizacao: optional(values.localizacao),
    };
    return { form };
  }
  const movement: ToolMovementInput = {
    destino: optional(values.destino),
    observacao: optional(values.observacao),
    novoResponsavelUsuarioId: values.novoResponsavelUsuarioId
      ? Number(values.novoResponsavelUsuarioId)
      : undefined,
    novoStatus: values.novoStatus || undefined,
  };
  return { movement };
}

export function validateToolAction(
  action: ToolAction,
  values: Values,
  tool: Tool | null,
): FieldErrors {
  const errors: FieldErrors = {};
  if (action === 'create' || action === 'edit') {
    if (!values.patrimonio.trim()) errors.patrimonio = 'Informe o patrimônio.';
    if (!values.nome.trim()) errors.nome = 'Informe o nome.';
  }
  if (action === 'transfer') {
    if (!values.novoResponsavelUsuarioId) {
      errors.novoResponsavelUsuarioId = 'Selecione o novo responsável.';
    } else if (Number(values.novoResponsavelUsuarioId) === tool?.responsavelAtualId) {
      errors.novoResponsavelUsuarioId = 'Escolha uma pessoa diferente.';
    }
  }
  if ((action === 'maintenance' || action === 'loss' || action === 'correction')
    && !values.observacao.trim()) {
    errors.observacao = action === 'maintenance'
      ? 'Informe o motivo da manutenção.'
      : 'Informe o motivo.';
  }
  if (action === 'correction' && !values.novoStatus) {
    errors.novoStatus = 'Selecione o novo estado.';
  }
  return errors;
}

export function ToolActionDialog({
  action,
  tool,
  responsibles,
  responsiblesLoading,
  responsiblesError,
  pending,
  requestError,
  onClose,
  onSubmit,
}: ToolActionDialogProps) {
  const [values, setValues] = useState<Values>(emptyValues);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    setValues(action === 'edit' && tool ? {
      ...emptyValues,
      patrimonio: tool.patrimonio,
      nome: tool.nome,
      categoria: tool.categoria ?? '',
      localizacao: tool.localizacao ?? '',
    } : emptyValues);
    setErrors({});
  }, [action, tool]);

  const eligibleResponsibles = useMemo(
    () => responsibles.filter((responsible) => responsible.id !== tool?.responsavelAtualId),
    [responsibles, tool?.responsavelAtualId],
  );

  if (!action) return null;

  const update = <Key extends keyof Values>(key: Key, value: Values[Key]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  async function submit() {
    if (!action) return;
    const nextErrors = validateToolAction(action, values, tool);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    await onSubmit(buildToolActionPayload(action, values));
  }

  const formAction = action === 'create' || action === 'edit';
  const showDestination = action === 'withdraw' || action === 'transfer';
  const showObservation = !formAction && action !== 'inactivate';
  const observationLabel = action === 'maintenance' || action === 'loss' || action === 'correction'
    ? 'Motivo'
    : 'Observação (opcional)';

  return (
    <Portal>
      <Dialog visible dismissable={!pending} onDismiss={onClose} style={styles.dialog}>
        <Dialog.Title>{actionLabels[action]}</Dialog.Title>
        <Dialog.Content>
          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            {tool && action !== 'edit' ? (
              <View style={styles.identity}>
                <Text variant="titleMedium" style={styles.toolName}>{tool.nome}</Text>
                <Text style={styles.asset}>{tool.patrimonio}</Text>
              </View>
            ) : null}

            {formAction ? (
              <>
                <TextInput
                  mode="outlined"
                  label="Patrimônio"
                  value={values.patrimonio}
                  onChangeText={(value) => update('patrimonio', value)}
                  error={Boolean(errors.patrimonio)}
                  maxLength={60}
                  testID="tool-patrimonio"
                />
                {errors.patrimonio ? <Text style={styles.error}>{errors.patrimonio}</Text> : null}
                <TextInput
                  mode="outlined"
                  label="Nome"
                  value={values.nome}
                  onChangeText={(value) => update('nome', value)}
                  error={Boolean(errors.nome)}
                  maxLength={120}
                  testID="tool-nome"
                />
                {errors.nome ? <Text style={styles.error}>{errors.nome}</Text> : null}
                <TextInput
                  mode="outlined"
                  label="Categoria (opcional)"
                  value={values.categoria}
                  onChangeText={(value) => update('categoria', value)}
                  maxLength={80}
                />
                <TextInput
                  mode="outlined"
                  label="Local de guarda (opcional)"
                  value={values.localizacao}
                  onChangeText={(value) => update('localizacao', value)}
                  maxLength={120}
                />
              </>
            ) : null}

            {action === 'transfer' ? (
              <View style={styles.choiceGroup}>
                <Text style={styles.choiceLabel}>Novo responsável</Text>
                {responsiblesLoading ? <Text style={styles.hint}>Carregando pessoas…</Text> : null}
                {responsiblesError ? (
                  <Text style={styles.error}>Não foi possível carregar os responsáveis.</Text>
                ) : null}
                {!responsiblesLoading && !responsiblesError ? (
                  <RadioButton.Group
                    value={values.novoResponsavelUsuarioId}
                    onValueChange={(value) => update('novoResponsavelUsuarioId', value)}
                  >
                    {eligibleResponsibles.map((responsible) => (
                      <RadioButton.Item
                        key={responsible.id}
                        label={responsible.nome}
                        value={String(responsible.id)}
                        style={styles.radioItem}
                      />
                    ))}
                  </RadioButton.Group>
                ) : null}
                {!responsiblesLoading && !responsiblesError && eligibleResponsibles.length === 0 ? (
                  <Text style={styles.hint}>Nenhuma outra pessoa está disponível.</Text>
                ) : null}
                {errors.novoResponsavelUsuarioId ? (
                  <Text style={styles.error}>{errors.novoResponsavelUsuarioId}</Text>
                ) : null}
              </View>
            ) : null}

            {showDestination ? (
              <TextInput
                mode="outlined"
                label="Destino (opcional)"
                value={values.destino}
                onChangeText={(value) => update('destino', value)}
                maxLength={160}
              />
            ) : null}

            {action === 'correction' ? (
              <View style={styles.choiceGroup}>
                <Text style={styles.choiceLabel}>Novo estado</Text>
                <RadioButton.Group
                  value={values.novoStatus}
                  onValueChange={(value) => update(
                    'novoStatus',
                    value as Values['novoStatus'],
                  )}
                >
                  {tool?.status !== 'DISPONIVEL' ? (
                    <RadioButton.Item label="Disponível" value="DISPONIVEL" style={styles.radioItem} />
                  ) : null}
                  {tool?.status !== 'MANUTENCAO' ? (
                    <RadioButton.Item label="Manutenção" value="MANUTENCAO" style={styles.radioItem} />
                  ) : null}
                  {tool?.status !== 'PERDIDA' ? (
                    <RadioButton.Item label="Perdida" value="PERDIDA" style={styles.radioItem} />
                  ) : null}
                </RadioButton.Group>
                {errors.novoStatus ? <Text style={styles.error}>{errors.novoStatus}</Text> : null}
              </View>
            ) : null}

            {showObservation ? (
              <>
                <TextInput
                  mode="outlined"
                  label={observationLabel}
                  value={values.observacao}
                  onChangeText={(value) => update('observacao', value)}
                  error={Boolean(errors.observacao)}
                  maxLength={500}
                  multiline
                  numberOfLines={3}
                  testID="tool-observacao"
                />
                {errors.observacao ? <Text style={styles.error}>{errors.observacao}</Text> : null}
              </>
            ) : null}

            {requestError ? <Text accessibilityRole="alert" style={styles.requestError}>{requestError}</Text> : null}
          </ScrollView>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onClose} disabled={pending}>Cancelar</Button>
          <Button
            mode="contained"
            loading={pending}
            disabled={pending || (action === 'transfer' && responsiblesLoading)}
            onPress={() => void submit()}
            textColor={action === 'loss' || action === 'inactivate' ? '#FFFFFF' : undefined}
            buttonColor={action === 'loss' || action === 'inactivate' ? colors.danger : undefined}
          >
            {submitLabels[action]}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: { maxHeight: '92%' },
  scroll: { maxHeight: 540 },
  identity: { marginBottom: spacing.md },
  toolName: { color: colors.text, fontWeight: '700' },
  asset: { color: colors.textMuted, marginTop: 2 },
  choiceGroup: { marginTop: spacing.md },
  choiceLabel: { color: colors.text, fontWeight: '700', marginBottom: spacing.xs },
  radioItem: { minHeight: 48, paddingHorizontal: 0 },
  hint: { color: colors.textMuted, paddingVertical: spacing.sm },
  error: { color: colors.danger, fontSize: 12, marginTop: spacing.xs },
  requestError: {
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    borderLeftColor: colors.danger,
    borderLeftWidth: 3,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
});
