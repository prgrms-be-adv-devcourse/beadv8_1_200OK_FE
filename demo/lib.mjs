// 시연 공통: 운영 API 호출, 역할별 창 띄우기, 천천히 입력하기, 터미널 입력
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { createInterface } from 'node:readline/promises'
import { chromium } from 'playwright'

export const BASE = process.env.DEMO_BASE_URL ?? 'https://paldo-gotgan-fe.vercel.app'
const API = `${BASE}/api/v1`
const STATE_FILE = new URL('./state.json', import.meta.url)

// ---- API (화면 밖에서 처리하는 준비 작업용) ----

export async function api(path, { token, method = 'GET', body } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!res.ok) {
    const error = new Error(`${method} ${path} → ${res.status} ${data?.detail ?? text}`)
    error.status = res.status
    throw error
  }
  return data
}

export async function apiToken(loginId, password) {
  const data = await api('/auth/login', { method: 'POST', body: { loginId, password } })
  return data.accessToken
}

// ---- 상태 저장 (중간부터 다시 시작할 때 씀) ----

export async function loadState() {
  if (!existsSync(STATE_FILE)) return null
  return JSON.parse(await readFile(STATE_FILE, 'utf8'))
}

export async function saveState(state) {
  await writeFile(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`)
}

// ---- 창 ----

const ROLE_LABELS = { buyer: '구매자', seller: '판매자', admin: '관리자' }

/**
 * 역할마다 브라우저를 따로 띄운다. 세션(sessionStorage)이 창마다 분리된다.
 * 세 창은 모두 화면 왼쪽 같은 자리(폭 80%)에 두고, 장면에 맞는 창 하나만 펼친다(showRole).
 * 오른쪽 20%는 터미널 자리다.
 */
const screenW = Number(process.env.DEMO_SCREEN_W ?? 1920)
const screenH = Number(process.env.DEMO_SCREEN_H ?? 1080)
const windowW = Math.floor(screenW * Number(process.env.DEMO_WIDTH_RATIO ?? 0.8))

export async function openWindows({ record }) {
  const scale = Number(process.env.DEMO_SCALE ?? 1)
  const slowMo = Number(process.env.DEMO_SLOWMO ?? 120)
  const windows = {}

  for (const role of ['buyer', 'seller', 'admin']) {
    const browser = await chromium.launch({
      headless: false,
      slowMo,
      args: [
        '--window-position=0,0',
        `--window-size=${windowW},${screenH}`,
        `--force-device-scale-factor=${scale}`,
      ],
    })
    const context = await browser.newContext({
      viewport: null,
      locale: 'ko-KR',
      recordVideo: record
        ? {
            dir: new URL(`./videos/${role}/`, import.meta.url).pathname,
            size: { width: Math.round(windowW / scale), height: Math.round(screenH / scale) },
          }
        : undefined,
    })
    await context.addInitScript(showRoleBadge, ROLE_LABELS[role])
    const page = await context.newPage()
    page.setDefaultTimeout(20_000)
    windows[role] = { browser, context, page, cdp: await context.newCDPSession(page) }
  }
  await showRole(windows, 'admin')
  return windows
}

async function setWindowState({ cdp }, state, bounds) {
  const { windowId } = await cdp.send('Browser.getWindowForTarget')
  await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: state } })
  if (bounds) await cdp.send('Browser.setWindowBounds', { windowId, bounds })
}

/** 이 역할의 창만 왼쪽에 펼치고 나머지는 최소화한다 */
export async function showRole(windows, role) {
  for (const [name, window] of Object.entries(windows)) {
    if (name !== role) await setWindowState(window, 'minimized')
  }
  await setWindowState(windows[role], 'normal', {
    left: 0,
    top: 0,
    width: windowW,
    height: screenH,
  })
  await windows[role].page.bringToFront()
}

/** 창 왼쪽 아래에 역할 이름을 띄운다. 클릭은 통과시킨다 */
function showRoleBadge(label) {
  const add = () => {
    if (document.getElementById('demo-role-badge')) return
    const badge = document.createElement('div')
    badge.id = 'demo-role-badge'
    badge.textContent = label
    badge.style.cssText =
      'position:fixed;left:12px;bottom:12px;z-index:2147483647;padding:8px 16px;border-radius:999px;' +
      'background:rgba(20,20,20,.78);color:#fff;font:700 18px/1.2 system-ui;pointer-events:none'
    document.body.appendChild(badge)
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', add)
  else add()
}

export async function closeWindows(windows) {
  for (const { context, browser } of Object.values(windows)) {
    await context.close()
    await browser.close()
  }
}

// ---- 화면 조작 ----

export const go = (page, path) => page.goto(`${BASE}${path}`)

/** 관객이 보이도록 한 글자씩 입력한다 */
export async function typeIn(locator, text) {
  await locator.click()
  await locator.fill('')
  await locator.pressSequentially(String(text), { delay: 40 })
}

export async function uiLogin(page, loginId, password) {
  await go(page, '/login')
  await typeIn(page.getByLabel('아이디', { exact: true }), loginId)
  await typeIn(page.getByLabel('비밀번호', { exact: true }), password)
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'))
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** 새 화면에 들어선 뒤 관객이 화면을 알아볼 시간 */
export const beat = () => sleep(Number(process.env.DEMO_BEAT ?? 1500))

/** 결과 화면(충전·주문 완료 등)을 보여 주는 시간 */
export const hold = () => sleep(Number(process.env.DEMO_HOLD ?? 3000))

// ---- 터미널 ----

let rl = null

export function ask(question) {
  rl ??= createInterface({ input: process.stdin, output: process.stdout })
  return rl.question(question)
}

export function closePrompt() {
  rl?.close()
}
