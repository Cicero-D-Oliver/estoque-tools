import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="standalone-state">
      <span className="eyebrow">Erro 404</span>
      <h1>Página não encontrada</h1>
      <p>O endereço acessado não existe ou não está mais disponível.</p>
      <Link className="button button--primary" to="/">Voltar ao início</Link>
    </main>
  )
}
