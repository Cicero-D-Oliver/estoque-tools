const labelByStatus: Record<string, string> = {
  ADMIN: 'Administrador',
  OPERADOR: 'Operador',
  CONSULTA: 'Consulta',
  ATIVO: 'Ativo',
  PENDENTE: 'Pendente',
  DISPONIVEL: 'Disponível',
  EMPRESTADA: 'Em uso',
  MANUTENCAO: 'Manutenção',
  PERDIDA: 'Perdida',
  CONFIRMADA: 'Confirmada',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge badge--${status.toLowerCase()}`}>
      <span aria-hidden="true" />
      {labelByStatus[status] ?? status}
    </span>
  )
}
