import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PasswordInput } from './PasswordInput'

describe('PasswordInput', () => {
  it('mantém a senha escondida por padrão e alterna sem perder valor ou foco', async () => {
    render(<PasswordInput label="Senha" name="senha" defaultValue="Senha segura 2026" />)
    const input = screen.getByLabelText('Senha')
    const toggle = screen.getByRole('button', { name: 'Mostrar senha' })

    expect(input).toHaveAttribute('type', 'password')
    await userEvent.click(toggle)

    expect(input).toHaveAttribute('type', 'text')
    expect(input).toHaveValue('Senha segura 2026')
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(input).toHaveFocus())
  })

  it('pode ser acionado pelo teclado e volta a ocultar a senha', async () => {
    render(<PasswordInput label="Senha" name="senha" defaultValue="Senha segura 2026" />)
    const input = screen.getByLabelText('Senha')
    input.focus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Mostrar senha' })).toHaveFocus()

    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(input).toHaveAttribute('type', 'text'))
    await userEvent.tab()
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(input).toHaveAttribute('type', 'password'))
  })

  it('não submete o formulário ao alternar visibilidade', async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <PasswordInput label="Senha" name="senha" />
        <button type="submit">Enviar</button>
      </form>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
