import { test, expect } from '@playwright/test'

const API = 'http://localhost:8000/api'

async function devLogin(): Promise<string> {
  const res = await fetch(`${API}/auth/dev-login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ discord_id: `e2e-${Date.now()}`, username: 'e2e' }),
  })
  if (!res.ok) throw new Error(`dev-login failed: ${res.status}`)
  const data = (await res.json()) as { access_token: string }
  return data.access_token
}

test('smoke: login -> grupo -> jogo -> votacao -> sessao', async ({ page }) => {
  const token = await devLogin()

  await page.addInitScript((t) => {
    window.localStorage.setItem('u2g-auth', JSON.stringify({ state: { token: t }, version: 0 }))
  }, token)

  await page.goto('/groups')
  await expect(page.getByRole('heading', { name: /GROUPS/ })).toBeVisible()

  // criar grupo
  const guildId = `e2e-guild-${Date.now()}`
  await page.getByRole('button', { name: /NEW GROUP/ }).click()
  await page.locator('input[name="discord_guild_id"]').fill(guildId)
  await page.locator('input[name="name"]').fill('Squad E2E')
  await page.getByRole('button', { name: /COMMIT/ }).click()
  await expect(page.getByText('Squad E2E')).toBeVisible()

  // entrar no grupo
  await page.getByText('Squad E2E').click()
  await expect(page.getByRole('heading', { name: 'Squad E2E' })).toBeVisible()

  // ir pra jogos
  await page.getByRole('link', { name: 'jogos' }).click()
  await page.getByRole('button', { name: '+ adicionar' }).click()
  await page.getByPlaceholder('nome').fill('CS2')
  await page.getByRole('button', { name: 'criar' }).click()
  await expect(page.getByText('CS2')).toBeVisible()

  // sessao
  const groupUrl = page.url().replace('/games', '')
  await page.goto(`${groupUrl}/sessions`)
  await page.getByRole('button', { name: '+ agendar' }).click()
  await page.getByPlaceholder('titulo').fill('sessao e2e')
  await page.locator('select').selectOption({ label: 'CS2' })
  const future = new Date(Date.now() + 86400000).toISOString().slice(0, 16)
  await page.locator('input[type="datetime-local"]').fill(future)
  await page.getByRole('button', { name: 'criar' }).click()
  await expect(page.getByText('sessao e2e')).toBeVisible()
})
