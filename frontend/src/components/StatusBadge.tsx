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

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span className={`badge badge--${status.toLowerCase()}`}>
      <span aria-hidden="true" />
      {label ?? labelByStatus[status] ?? status}
    </span>
  )
}
