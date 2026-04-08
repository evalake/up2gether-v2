import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LoginPage } from './LoginPage'

describe('LoginPage', () => {
  it('renders Discord login link', () => {
    render(<LoginPage />)
    const link = screen.getByRole('link', { name: /authenticate/i })
    expect(link).toBeInTheDocument()
    expect(link.getAttribute('href')).toContain('discord.com/api/oauth2/authorize')
  })
})
