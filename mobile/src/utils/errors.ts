import axios from 'axios';
import type { ApiErrorPayload } from '@/types/api';

export function loginErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    return 'E-mail ou senha incorretos.';
  }
  return 'Não foi possível entrar. Tente novamente.';
}

export function shortErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    if (!error.response) return 'Sem conexão com o servidor.';
    if (error.response.status === 403) return 'Você não pode realizar esta ação.';
    const fieldMessage = error.response.data?.campos
      ? Object.values(error.response.data.campos)[0]
      : null;
    return fieldMessage ?? error.response.data?.mensagem ?? 'Não foi possível concluir.';
  }
  return error instanceof Error ? error.message : 'Não foi possível concluir.';
}
