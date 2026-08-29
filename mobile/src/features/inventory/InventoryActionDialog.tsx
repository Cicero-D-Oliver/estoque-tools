import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, Text, TextInput } from 'react-native-paper';
import type { StockItem } from '@/types/api';
import type {
  InventoryAction,
  InventoryActionPayload,
  StockItemInput,
  StockMovementInput,
} from '@/services/inventory-service';
import { inventoryActionLabels } from './inventory-ui';
import { colors, spacing } from '@/theme';

export interface InventoryDialogValues {
  codigo: string;
  nome: string;
  categoria: string;
  quantidadeAtual: string;
  quantidadeMinima: string;
  localizacao: string;
  quantidade: string;
  observacao: string;
}

type FieldErrors = Partial<Record<keyof InventoryDialogValues, string>>;

export const emptyInventoryValues: InventoryDialogValues = {
  codigo: '', nome: '', categoria: '', quantidadeAtual: '0', quantidadeMinima: '0',
  localizacao: '', quantidade: '', observacao: '',
};

const submitLabels: Record<InventoryAction, string> = {
  create: 'Cadastrar item',
  edit: 'Salvar alterações',
  entry: 'Registrar entrada',
  exit: 'Registrar saída',
  correction: 'Registrar correção',
  inactivate: 'Inativar item',
};

function numberValue(value: string): number {
  return value.trim() ? Number(value.replace(',', '.')) : Number.NaN;
}

function optional(value: string): string | undefined {
  return value.trim() || undefined;
}

export function validateInventoryAction(
  action: InventoryAction,
  values: InventoryDialogValues,
): FieldErrors {
  const errors: FieldErrors = {};
  if (action === 'create' || action === 'edit') {
    if (!values.codigo.trim()) errors.codigo = 'Informe o código.';
    if (!values.nome.trim()) errors.nome = 'Informe o nome.';
    if (!Number.isInteger(numberValue(values.quantidadeMinima))
      || numberValue(values.quantidadeMinima) < 0
      || numberValue(values.quantidadeMinima) > 1_000_000_000) {
      errors.quantidadeMinima = 'Informe um valor igual ou maior que zero.';
    }
    if (!Number.isInteger(numberValue(values.quantidadeAtual))
      || numberValue(values.quantidadeAtual) < 0
      || numberValue(values.quantidadeAtual) > 1_000_000_000) {
      errors.quantidadeAtual = 'Informe um valor igual ou maior que zero.';
    }
  }
  if (action === 'entry' || action === 'exit') {
    if (!Number.isInteger(numberValue(values.quantidade))
      || numberValue(values.quantidade) <= 0
      || numberValue(values.quantidade) > 1_000_000_000) {
      errors.quantidade = 'Informe uma quantidade maior que zero.';
    }
  }
  if (action === 'correction') {
    if (!Number.isInteger(numberValue(values.quantidade))
      || numberValue(values.quantidade) < 0
      || numberValue(values.quantidade) > 1_000_000_000) {
      errors.quantidade = 'Informe o novo saldo.';
    }
    if (!values.observacao.trim()) errors.observacao = 'Informe o motivo da correção.';
  }
  return errors;
}

export function buildInventoryPayload(
  action: InventoryAction,
  values: InventoryDialogValues,
): InventoryActionPayload {
  if (action === 'create' || action === 'edit') {
    const form: StockItemInput = {
      codigo: values.codigo.trim(),
      nome: values.nome.trim(),
      categoria: optional(values.categoria),
      quantidadeAtual: numberValue(values.quantidadeAtual),
      quantidadeMinima: numberValue(values.quantidadeMinima),
      localizacao: optional(values.localizacao),
    };
    return { form };
  }
  const movement: StockMovementInput = {
    quantidade: numberValue(values.quantidade),
    observacao: optional(values.observacao),
  };
  return { movement };
}

export function InventoryActionDialog({
  action,
  item,
  pending,
  requestError,
  onClose,
  onSubmit,
}: {
  action: InventoryAction | null;
  item: StockItem | null;
  pending: boolean;
  requestError: string | null;
  onClose: () => void;
  onSubmit: (payload: InventoryActionPayload) => Promise<void>;
}) {
  const [values, setValues] = useState<InventoryDialogValues>(emptyInventoryValues);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    setValues(action === 'edit' && item ? {
      codigo: item.codigo,
      nome: item.nome,
      categoria: item.categoria ?? '',
      quantidadeAtual: String(item.quantidadeAtual),
      quantidadeMinima: String(item.quantidadeMinima),
      localizacao: item.localizacao ?? '',
      quantidade: '',
      observacao: '',
    } : emptyInventoryValues);
    setErrors({});
  }, [action, item]);

  if (!action) return null;
  const itemForm = action === 'create' || action === 'edit';
  const movement = action === 'entry' || action === 'exit' || action === 'correction';

  const update = (key: keyof InventoryDialogValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  async function submit() {
    const nextErrors = validateInventoryAction(action!, values);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    await onSubmit(buildInventoryPayload(action!, values));
  }

  const field = (
    key: keyof InventoryDialogValues,
    label: string,
    options: { numeric?: boolean; maxLength?: number; multiline?: boolean } = {},
  ) => (
    <View>
      <TextInput
        mode="outlined"
        label={label}
        value={values[key]}
        onChangeText={(value) => update(key, value)}
        error={Boolean(errors[key])}
        keyboardType={options.numeric ? 'number-pad' : 'default'}
        maxLength={options.maxLength}
        multiline={options.multiline}
        numberOfLines={options.multiline ? 3 : undefined}
        testID={`inventory-${key}`}
      />
      {errors[key] ? <Text style={styles.error}>{errors[key]}</Text> : null}
    </View>
  );

  return (
    <Portal>
      <Dialog visible dismissable={!pending} onDismiss={onClose} style={styles.dialog}>
        <Dialog.Title>{inventoryActionLabels[action]}</Dialog.Title>
        <Dialog.Content>
          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            {item && !itemForm ? (
              <View style={styles.identity}>
                <Text variant="titleMedium" style={styles.name}>{item.nome}</Text>
                <Text style={styles.meta}>{item.quantidadeAtual} em estoque</Text>
              </View>
            ) : null}
            {itemForm ? (
              <>
                {field('codigo', 'Código', { maxLength: 60 })}
                {field('nome', 'Nome', { maxLength: 120 })}
                {field('categoria', 'Categoria (opcional)', { maxLength: 80 })}
                {action === 'create' ? field('quantidadeAtual', 'Quantidade inicial', { numeric: true }) : null}
                {field('quantidadeMinima', 'Estoque mínimo', { numeric: true })}
                {field('localizacao', 'Localização (opcional)', { maxLength: 120 })}
              </>
            ) : null}
            {movement ? (
              <>
                {field(
                  'quantidade',
                  action === 'correction' ? 'Novo saldo' : 'Quantidade',
                  { numeric: true },
                )}
                {field(
                  'observacao',
                  action === 'correction' ? 'Motivo' : 'Observação (opcional)',
                  { maxLength: 500, multiline: true },
                )}
              </>
            ) : null}
            {requestError ? <Text accessibilityRole="alert" style={styles.requestError}>{requestError}</Text> : null}
          </ScrollView>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onClose} disabled={pending}>Cancelar</Button>
          <Button
            mode="contained"
            onPress={() => void submit()}
            loading={pending}
            disabled={pending}
            buttonColor={action === 'inactivate' ? colors.danger : undefined}
            textColor={action === 'inactivate' ? '#FFFFFF' : undefined}
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
  name: { color: colors.text, fontWeight: '700' },
  meta: { color: colors.textMuted, marginTop: 2 },
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
