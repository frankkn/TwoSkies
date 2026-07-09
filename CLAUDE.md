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
- 每片天空顯示：城市名、目前溫度、今日高低溫與降雨機率（一行小字）、天氣動畫；
  對方那片多顯示當地時間。輕點天空展開安靜的預報面板（未來 12 小時逐時＋
  未來 7 天，只有溫度和雨，時間用該地的時鐘），再點收回——預設畫面永遠只有天空
- 一個按鈕「我來看過你的天空了」，當天點過即安靜地變為已點狀態（不彈窗、不慶祝）
- 對方今天打過卡：自己那片天空上有個小標記（一顆小太陽或小月亮）＋
  「{對方的稱呼}今天來看過你」；沒打卡就什麼都沒有——留白不是懲罰，是誠實
- 未配對：全螢幕自己的天空 + 一個低調的「邀請一個人」入口
- 等待配對中（邀請已建立、對方未兌換）：全螢幕自己的天空 + 低調顯示邀請碼
  （可複製、可分享連結）+「取消邀請」（單一 batch 刪邀請碼與半開 pair、清 pairId）
- 修改位置/稱呼：一個極簡設定面板；位置改動後兩邊天氣立即重抓
- 動畫要慢、要安靜（雨絲、雲移、星空都用 CSS/canvas 輕量實作），不用音效

## 架構
- Vite + React + TS + Tailwind
- Firebase：Google 登入（關係 app 身份不能丟，不用匿名）+ Firestore + Hosting。
  登入一律用 signInWithPopup——signInWithRedirect 在 Safari 與第三方儲存分區下
  會靜默失敗，而手機瀏覽器是這個 app 的主場景
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
- 啟用 Firebase App Check（reCAPTCHA v3）並對 Firestore enforce——config 是公開的、
  rules 只管「能不能」管不了「多頻繁」，App Check 是無後端架構的標準補償控制。
  邀請碼用分享連結傳遞（code 放 URL fragment），熵和 UX 兼得
- Rules 要有 emulator 測試（@firebase/rules-unit-testing），至少涵蓋：
  非成員讀取拒絕、checkin 一天一次（ID 重複拒絕）、不可 update checkin、
  pair 存續期間刪 checkin 拒絕／pair 不存在後放行、外人不能兌換已用邀請碼、
  過期邀請碼拒絕兌換、非交易性兌換（未同時刪 invite）拒絕、自兌換 [A,A] 拒絕、
  配對後換掉成員拒絕、夾帶白名單外欄位拒絕、expiresAt 超過 24h 上限拒絕、
  未粗化座標（非 0.1 倍數）拒絕、非成員不能刪 pair、成員解除配對放行、
  非本人不可改 users 文件（位置/稱呼只有本人能改）

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

## Phases
1. 純本地原型：兩片天空渲染（晴雨雪雲 × 晝夜 × 兩地時差）+ 打卡互動（假配對、假資料）
2. Firebase：Google 登入、配對與邀請碼流程（含解除全刪）、位置/稱呼即時同步、
   checkins 讀寫、rules + emulator 測試
3. 部署 Firebase Hosting

## 給 Claude 的開發準則
- 任何功能實作前先問：這會不會製造義務感或焦慮？會就不做
- commit 一律用 local git 身份 Frank Yang <frank840629@gmail.com>，不可用 global
- 這台機器可能有多個 agent 同時操作：commit 前先 git fetch 確認遠端狀態
- Security Rules 改動必須先過 emulator 測試才能部署
