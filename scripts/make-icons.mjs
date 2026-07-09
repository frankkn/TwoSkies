// app 圖示產生器:node scripts/make-icons.mjs(需 npm i -D --no-save playwright)
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const SRC = fileURLToPath(new URL('./icon.html', import.meta.url))
mkdirSync('public/icons', { recursive: true })

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 600, height: 600 }, deviceScaleFactor: 1 })
await page.goto('file:///' + SRC)
const icon = page.locator('#icon')

// 一般圖示:512 / 192 / 180(apple-touch)
for (const size of [512, 192, 180]) {
  await icon.evaluate((el, s) => {
    el.style.transformOrigin = 'top left'
    el.style.transform = `scale(${s / 512})`
  }, size)
  await page.screenshot({ path: `public/icons/icon-${size}.png`, clip: { x: 0, y: 0, width: size, height: size } })
}

// maskable:內容縮進 80% 安全區,底色鋪滿(Android 各種形狀裁切都不會切到日月)
await icon.evaluate(el => {
  el.style.transform = 'scale(0.8)'
  el.style.transformOrigin = 'center'
  document.body.style.background = '#0b1026'
  document.body.style.width = '512px'
  document.body.style.height = '512px'
  document.body.style.display = 'grid'
  document.body.style.placeItems = 'center'
})
await page.screenshot({ path: 'public/icons/icon-maskable-512.png', clip: { x: 0, y: 0, width: 512, height: 512 } })

await browser.close()
console.log('icons written')
