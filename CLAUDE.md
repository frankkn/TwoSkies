# TwoSkies 兩片天空 — 產品規格

## 這是什麼
一個畫面、兩片天空：**下半是你所在城市的此刻天氣，上半是那個人所在城市的此刻天氣**。
你在台北的晴天裡，看見倫敦在下雨。唯一的互動是一天一次的主動輕點——
「我今天來看過你的天空了」。

還沒配對時，它就是一個安靜的天氣 app（只有你自己的天空）；
配對成功，畫面才長出第二片天空。

核心哲學：不聊天，但知道彼此的天空。所有被知道的事，都是自願說的。

## 產品規則（不可妥協）
1. **一個配對只有兩個人**。A 建立配對取得一次性邀請碼，B 輸入即綁定；一人同時只能在一個配對裡
2. **每人設定一個稱呼**（暱稱，讓對方看到的名字，如「阿寶」）——首次設定城市時一起設定，隨時可改
3. **位置隨時可以修改**，修改後**對方的畫面即時更新**（訂閱對方 users 文件的
   onSnapshot）——出差、搬家、旅行，天空跟著人走。座標仍一律粗化到 0.1°（約 10 公里）才儲存
4. **看是安靜的**：打開 app 看對方天氣，不留任何痕跡、不產生任何通知——沒有已讀回條
5. **打卡是主動的**：每天可以輕點一次「我來看過你的天空了」，對方打開 app 時會看到一個
   溫柔的標記（「{對方的稱呼}今天來看過你」）。點了就點了，不可收回；沒點就是沒點，不補、不提醒
6. **「今天」以打卡者自己時區的日期為準**（dateKey 由打卡者本地時區計算），
   避免跨時區的日界線怪象
7. **不留歷史**：UI 永遠只顯示今天；checkins 用 Firestore TTL 48 小時自動刪除——
   「沒有歷史」是用基礎設施兌現的承諾，不是 UI 假裝
8. **可以解除配對，解除即立刻全刪**：任一方可解除，不需理由、不另行通知。
   解除的關鍵動作是**刪除 pair 文件**——單筆、原子、即刻生效。之後接著清理：
   逐筆刪孤兒 checkins（Firestore 刪父文件不會連帶刪子集合；孤兒的文件 ID 可由
   昨天/今天的 dateKey × 兩人 uid 確定性算出，不需 list）、刪未兌換的邀請碼、
   清自己 users 文件上的 pairId；對方的 pairId 由對方 client 偵測 pair 消失後自清
   （users 只有本人能寫，解除方清不了對方的）。對方下次打開會看到一次
   「配對已結束」，app 回到單人天氣模式——關係的誠實包含結束
9. 沒有聊天、沒有連續天數、沒有推播通知。知道對方來過的唯一方式，是你自己打開它

## UI
- **單一畫面，上下兩片天空**：上半是對方的（依天氣代碼與對方當地晝夜渲染：晴/雨/雪/雲、
  日/夜，標城市名與稱呼），下半是自己的。兩地晝夜不同時，一半白晝一半星空——
  這個畫面本身就是產品
- 每片天空顯示：城市名、目前溫度（大字，下方兩行小字：最高/最低溫、
  天況「晴天/多雲/有雨/降雪」）、天氣動畫；對方那片多顯示當地時間
- 預報常駐顯示在每片天空下方（不需點擊）：未來 24 小時逐時（時間/圖示/溫度/
  降雨%——0% 也顯示）＋未來 7 天；只有溫度和雨，時間用該地的時鐘。
  逐時格數依可用寬度動態分配（每格約 64px，視窗越寬一眼看到越多），
  其餘橫向捲動，右緣漸淡提示可捲
- 七天列吃滿該片天空的剩餘高度——放得下就全展開、放不下垂直捲動
  （底緣漸淡提示只在真的可捲時出現）；每行是 iPhone 天氣的配置
  「星期｜圖示｜雨%｜低溫｜溫度範圍條｜高溫」佔滿區塊寬度。
  首尾兩格採用逐時列的欄寬置中：「今天」對齊上方「現在」、
  最高溫對齊最右欄的溫度，左右邊緣也與逐時列切齊。範圍條以整週最低～最高溫為共同的尺，
  亮色片段（冷端偏青、熱端偏橘的漸層）標出該日低高溫的位置；
  「今天」那行有一顆小白點標記現在的即時溫度。
  點某一天就地展開（手風琴）該日完整 24 小時的逐時列（格式同上方），
  再點收回；資料點擊時現抓、當次快取
- 預報區塊緊貼左上資訊區下方，留白在區塊之下——天空在下半部呼吸
- 捲動的手感：手機用手指滑，桌機滑鼠按住拖曳（grab 游標），
  拖曳過程不誤觸點擊
- 整個預報區塊跟著視窗長大、上限 640px、靠左——超寬螢幕仍留天空。
  天氣圖示是彩色的（晴日太陽、晴夜月亮、雲、雨、雪），iPhone 天氣的視覺語彙
- 打卡是一行「我來看過你的天空了」（深色半透明膠囊底），
  當天點過即安靜地變為「今天看過{對方的稱呼}的天空了」（不彈窗、不慶祝）
- 對方今天打過卡：自己那片天空下方淺淺一行「{對方的稱呼}來看過你的天空了」；
  沒打卡就什麼都沒有——留白不是懲罰，是誠實
- 未配對：全螢幕自己的天空，主畫面就是一個乾淨的天氣 app；
  「邀請一個人」與「輸入邀請碼」收在設定裡（被邀請的人多半走邀請連結，
  會自動跳出「{稱呼} 邀請你共享天空」的確認）
- 等待配對中（邀請已建立、對方未兌換）：天空上低調顯示邀請碼，
  純文字動作「複製連結」「複製邀請碼」「取消邀請」並列——
  連結給一鍵接受的順路，碼給口頭轉述的自由
- 設定入口是右上角一個低調的「⋯」：稱呼/城市、配對功能（邀請/解除）、登出
  都在裡面；位置改動後兩邊天氣立即重抓
- 動畫要慢、要安靜（雨絲、雲移、星空都用 CSS/canvas 輕量實作），不用音效

## 架構
- Vite + React + TS + Tailwind
- Firebase：Google 登入（關係 app 身份不能丟，不用匿名）+ Firestore + Hosting。
  **web 登入一律用 signInWithPopup**——signInWithRedirect 在 Safari 與第三方儲存分區下
  會靜默失敗，而手機瀏覽器是這個 app 的主場景。
  **Android 原生殼是例外**：WebView 內 Google 直接封鎖 OAuth popup，
  FirebaseProvider.signIn() 依 Capacitor.isNativePlatform() 分流——原生走
  @capacitor-firebase/authentication（Credential Manager）拿 idToken 餵給
  JS SDK 的 signInWithCredential，之後整條資料層與 web 同路。
  **這個分流不可「簡化」回單一路徑**，砍掉任一邊就是砍掉一個平台的登入。
  另外 Google 同樣封鎖「app 內嵌瀏覽器」（LINE/FB/IG 等）的 OAuth
  （403 disallowed_useragent）：登入頁偵測到內嵌瀏覽器就把按鈕換成
  「複製網址，用瀏覽器開啟」的提示（src/lib/inAppBrowser.ts）；
  邀請連結帶 `?openExternalBrowser=1`——LINE 的官方參數，讓它自動改開
  外部瀏覽器，其他環境忽略。這個參數不是雜物，不要清掉
- 天氣：**Open-Meteo**（免費、無 API key、無註冊），客戶端以雙方的粗化座標各查一份
  即時天氣，開啟時抓取＋每 15 分鐘更新＋位置變更時立即重抓；無需任何後端轉發。
  晝夜用回應裡的 is_day 欄位，不自己算日出日落；背景分頁的 setInterval 會被
  瀏覽器節流，用 visibilitychange 觸發重新驗證才可靠
- 城市選擇用 Open-Meteo Geocoding API（同樣免費無 key）：搜尋城市一次取得一致的
  name/lat/lng/timezone，client 粗化座標後寫入；不用 navigator.geolocation
  （精度本來就要丟掉，還省掉權限 UX 與被拒後的 fallback）
- 即時性：訂閱對方 users 文件（onSnapshot）——對方改位置/稱呼，畫面即時更新；
  訂閱 pair 與今日 checkins——打卡即時亮起。
  「對方今天打過卡」的查法：用**對方的 tz** 算出對方的當前本地日期，訂閱那一個
  checkin 文件（{對方dateKey}_{對方uid}），並在對方跨日的瞬間切換訂閱——
  用自己的日曆去查，時差大時會出現「明明剛來過卻一片空白」
- pair 文件的 onSnapshot 是解除配對的唯一訊號源：收到 pair 不存在，client 立即
  主動 unsubscribe 對方的所有 listeners（rules 撤權對既有 listener 不即時，
  不主動退訂會殘留數分鐘的對方位置更新）、自清自己的 users.pairId。
  localStorage 存 lastKnownPairId，啟動時「本地有、雲端無」→ 顯示一次
  「配對已結束」再清除（沒有這個本地記號，此畫面做不出來）
- 打卡寫入是悲觀更新：等 server ack 才翻轉 UI，不走離線佇列——離線佇列的
  樂觀寫入本質上是「補打卡」，違反規則 5；離線時按鈕顯示安靜的不可用態。
  多分頁用 persistentMultipleTabManager()；checkin create 的 already-exists /
  permission-denied 一律視為冪等成功（文件 ID 唯一性本來就是設計的一部分）；
  打卡狀態以 onSnapshot 為準，不以本地旗標為準
- 邀請碼兌換用 runTransaction（讀 invite → 條件更新 pair members + 刪 invite +
  寫自己的 users.pairId），rules 拒絕時映射為「這個邀請碼已被使用或已過期」
- client 架構：根狀態機五態 unauthenticated → onboarding（無 users 文件）→
  solo（pairId null）→ pending（members 長度 1）→ paired，外加 pair-ended
  一次性過場；所有畫面由此態導出，禁止元件自行判斷。訂閱鏈收在 Provider 層
  由上而下建立與 teardown（auth → 自己 users → pair → 對方 users + checkins）。
  Phase 1 先定義 data provider interface，mock 實作 → Phase 2 換 Firebase，UI 不動
- 資料模型：
  users/{uid}                { pairId?, nickname, city, lat, lng, tz }  ← 座標已粗化到 0.1°
  pairs/{pairId}             { members: [uidA, uidB], inviteCode?, createdAt }
  invites/{code}             { pairId, createdBy, inviterNickname, expiresAt }  ← 一次性，兌換即刪
  （inviteCode 冗餘存在 pair 上：rules 的兌換驗證從 pair update 的路徑拿不到 code，
    且建立者 reload 後要能從自己的 pair 文件找回 code；inviterNickname 是建立時的
    快照，讓 B 兌換前看到「阿寶邀請你」而不是盲配一串 uid）
  pairs/{pairId}/checkins/{dateKey_uid}  { at: Timestamp, expireAt: Timestamp(+48h) }
- Security Rules 強制（client-only 架構下 rules 是唯一防線，每一條都是產品哲學的兌現）：
  - 成員判定一律以 pair.members 為 source of truth（users.pairId 只是指標，本人可寫）。
    只有配對成員能讀自己的 pair 與 checkins；配對成員可讀對方的 users 文件
    （拿稱呼、座標、時區）；users 文件只有本人能寫、禁止 delete
  - 所有寫入都加欄位白名單（keys().hasOnly）：users 只允許
    [pairId, nickname, city, lat, lng, tz]、checkin 只允許 [at, expireAt]、
    pair 只允許 [members, inviteCode, createdAt]——否則任何文件都能塞自訂欄位
    變成暗通道聊天室，「不聊天」就從哲學降級成 UI 假裝
  - 欄位值驗證：nickname ≤ 20 字、city ≤ 50、tz ≤ 50（tz 的 IANA 合法性 rules
    驗不了，client 渲染對方時間必須 try/catch fallback UTC）；lat/lng 必須是
    0.1 的倍數（數學驗證）——「粗化」也是基礎設施承諾，不靠 client 自律
  - 建立 pair：members == [自己]，且用 getAfter 驗證同一 batch 把自己的
    users.pairId 從 null 寫成此 pair——「一人同時只能在一個配對裡」由 rules 強制
  - 邀請碼建立：createdBy == auth.uid、自己是該 pair 的唯一成員、
    expiresAt 介於 request.time 與 request.time + 24h 之間
    （上限必須由 rules 封頂，否則 client 可設 100 年後，TTL 形同虛設）
  - 邀請碼兌換（pair 的 update）：只允許唯一一種轉移——members 從 1 變 2、
    原成員不變、新成員 == request.auth.uid 且不在原 members 裡（自兌換 [A,A]
    拒絕）、其他欄位不可變；以 get(invites/{pair.inviteCode}) 驗
    request.time < expiresAt，以 !existsAfter 強制同一 transaction 刪掉 invite。
    members 滿 2 後 pair 永久唯讀（只可 delete）——防止配對後把對方換成第三人
  - checkin：只能 create（不可 update；delete 僅在 pair 文件已不存在時放行——
    配對存續期間「點了收不回」是 rules 保證，不是 UI 假裝）、
    文件 ID 必須是「dateKey + '_' + 自己的 uid」、at == request.time、expireAt == at + 48h。
    注意：rules 無法計算時區本地日期，只能驗證 dateKey 格式正確且與 request.time 的
    UTC 日期相差 ≤ 1 天（涵蓋 UTC±14）；「一天一次」實際由文件 ID 唯一性 + create-only 保證
  - 解除配對：成員可刪 pair 文件（關鍵動作，單筆原子）；邀請碼建立者與兌換者可刪 invite
- Firestore TTL policy 對 checkins.expireAt 與 invites.expiresAt 啟用。
  誠實提醒：TTL 清理有最多約 24h 的延遲，「48 小時」實際可能到三天——
  所以顯示層一律以 dateKey 過濾（過期文件即使殘留也永不渲染），
  儲存層最終刪除：雙層兌現「不留歷史」
- 邀請碼用分享連結傳遞（code 放 URL fragment），熵和 UX 兼得
- **App Check：刻意永久停在監控模式（UNENFORCED），這是決定，不是未完成**（2026-07 拍板）。
  原因：Android 側 Play Integrity 必須有 Play Console 開發者帳號（US$25）＋整套登記流程，
  對兩人 app 邊際收益趨近零——rules 已擋掉所有越權讀寫，被 rules 拒絕的請求也幾乎不耗配額。
  web 的 reCAPTCHA 已在 console 註冊但 client 從未帶 site key（送不出 token），維持現狀即可。
  **紅線：console「APIs」分頁的兩個 enforce 開關（firestore、identitytoolkit）都不可按**——
  按下即 web 與 APK 同時全斷（enforce 以服務為單位，沒有只管單一平台的選項）。
  若未來翻案要 enforce，前置條件缺一不可：Play Console 帳號＋Android 註冊 Play Integrity
  （側載 app 必須在進階設定放寬 PLAY_RECOGNIZED／LICENSED）＋web site key 佈進
  .env.local 與兩條 workflow＋原生殼接 @capacitor-firebase/app-check＋
  先在監控模式看到兩平台 verified 都接近 100%
- Rules 要有 emulator 測試（@firebase/rules-unit-testing），至少涵蓋：
  非成員讀取拒絕、checkin 一天一次（ID 重複拒絕）、不可 update checkin、
  pair 存續期間刪 checkin 拒絕／pair 不存在後放行、外人不能兌換已用邀請碼、
  過期邀請碼拒絕兌換、非交易性兌換（未同時刪 invite）拒絕、自兌換 [A,A] 拒絕、
  配對後換掉成員拒絕、夾帶白名單外欄位拒絕、expiresAt 超過 24h 上限拒絕、
  未粗化座標（非 0.1 倍數）拒絕、非成員不能刪 pair、成員解除配對放行、
  非本人不可改 users 文件（位置/稱呼只有本人能改）

## Android 版與發版（Capacitor）
- 同一份 React codebase 由 Capacitor 包成 Android 殼（appId `com.twoskies.app`）；
  流程：`npm run build` → `npx cap sync android` → gradle。**沒有 iOS 原生版**，
  iOS 走 PWA 加入主畫面（README 有使用者步驟）
- **刻意沒有 service worker**：web 每次載入即最新版，「可安裝」由 APK 承擔——
  不要好心補 SW，那會帶進快取失效與更新提示的整套麻煩
- 簽章：固定 release keystore **不進 repo**，本地與 CI 都由 `TWOSKIES_KEYSTORE_FILE` /
  `TWOSKIES_KEYSTORE_PASSWORD` 環境變數餵入（CI 走 repo secrets）。keystore 遺失 =
  既有安裝無法覆蓋升級，位置與備份提醒記在 session memory，不寫在公開 repo 裡。
  debug 與 release 兩把 SHA-1 都已註冊在 Firebase 的 Android app 上
- `google-services.json` **有意進 repo**——與 web config 同理，都是公開值，防線在 rules
- 發版儀式：`npm version X.Y.Z` + `git push --follow-tags`。同一個 v* tag 觸發兩條
  workflow：release.yml（簽章 APK → GitHub Releases，README 的 latest 連結自動跟上）、
  deploy-web.yml（部署 Hosting，也可 workflow_dispatch 單獨手動觸發）。
  版本號單一來源是 package.json（`__APP_VERSION__` 注入、設定面板顯示）；
  APK 的 versionName 取自 tag、versionCode 取自 run number
- **rules 部署刻意不自動化**：`npm run test:rules` 全綠 → 人手
  `firebase deploy --only firestore:rules`。測試通過 ≠ rules 正確（新攻擊面要配新測試），
  這道判斷留在人手上
- app 圖示的源頭是 `scripts/icon.html`：`node scripts/make-icons.mjs` 產 PWA 圖示、
  `npx @capacitor/assets generate --android` 產 launcher/splash（logo 用同一份 HTML 渲染）
- **edge-to-edge 與 safe-area**：天空全幅延伸到系統列後面（MainActivity 的
  `EdgeToEdge.enable` + `SystemBarStyle.dark(TRANSPARENT)`——亮色系統圖示，這個 app
  白晝天空也配白字）；內容避讓靠 `@capacitor-community/safe-area` 讓標準
  `env(safe-area-inset-*)` 在 Android WebView 生效（Chromium <140 由外掛原生內縮兜底，
  此時系統列露出 windowBackground 的夜空色 `@color/twoskiesNight`，看起來像設計）。
  SkyPane 依 `safeArea` prop（top/bottom/both）把貼螢幕邊的留白加上 inset——
  配對畫面上片 top、下片 bottom；SettingsSheet 底部同樣墊了 inset。
  **不要**另裝 @capacitor/status-bar（與 safe-area 外掛衝突）；capacitor.config 的
  `SystemBars.insetsHandling: "disable"` 是 Capacitor 8 的必要設定，不要移除

## 已知風險（誠實記錄）
- 兩人 app 的死穴是「一個人先失去興趣」：沒有連續紀錄與提醒是刻意的——
  這個 app 不挽留任何人，天氣一直都在，想看的人自然會來
- Open-Meteo 是免費服務無 SLA；天氣抓不到時顯示「雲層後面的天空」占位狀態，不報錯嚇人
- 解除配對的關鍵動作（刪 pair）是單筆原子寫入，但後續清理（孤兒 checkins、
  邀請碼）中途斷線可能殘留——以 TTL 為最終兜底，加上顯示層 dateKey 過濾，
  殘留即使還在也永遠不會被看見
- 位置即時同步意味著對方能看到你的移動（城市級）——這是產品的本意（天空跟著人走），
  但 onboarding 要講清楚：「對方會知道你在哪個城市」

## 刻意不做的事
聊天、訊息、照片、已讀回條、連續天數、歷史紀錄、推播通知、精確定位、
移動軌跡（只有「現在在哪」，沒有「去過哪」）、第三人、群組、任何 engagement 優化。

## Phases（1–4 已完成，現為維護狀態）
1. ✅ 純本地原型：兩片天空渲染（晴雨雪雲 × 晝夜 × 兩地時差）+ 打卡互動（假配對、假資料）
2. ✅ Firebase：Google 登入、配對與邀請碼流程（含解除全刪）、位置/稱呼即時同步、
   checkins 讀寫、rules + emulator 測試
3. ✅ 部署 Firebase Hosting（https://twoskies.web.app）
4. ✅ Android APK（Capacitor + 原生 Google 登入 + tag 自動發佈，v1.0.0 起）

App Check 已拍板停在監控模式、不 enforce（見架構節，含翻案的前置條件）——沒有未完成的規格債

## 給 Claude 的開發準則
- 任何功能實作前先問：這會不會製造義務感或焦慮？會就不做
- commit 一律用 local git 身份 Frank Yang <frank840629@gmail.com>，不可用 global
- 這台機器可能有多個 agent 同時操作：commit 前先 git fetch 確認遠端狀態
- Security Rules 改動必須先過 emulator 測試才能部署
