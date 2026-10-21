// 팔도곳간 운영 시연 실행기
//   node run.mjs              새 시연 계정으로 처음부터
//   node run.mjs --from 6     state.json의 계정으로 6번 장면부터 (충전 이후 장면만 다시 할 때)
//   node run.mjs --record     장면을 역할별 영상으로도 남긴다 (videos/)
//   node run.mjs --auto       Enter를 기다리지 않고 이어서 실행한다. 실패하거나 확인이 필요하면 멈춘다
import {
  ask,
  closePrompt,
  closeWindows,
  go,
  loadState,
  openWindows,
  saveState,
  showRole,
  sleep,
} from './lib.mjs'
import * as main from './scenes.mjs'

const args = process.argv.slice(2)
const fromIndex = args.indexOf('--from')
const from = fromIndex === -1 ? 1 : Number(args[fromIndex + 1])
const record = args.includes('--record')
const auto = args.includes('--auto')
// --set additional: 본 시연이 남긴 state.json의 계정·상품·주문으로 추가 장면을 실행한다
const setIndex = args.indexOf('--set')
const set = setIndex === -1 ? 'main' : args[setIndex + 1]
const { scenes } = set === 'additional' ? await import('./scenes-additional.mjs') : main

let state
if (set === 'main' && from === 1) {
  state = main.createState()
  await main.prepare(state)
  await saveState(state)
} else {
  state = await loadState()
  if (!state) throw new Error('state.json이 없어요. 본 시연(demo.sh)을 먼저 실행해 주세요')
}

console.log(
  `\n시연 계정  구매자 ${state.buyer.loginId} · 판매자 ${state.seller.loginId} · 비밀번호 ${state.password}`,
)
console.log(`상점 ${state.storeName} · 상품 ${state.productName}`)

const win = await openWindows({ record })

await go(win.admin.page, '/login')
console.log('\n🔑 관리자 창에서 관리자 계정으로 로그인해 주세요. 로그인하면 자동으로 넘어가요.')
await win.admin.page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 0 })
// 추가 장면은 본 시연이 끝난 뒤라 구매자·판매자 모두 다시 로그인한다
await main.restoreSessions({ win, state, from: set === 'main' ? from : Number.POSITIVE_INFINITY })

for (let index = from; index <= scenes.length; index += 1) {
  const scene = scenes[index - 1]
  if (auto) {
    console.log(`\n▶ ${index}. ${scene.title}`)
    await sleep(2000)
  } else {
    const key = await ask(`\n▶ ${index}. ${scene.title}  [Enter 시작 · s 건너뛰기 · q 끝내기] `)
    if (key.trim() === 'q') break
    if (key.trim() === 's') continue
  }

  for (;;) {
    try {
      await showRole(win, scene.role)
      await scene.run({ win, state, auto })
      await saveState(state)
      console.log(`✅ ${index}. ${scene.title}`)
      break
    } catch (error) {
      console.error(`❌ ${index}. ${scene.title}: ${error.message}`)
      if (auto) {
        index = scenes.length + 1
        break
      }
      const next = await ask('  r 다시 · s 다음 장면으로 · q 끝내기 ')
      if (next.trim() === 'r') continue
      if (next.trim() === 'q') index = scenes.length + 1
      break
    }
  }
}

if (auto) {
  // 화면을 둘러볼 수 있게 창은 열어 둔다. 창을 모두 닫으면 끝난다
  console.log('\n시연이 끝났어요. 창을 모두 닫으면 종료돼요.')
  await Promise.all(
    Object.values(win).map(
      ({ browser }) => new Promise((resolve) => browser.on('disconnected', resolve)),
    ),
  )
} else {
  await ask('\n시연이 끝났어요. Enter를 누르면 창을 닫아요 ')
  await closeWindows(win)
}
closePrompt()
