---
name: verify
description: 驗證 TwoSkies 的改動——啟動 dev server，用 Playwright 驅動真實畫面觀察行為
---

# TwoSkies 驗證流程

## 啟動
```
npm run dev          # 背景執行；注意輸出的實際 port！
```
**這台機器有多個 agent，5173 常被別的專案佔走**（曾看到一個叫 ETCH 的 app 在上面），
Vite 會自動改用 5174+。一定要從 dev server 輸出讀實際 port，不要假設。

## 驅動畫面
Playwright 用 `npm i -D --no-save playwright`（不進 package.json），
瀏覽器用系統 Edge，不用下載：
```js
const browser = await chromium.launch({ channel: 'msedge', headless: true })
```
寫一次性 `*.e2e.mjs` 在專案根目錄（node 才解析得到 node_modules），跑完刪掉。
注意：頂層別宣告 `const URL = ...`——會遮蔽全域 URL 類別，route handler 內爆炸。

## 值得驅動的流程
- 兩片天空渲染：城市名、暱稱、溫度、對方當地時間（30 秒跳動）
- 打卡：點「我來看過你的天空了」→ 安靜變為「今天來看過了」；reload 仍在；
  第二個分頁同步（mock 靠 storage 事件）
- 來訪標記：「阿寶今天來看過你」＋依對方晝夜顯示 ☀️/🌙
- 天氣抓不到：`page.route('**api.open-meteo.com**', r => r.abort())` →
  兩片「雲層後面的天空」占位，按鈕仍可用、不報錯
- 強制渲染特定天空（晴雨雪雲 × 晝夜）：route fulfill 假資料，
  依 URL 的 latitude 參數區分兩地：
  `route.fulfill({ json: { current: { temperature_2m: 3, weather_code: 63, is_day: 0 } } })`
  WMO 對映見 src/weather/openMeteo.ts（0-1 晴、2-3/45/48 雲、71-77/85-86 雪、其餘雨）

## 截圖
viewport 480×860（手機直向是主場景）。截到亮色天空（雪日）時留意白字對比。
