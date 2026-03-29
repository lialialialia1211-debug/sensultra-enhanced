# 超感穿梭 Enhanced — 全面審計報告

審計日期：2026-03-29
審計範圍：所有 JS 模組 + CSS + HTML

---

## 一、致命 Bug（CRITICAL — 會 crash 或完全無法操作）

### BUG-C01 `ui.openIntimacyScene` 呼叫不存在的方法
- **嚴重程度**：CRITICAL
- **檔案**：`js/main.js` 第 797 行
- **問題**：`this.ui.openIntimacyScene(...)` 這個方法確實存在於 `ui.js` 末尾（第 1012 行），但 `doIntimacy()` 在 `intimacy:choice` 事件被觸發時呼叫，而 `intimacy:choice` 事件的 `char` 參數是從 UI 的預設 choices 傳來的，只有 `char.id` 是真實的，其他欄位可能不完整。
- **建議修復**：確認 `doIntimacy` 能正確從 `ownedCharacters` 取得完整角色資料後再傳給 UI。

### BUG-C02 `navigateTo('STAGES')` 在 nav 導覽列中無對應入口
- **嚴重程度**：CRITICAL
- **檔案**：`js/ui.js` 第 78–100 行、`js/main.js` 第 306–331 行
- **問題**：底部導覽列（bottom-nav）沒有「關卡」按鈕，只有首頁/角色/抽卡/任務/親密五個。「出擊」按鈕在首頁存在並可導航到 `stages` 畫面，但 `navigateTo('STAGES')` 在 switch 語句中對應的 key 是 `'STAGES'`，而 UI 畫面 key 是 `'stages'`（小寫）。`navigateTo` 呼叫 `this.ui.showScreen('stages')` 是正確的，但若從 nav 按鈕點擊 `showScreen` 直接以小寫 key 調用，而 stages 在 nav 中不存在，實際上首頁到關卡的流程可以運作，這個問題優先級下調至 HIGH。

### BUG-C03 `battle:retry` 事件處理邏輯：`this.battle` 為 null 後存取 `.stage.id`
- **嚴重程度**：CRITICAL
- **檔案**：`js/main.js` 第 968–972 行
- **問題**：`_processBattleResult` 在結束時設定 `this.battle = null`（第 700 行），然後才顯示結果面板。使用者按「再挑戰」時，`this.battle?.stage?.id` 的 `this.battle` 已是 null，所以 `stageId` 永遠是 `undefined`，導致 retry 無效。
- **建議修復**：在 `_processBattleResult` 結束前儲存 stageId，或在清除 battle 前記錄。

### BUG-C04 `_buildEconomyPools()` 讀取 `GACHA_POOLS` 但 `GACHA_POOLS` 沒有在 main.js import
- **嚴重程度**：CRITICAL
- **檔案**：`js/main.js` 第 12–19 行、第 990–1001 行
- **問題**：import 語句中有 `GACHA_POOLS` 的導入（`import { GACHA_POOLS, ... } from './data.js'`），但 data.js 中沒有 `DAILY_MISSIONS as DAILY_QUESTS` 和 `ACTIVITY_NODES as ACTIVITY_REWARDS` 的別名使用——實際上 main.js 匯入時用了 `DAILY_MISSIONS as DAILY_QUESTS` 別名，但在程式碼中並未實際使用 `DAILY_QUESTS` 或 `ACTIVITY_REWARDS`，economy.js 內部自己定義了 quest defs。這不是 crash，但是浪費 import。

### BUG-C05 `makeWaves` 中 BOSS wave 的格式不一致（陣列包陣列）
- **嚴重程度**：CRITICAL
- **檔案**：`js/data.js` 第 404 行
- **問題**：`stage_1_5` 的第三 wave 寫成 `[{ name: 'BOSS:...', ... }]`（直接放陣列），而 `makeWaves` 函式接受 `waveDefs.map(def => ({ enemies: def }))` ——此處 `def` 已是陣列，所以 `{ enemies: [{ name:'BOSS...' }] }` 是正確的。但是 `makeEnemies` 的結果已是陣列，直接傳入的 `[{ name: 'BOSS...', ... }]` 沒有經過 `makeEnemies`，也是陣列，所以 `makeWaves([[...]])` 會產生 `{ enemies: [...] }` 。這實際上沒問題，但不一致容易引起混淆。

---

## 二、嚴重 Bug（HIGH — 功能不正常）

### BUG-H01 領隊技能對傷害計算無效（`_getLeaderAtkMultiplier` 永遠回傳 1.0）
- **嚴重程度**：HIGH
- **檔案**：`js/battle.js` 第 381–389 行
- **問題**：`_getLeaderAtkMultiplier(element)` 方法只查找 `ls.atkMultiplier` 和 `ls.elementBonuses[element]`，但 data.js 的 leaderSkill 格式是 `{ type: 'element_atk', element: ELEMENT.WATER, multiplier: 2.5 }`，沒有 `atkMultiplier` 或 `elementBonuses` 欄位。所以領隊技能對 ATK 的加成永遠不會觸發，所有傷害都少了 2～3 倍。
- **建議修復**：在 `_getLeaderAtkMultiplier` 中解析 `ls.type`、`ls.element`、`ls.multiplier` 等欄位。

### BUG-H02 `BattleManager.getBattleResult()` 的 `firstClearBonus` 邏輯使用不存在的欄位
- **嚴重程度**：HIGH
- **檔案**：`js/battle.js` 第 289–301 行
- **問題**：`this.stage?.firstClearBonus` 在 data.js 的 stage 定義中不存在，有的欄位是 `firstClearGem`。這導致 `getBattleResult()` 的 `firstClearBonus` 永遠是 `null`，但實際上 main.js 並未呼叫 `getBattleResult()`，而是自己直接讀 `stageData.rewards`，所以實際上不影響功能，但是 `getBattleResult()` 方法本身壞掉了。

### BUG-H03 保底計數顯示為 `0/90`，但實際保底是 `80`
- **嚴重程度**：HIGH
- **檔案**：`js/ui.js` 第 591、626 行
- **問題**：`economy.js` 中 `PITY_HARD_CAP = 80`，但 UI 顯示 `0/90`，造成玩家對保底的錯誤認知。應改為 `0/80`。

### BUG-H04 抽卡後 `GACHA_RESULT` 導航顯示舊的 gacha 畫面而非結果
- **嚴重程度**：HIGH
- **檔案**：`js/main.js` 第 342–345 行
- **問題**：`navigateTo('GACHA_RESULT')` 呼叫 `this.ui.showScreen('gacha')`，但這和 `navigateTo('GACHA')` 顯示同一個 screen，UI 的 gacha screen 內含一個隱藏的 result panel，需要透過 `update('gacha', { results })` 來顯示結果。邏輯是通的，但 `setNavVisible(false)` 在 GACHA_RESULT 時隱藏導覽，使用者按關閉後回不到上一頁（result 面板的關閉只是 `panel.classList.add('hidden')`，但 nav 還是隱藏的）。
- **建議修復**：result 面板關閉後應呼叫 `setNavVisible(true)` 或自動 navigate 回 GACHA。

### BUG-H05 每日任務（economy.js 內部定義）與 data.js 的 `DAILY_MISSIONS` 完全重複但不一致
- **嚴重程度**：HIGH
- **檔案**：`js/economy.js` 第 19–28 行；`js/data.js` 第 707–716 行
- **問題**：有兩套任務定義。economy.js 的任務（`dq_login`, `dq_battles`...）被實際使用；data.js 的 `DAILY_MISSIONS`（`dm_001`...）被 import 到 main.js 但完全沒被用到。economy.js 的任務才是有效的，但 data.js 的任務定義浪費了空間也容易造成混淆。

### BUG-H06 戰鬥回合後 HP 更新沒有同步到 renderer 的 team 物件
- **嚴重程度**：HIGH
- **檔案**：`js/main.js` 第 246–265 行（`_gameLoop`）
- **問題**：`_gameLoop` 中的 `teamDisplay` 從 `this.battle.team` 取得 `hp` 和 `maxHp`，但 `BattleManager.teamHp` 是一個整體數值（不是每個角色個別的 HP），而 `battle.team` 中每個角色的 `hp` 欄位不會被 battle 修改（敵人攻擊只修改 `this.teamHp`）。所以角色頭像下的 HP bar 在戰鬥中永遠顯示滿格。
- **建議修復**：在 enemy turn 後按比例分配 teamHp 給各角色，或改成顯示整體 HP。

### BUG-H07 `dq_orbs`（消除珠子）和 `dq_combo`（達成 COMBO）任務從未被觸發
- **嚴重程度**：HIGH
- **檔案**：`js/main.js` `_runBattleAnimSequence`
- **問題**：`_runBattleAnimSequence` 只在戰鬥勝利後呼叫 `checkQuest('dq_battles', 1)` 和 `checkQuest('dq_stamina', ...)`, 但消除珠子數量（`dq_orbs`）、combo 達成（`dq_combo`）、使用超感技（`dq_special`）的任務進度從未更新。

### BUG-H08 體力顯示只在首頁 HUD 不顯示（`drawHUD` 從未被呼叫）
- **嚴重程度**：HIGH
- **檔案**：`js/main.js` `_gameLoop` 第 243–287 行；`js/renderer.js`
- **問題**：`renderer.drawHUD()` 方法存在但在 `_gameLoop` 中從未被呼叫，非戰鬥時只呼叫 `renderer.clear()` 和 `renderer.drawBackground()`，沒有畫 HUD。玩家在所有非戰鬥畫面看不到任何 Canvas 內容（Canvas 在非戰鬥時隱藏，這是正確的），但體力/貨幣等狀態沒有顯示在 DOM UI 的頂部。首頁的 `home-topbar` 只有遊戲名稱和商店按鈕，沒有體力和資源顯示。

### BUG-H09 `battle:skill` 事件使用 `this.team` 而非 `activeTeam`，導致技能對應錯誤
- **嚴重程度**：HIGH
- **檔案**：`js/main.js` 第 976–978 行
- **問題**：`this.ui.on('battle:skill', ({ index }) => { const char = this.team.filter(Boolean)[index]; })` 使用的是包含 null 的 5 slot team，再 filter 後的陣列，這和傳給 BattleManager 的 `activeTeam` 順序應該一致，但 charId 傳給 `battle.triggerSpecial` 時，battle 的 team 中角色 id 和 Character 物件的 id 相同，這部分應該沒問題。但若 `battle` 已為 null（戰鬥結束後），`this.battle?.triggerSpecial(char.id)` 靜默失敗，這是可接受的。問題是 skill bar 顯示 5 個技能按鈕，但只有 1 人時應只有 1 個有效，其他 4 個應 disabled。

### BUG-H10 `claimActivityReward` 使用 tier 比較但 activity tiers 的 threshold 不是 1~5
- **嚴重程度**：HIGH（輕度）
- **檔案**：`js/economy.js` 第 323–332 行；`js/ui.js` 第 679–686 行
- **問題**：`claimedActivityTiers` 存的是 tier 數字（1~5），但 UI 的 node threshold 是 `[20, 40, 60, 80, 100]`，`claimedThresholds?.includes(threshold)` 比較的是 threshold（20/40/60/80/100），而 `claimedActivityTiers` 存的是 tier index（1/2/3/4/5）。所以 UI 上的「已領取」狀態永遠不會顯示。

---

## 三、UI/UX 問題（MEDIUM）

### BUG-M01 首頁缺少體力/貨幣狀態顯示（頂部資訊列）
- **嚴重程度**：MEDIUM
- **檔案**：`js/ui.js` `_buildHomeScreen`
- **問題**：首頁頂部只有遊戲名稱和商店按鈕，沒有體力條、魔法石數量、金幣數量。玩家不知道自己有多少資源。

### BUG-M02 戰鬥畫面中技能按鈕顯示 5 個，單人隊伍時 4 個無意義
- **嚴重程度**：MEDIUM
- **檔案**：`js/ui.js` 第 438–452 行
- **問題**：技能列固定建立 5 個按鈕，預設都是 `disabled`，但沒有空槽隱藏邏輯。

### BUG-M03 戰鬥畫面 Canvas 的 `battle-canvas-wrap` 沒有設定高度
- **嚴重程度**：MEDIUM
- **檔案**：`css/style.css`（無對應樣式）；`js/ui.js` 第 427 行
- **問題**：`battle-canvas-wrap` div 只用 `_createElement` 建立，沒有對應的 CSS 設定寬高，Canvas 被插入其中後佈局可能異常。

### BUG-M04 關卡畫面的 `stage-num` 使用 `stage.num` 但 `num` 來自 `.split('_').pop()`，BOSS 關顯示為 `5` 而非 `1-5`
- **嚴重程度**：MEDIUM（顯示問題）
- **檔案**：`js/main.js` 第 323–325 行；`js/ui.js` 第 402 行
- **問題**：`num: s.id.split('_').pop()` 取最後一段，`stage_1_5` → `5`，UI 顯示 `${stage.area}-${stage.num}` 即 `1-5`，這其實是正確的，不是 bug。但 stage_3_10 的 num 是 `10` 而不是兩位數問題，這也是正常的。

### BUG-M05 親密度互動後導航不回到親密度列表（停留在當前狀態）
- **嚴重程度**：MEDIUM
- **檔案**：`js/main.js` 第 797–805 行
- **問題**：`doIntimacy` 呼叫 `this.ui.openIntimacyScene(...)` 後，不會刷新親密度畫面的進度條，除非手動切換頁面再回來。

### BUG-M06 `_buildResultPanel` 的「回大廳」按鈕呼叫 `setNavVisible(true)` 但 battle screen 的 canvas 還顯示著
- **嚴重程度**：MEDIUM
- **檔案**：`js/ui.js` 第 508–513 行
- **問題**：homeBtn click 後呼叫 `showScreen('home')`，但 canvas 的 `display` 不會被隱藏（只有 `navigateTo` 中的 `if (screen !== 'BATTLE') canvas.style.display = 'none'` 會隱藏，而 result panel 的 homeBtn 不呼叫 `navigateTo`）。

### BUG-M07 gacha result 關閉後導覽列不顯示
- **嚴重程度**：MEDIUM
- **檔案**：`js/main.js` 第 342–345 行
- **問題**：`navigateTo('GACHA_RESULT')` 呼叫 `setNavVisible(false)`，result panel 關閉按鈕只做 `resultPanel.classList.add('hidden')`，不恢復 nav。

### BUG-M08 `home-showcase` 的角色美術是純色方塊，沒有名字更新觸發邏輯
- **嚴重程度**：LOW（外觀問題）
- **檔案**：`js/ui.js` 第 129–131 行
- **問題**：`charName` 預設是 `'アリサ'`（日文），新遊戲的隊長是蘇青，但 `update('home', { leadCharName })` 事件在 `navigateTo('HOME')` 時確實呼叫，所以名字會被更新。但初始顯示的是錯誤的名字（只在 build 時），在 navigateTo 後就正確了。

---

## 四、邏輯問題（MEDIUM/HIGH）

### BUG-L01 `_getLeaderHpMultiplier` 只看第一個 leader，但 HP 加成應用於 `teamMaxHp` 時沒有分配給個別角色
- **嚴重程度**：HIGH（已歸入 BUG-H06 相關）
- **檔案**：`js/battle.js` 第 78–81 行

### BUG-L02 戰鬥中 `battle.state` 的轉換：`processPlayerTurn` 後設為 `'ANIMATING'`，但 `checkWaveEnd` 需要 state 不是 `'ANIMATING'`
- **嚴重程度**：MEDIUM
- **檔案**：`js/battle.js` 第 207–208、254–270 行
- **問題**：`processPlayerTurn` 最後設 `this.state = 'ANIMATING'`，然後 main.js 呼叫 `checkWaveEnd()`，`checkWaveEnd` 不檢查 state 直接執行（無前置條件），這部分沒問題。但 `checkBattleEnd()` 也不檢查 state。整體 state 機器在 ANIMATING 時允許 checkWaveEnd，行為是正確的，不算 bug。

### BUG-L03 `LEVEL_CAPS` 陣列只有 4 個元素 `[20, 40, 60, 80]`，但 `breakthroughTier` 可以到 3（最大值），`LEVEL_CAPS[3] = 80` 正確；breakthrough 成功後 `breakthroughTier += 1` 到 4，`LEVEL_CAPS[4] = undefined`，`levelCap` getter 回傳 `undefined`
- **嚴重程度**：HIGH
- **檔案**：`js/character.js` 第 42、169–172 行
- **問題**：`BREAKTHROUGH_COST` 有 3 個 tier（index 0、1、2），最多可 breakthrough 3 次，`_breakthroughTier` 最大值為 3。`LEVEL_CAPS[3] = 80`，但 breakthrough 後 tier 變成 3，`LEVEL_CAPS[3]` 是 80（正確），之後再 breakthrough 時 `canBreakthrough` 檢查 `this._breakthroughTier >= BREAKTHROUGH_COST.length（= 3）`，tier 3 不能繼續突破，所以 `LEVEL_CAPS[4]` 永遠不會被存取。沒有 bug。

### BUG-L04 `gainExp` 呼叫 `addExp` 後，如果 `result._apply` 存在才套用，但 `addExp` 在 capped 情況下不附 `_apply`，所以 `gainExp` 在 capped 時無法升級（正確行為），但沒有呼叫 `_apply()` 的情況下 `_totalExp` 永遠不更新
- **嚴重程度**：HIGH
- **檔案**：`js/character.js` 第 100–133 行
- **問題**：`addExp` 在正常情況下（非 capped）回傳一個帶有 `_apply` 方法的物件，呼叫後才真正修改 `_totalExp` 和 `_level`。但是 `addExp` 回傳的物件中包含 `_apply`，是一個「閉包副作用」模式——這屬於設計問題（直接修改 state 是 mutation），但功能上 `gainExp` 正確呼叫了 `result._apply()`，所以升級是有效的。BUT：如果不呼叫 `gainExp` 而直接用 `addExp`（結果不呼叫 `_apply`），EXP 就不更新。這是 API 設計陷阱，但目前程式碼只使用 `gainExp`，所以實際無 bug。

### BUG-L05 `Character.getDialogue(index)` 不限制在親密度等級解鎖範圍內
- **嚴重程度**：LOW
- **檔案**：`js/character.js` 第 334–338 行
- **問題**：`getDialogue(0)` 永遠可以取得第一條對話，不管親密度等級。這在首頁 greeting 使用上是合理的，但如果要按等級限制對話，需要另行處理。

---

## 五、效能問題（LOW）

### BUG-P01 `_gameLoop` 每幀都重建 `teamDisplay` 和 `enemyDisplay` 陣列（GC 壓力）
- **嚴重程度**：LOW
- **檔案**：`js/main.js` 第 247–265 行
- **問題**：每個 rAF 週期都用 `.map()` 建立新陣列，產生 GC 壓力。可快取物件並只在狀態變化時更新。

### BUG-P02 `_drawMatchEffectsOnBoard` 和 `_renderDamageNumbers` 每幀執行 alpha 遞減，即使沒有效果時也執行 filter
- **嚴重程度**：LOW
- **檔案**：`js/renderer.js` 第 221–236、525–547 行
- **問題**：即使 `_matchFX` 和 `_damages` 為空，每幀仍執行 filter。可加早出條件。

### BUG-P03 `updateStamina()` 在 `_gameLoop` 每幀被呼叫，但體力恢復是以秒為單位
- **嚴重程度**：LOW
- **檔案**：`js/main.js` 第 241 行；`js/economy.js` 第 126–144 行
- **問題**：不必每幀呼叫 `updateStamina`，可改為每秒呼叫一次或每次存取時才計算。雖然內部有 `recovered > 0` 早出，但仍每幀計算 `elapsed`。

---

## 六、其他問題（LOW）

### BUG-O01 `team:slotClick` 處理邏輯缺少視覺回饋
- **嚴重程度**：LOW
- **檔案**：`js/main.js` 第 951–954 行
- **問題**：點擊 slot 時只設定 `_pendingTeamSlot`，沒有高亮顯示選中的槽位，使用者不知道目前要填充哪個槽位。

### BUG-O02 `_buildStageRow` 的初通獎勵顯示條件邏輯錯誤
- **嚴重程度**：LOW
- **檔案**：`js/ui.js` 第 410–411 行
- **問題**：`if (stage.firstClear && !stage.firstCleared)` 中 `stage.firstClear` 欄位在 data.js 中不存在（有的是 `firstClearGem`），所以「初通獎勵」標籤永遠不顯示。應改為 `if (stage.firstClearGem && !stage.firstCleared)`。

### BUG-O03 `showToast` 方法：toast 消失只靠 setTimeout，沒有 CSS transition 讓消失更順暢
- **嚴重程度**：LOW
- **檔案**：`js/ui.js` 第 967–975 行；`css/style.css`
- **問題**：Toast 的 `show`/`hidden` class 切換缺少 CSS transition 定義。

### BUG-O04 `_buildCharDetailPanel` 中 `const badge = ...` 變數宣告但 ESLint 可能警告未使用
- **嚴重程度**：LOW
- **檔案**：`js/ui.js` 第 217–219 行
- **問題**：`const badge` 宣告後未使用（只是附加到 DOM），ESLint 無用變數警告。

### BUG-O05 `team:pickChar` 事件重複 `on` 監聽，`this.ui.on('nav:team', () => {})` 覆蓋了原本的 handler
- **嚴重程度**：MEDIUM
- **檔案**：`js/main.js` 第 960–961 行
- **問題**：`this.ui.on('nav:team', () => {})` 會覆蓋之前在第 915 行設定的 `nav:team` handler（因為 `_handlers[event] = handler` 是直接賦值），導致之後點擊 nav 的 team 按鈕（但 nav 上沒有 team 按鈕）或透過 home screen 的編隊按鈕時，原本顯示角色列表的邏輯被空 handler 取代。
- **建議修復**：刪除 `this.ui.on('nav:team', () => {})` 這行，直接呼叫 `this.ui._emit('nav:team', {})`。

---

## 問題統計摘要

| 嚴重程度 | 數量 |
|----------|------|
| CRITICAL | 3（C01, C03 實際有影響；C04 不影響功能） |
| HIGH     | 10 |
| MEDIUM   | 7  |
| LOW      | 7  |
| 合計     | 27 |

---

## 修復記錄

修復執行日期：2026-03-29

### FIX-01 ✅ 領隊技能 ATK 加成修復（BUG-H01）
- **檔案**：`js/battle.js`
- **修改**：`_getLeaderAtkMultiplier()` 現在正確解析 data.js 格式的 leaderSkill（type/element/multiplier 欄位），所有元素傷害計算現在能正確套用 2x～3x 的領隊加成。同時修復 `_getLeaderHpMultiplier()` 支援 `all_hp` 類型。

### FIX-02 ✅ 戰鬥 retry 儲存 stageId（BUG-C03）
- **檔案**：`js/main.js`
- **修改**：`_processBattleResult` 開始時儲存 `this._lastBattleStageId`，`battle:retry` 事件使用此備份 ID，避免 `this.battle` 為 null 後 retry 失效。

### FIX-03 ✅ 保底顯示改為 `/80`（BUG-H03）
- **檔案**：`js/ui.js`
- **修改**：gacha 畫面保底計數初始值和更新值從 `90` 改為 `80`，與 economy.js 的 `PITY_HARD_CAP = 80` 一致。

### FIX-04 ✅ gacha result 關閉後恢復導覽列（BUG-M07）
- **檔案**：`js/ui.js`
- **修改**：gacha result 面板的「關閉」按鈕現在呼叫 `setNavVisible(true)` 並 `_setActiveNav('gacha')`，確保玩家關閉抽卡結果後能正常使用導覽。

### FIX-05 ✅ result panel「回大廳」和暫停「放棄」正確隱藏 Canvas（BUG-M06）
- **檔案**：`js/ui.js`
- **修改**：兩個返回大廳的按鈕現在都呼叫 `document.getElementById('game-canvas').style.display = 'none'`，避免戰鬥 canvas 殘留顯示在首頁上。

### FIX-06 ✅ 初通獎勵顯示條件修正（BUG-O02）
- **檔案**：`js/ui.js`
- **修改**：`_buildStageRow` 中判斷條件從 `stage.firstClear` 改為 `stage.firstClearGem`（與 data.js 實際欄位一致），初通獎勵鑽石數量也一併顯示。

### FIX-07 ✅ `team:pickChar` 不再覆蓋 nav:team handler（BUG-O05）
- **檔案**：`js/main.js`
- **修改**：刪除 `team:pickChar` 中錯誤的 `this.ui.on('nav:team', () => {})` 呼叫，直接使用 `this.ui._emit('nav:team', {})` 觸發已有的 handler。

### FIX-08 ✅ 戰鬥任務進度追蹤：珠子消除/COMBO/超感技（BUG-H07）
- **檔案**：`js/main.js`
- **修改**：`_runBattleAnimSequence` 中在玩家回合結算後，追蹤 `dq_orbs`（消除珠子數）和 `dq_combo`（10 combo 以上），`battle:skill` 事件成功觸發超感技時追蹤 `dq_special`。

### FIX-09 ✅ 戰鬥 HP bar 按整體 HP 比例正確縮放（BUG-H06）
- **檔案**：`js/main.js`
- **修改**：`_gameLoop` 中 teamDisplay 的 hp 現在根據 `battle.teamHp / battle.teamMaxHp` 比例計算每個角色的顯示 HP，戰鬥中受傷時 HP bar 能正確減少。

### FIX-10 ✅ activity tier 領取狀態顯示修正（BUG-H10）
- **檔案**：`js/main.js`
- **修改**：傳給 UI 的 `claimedThresholds` 現在把 tier 索引（1~5）轉換為 threshold 數值（20~100），UI 的 `includes(threshold)` 比較才能正確判斷已領取狀態。

### FIX-11 ✅ 首頁新增體力/貨幣資訊顯示（BUG-H08）
- **檔案**：`js/ui.js`、`js/main.js`、`css/style.css`
- **修改**：首頁新增 `home-resource-bar`，顯示體力（⚡）、魔法石（💎）、金幣（🪙）數值。`navigateTo('HOME')` 先呼叫 `updateStamina()` 確保數值最新，再傳入 UI。

### FIX-12 ✅ 技能按鈕按實際隊員數量顯示/隱藏（BUG-M02）
- **檔案**：`js/ui.js`
- **修改**：`battle` 畫面 update 時，超出 `data.team.length` 的技能按鈕設 `display: none`，只顯示實際隊員對應的按鈕。

### FIX-13 ✅ 親密度互動後自動刷新畫面（BUG-M05）
- **檔案**：`js/main.js`
- **修改**：`doIntimacy` 呼叫 `openIntimacyScene` 後，立即呼叫 `update('intimacy', ...)` 刷新所有角色的親密度進度條。

### FIX-14 ✅ 新遊戲自動給登入任務進度
- **檔案**：`js/main.js`
- **修改**：`_newGame()` 中在建立初始資料後呼叫 `economy.checkQuest('dq_login', 1)`，新玩家第一天也能完成登入任務。

### FIX-15 ✅ `_gameLoop` 體力更新從每幀改為每秒（BUG-P03）
- **檔案**：`js/main.js`
- **修改**：使用 `_staminaAccum` 累計 delta，每 1000ms 才呼叫 `updateStamina()`，減少不必要的計算。

---

## 修復後已知限制

1. **領隊技能 HP 加成**：`_getLeaderHpMultiplier` 只使用 `team[0]`（隊長）的加成，副隊長技能暫未實作（設計如此）。
2. **體力顯示**：僅在 HOME 畫面有資源列，切到其他畫面（角色/任務等）不會即時更新體力數值。
3. **DAILY_MISSIONS（data.js）vs DAILY_QUEST_DEFS（economy.js）**：兩套任務定義並存，data.js 版本完全未使用，日後應統一。
4. **升星/突破 UI**：角色詳情頁尚未有升星/突破操作按鈕（後端邏輯已完整）。
