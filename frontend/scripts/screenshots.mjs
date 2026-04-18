// screenshot automatico de todas as paginas do up2gether
// uso: node scripts/screenshots.mjs <token>
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const TOKEN = process.argv[2]
if (!TOKEN) { console.error('uso: node scripts/screenshots.mjs <jwt_token>'); process.exit(1) }

const BASE = 'https://up2gether.com.br'
const OUT = 'screenshots'
mkdirSync(OUT, { recursive: true })

async function go(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.waitForTimeout(3000)
}

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
  console.log(`  ok: ${name}`)
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  })
  const page = await ctx.newPage()

  // set auth token antes de navegar
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.evaluate((t) => {
    localStorage.setItem('u2g-auth', JSON.stringify({ state: { token: t }, version: 0 }))
  }, TOKEN)

  // navegar pra groups
  await go(page, '/groups')
  await shot(page, '01_groups')

  // pegar primeiro grupo
  const groupLink = await page.$('a[href*="/groups/"]')
  let groupId = null
  if (groupLink) {
    const href = await groupLink.getAttribute('href')
    const m = href.match(/\/groups\/([^/]+)/)
    if (m) groupId = m[1]
  }

  if (!groupId) {
    console.log('nenhum grupo encontrado. pagina pode estar bloqueada pelo cloudflare.')
    await page.screenshot({ path: `${OUT}/debug_page.png`, fullPage: true })
    await browser.close()
    return
  }
  console.log(`grupo: ${groupId}`)

  const routes = [
    ['02_overview', `/groups/${groupId}`],
    ['03_games', `/groups/${groupId}/games`],
    ['04_votes', `/groups/${groupId}/votes`],
    ['05_sessions', `/groups/${groupId}/sessions`],
    ['06_admin', `/groups/${groupId}/admin`],
    ['07_history', `/groups/${groupId}/history`],
    ['08_settings', `/settings`],
  ]

  for (const [name, path] of routes) {
    try {
      await go(page, path)
      await shot(page, name)
    } catch (e) {
      console.log(`  falhou: ${name} - ${e.message}`)
    }
  }

  // detalhe do primeiro jogo
  try {
    await go(page, `/groups/${groupId}/games`)
    const gameCard = await page.$('[class*="cursor-pointer"]')
    if (gameCard) {
      await gameCard.click()
      await page.waitForTimeout(2500)
      await shot(page, '10_game_detail')
    }
  } catch (e) { console.log(`  game detail falhou: ${e.message}`) }

  // overview scrolled
  try {
    await go(page, `/groups/${groupId}`)
    await page.evaluate(() => window.scrollTo(0, 9999))
    await page.waitForTimeout(1500)
    await shot(page, '11_overview_bottom')
  } catch (e) { console.log(`  overview bottom falhou: ${e.message}`) }

  // perfil de membro
  try {
    const memberBtn = await page.$('button[class*="hover:bg-nerv-panel"]')
    if (memberBtn) {
      await memberBtn.click()
      await page.waitForTimeout(2000)
      await shot(page, '12_member_modal')
      await page.keyboard.press('Escape')
    }
  } catch (e) { console.log(`  member modal falhou: ${e.message}`) }

  // sessao slot hover
  try {
    await go(page, `/groups/${groupId}/sessions`)
    const slot = await page.$('button[aria-label="novo horario"]:not([disabled])')
    if (slot) {
      await slot.hover()
      await page.waitForTimeout(800)
      await shot(page, '13_session_hover')
    }
  } catch (e) { console.log(`  session hover falhou: ${e.message}`) }

  // votacoes historico toggle
  try {
    await go(page, `/groups/${groupId}/votes`)
    const hBtn = await page.getByText('histórico', { exact: false }).first()
    if (hBtn) {
      await hBtn.click()
      await page.waitForTimeout(1500)
      await shot(page, '14_votes_history')
    }
  } catch (e) { console.log(`  votes history falhou: ${e.message}`) }

  await browser.close()
  console.log('done!')
}

run().catch(console.error)
