# 超感穿梭 Enhanced — 開發記錄

## 專案資訊
- **GitHub**: https://github.com/lialialialia1211-debug/sensultra-enhanced
- **技術棧**: HTML5 Canvas + Vanilla JS (ES Modules) + CSS
- **目標平台**: PC + Web (直立式 540x960)
- **分析來源**: 超感穿梭 (Sens Ωltra) 遊戲拆解 (V6.6 skill)

---

## 開發時間線

### 2026-03-29 — Day 1

**拆解分析階段**
- 使用 game-reverse-engineering skill V6.6 拆解「超感穿梭」
- Agent 1（文字搜尋）+ Agent V（Gemini 視覺驗證，3 支 YouTube 影片）並行
- 產出 Document 1（Audit PASS）：Core DNA 4 / Structural Skin 5 / Design Debt 3
- 完成 Stage 9 Track A 開發概要

**數值設計階段**
- 廣蒐 PAD/TOS/E&P/CQ/Othellonia 等轉珠遊戲數值
- 整理跨遊戲數值對照表（戰鬥/經濟/留存）
- 確定傷害公式、COMBO 倍率（1.25x 起始）、屬性克制（1.5x/0.5x）、80 抽保底

**M1-M2 開發**
- 建立專案骨架（HTML5 Canvas + JS Modules）
- 完成 board.js（5x7 棋盤引擎，八方向交換）
- 完成 battle.js（傷害公式、波次、充能）
- 完成 character.js + data.js（12 角色、30 關卡）
- 完成 economy.js（抽卡保底、體力、每日任務）
- 完成 renderer.js + ui.js（Canvas 渲染 + DOM UI）
- 完成 main.js 整合

**M3-M4 開發**
- 抽卡系統（常駐+限定、80 軟保底、160 硬保底、50/50）
- 每日任務（8 個 + 5 活躍度節點）
- 親密互動（10 級、對話、選項）
- 存檔系統（localStorage + 自動存檔）

**整合修復**
- 29 項介面不匹配修復（import/export 對齊）
- Canvas 定位修復（z-index 覆蓋問題）
- 戰鬥傷害管線修復（off-element fallback 50% 傷害）

**優化迭代（57 項）**
- 第 1 輪審計：27 問題找出、15 項修復
- 第 2 輪戰鬥流程：12 項修復（processPlayerTurn 狀態機、結算、retry）
- 第 3-5 輪品質優化：30 項全完成（動畫、UI、邏輯、新手引導）

### 2026-03-30 — Day 2

**計畫書撰寫**
- 1,827 行深度優化與內容擴充計畫書
- 完整世界觀設定（雙界裂縫、超感者三類型、裂縫管理局）
- 12 角色完整人設（性格、背景、口癖、親密度 10 級大綱）
- 序章 5 場景 + 第一章 6 場景完整對話腳本

**劇情系統開發**
- dialogue.js：全螢幕對話管理器（打字機效果、分支選項、觸發器）
- 序章 3 幕 + 第一章 4 幕劇情資料寫入 data.js
- 劇情觸發系統（triggerBefore/triggerAfter 關卡綁定）
- 教學關卡 3 關（消除/屬性/技能）
- 新手引導流程（歡迎→序章→教學→解鎖第一章）

**音效系統開發**
- audio.js：Web Audio API 合成音效（7 種）
- COMBO 動態音調、屬性差異化音效
- BGM 淡入淡出框架

**美術素材生成**
- 使用 art-department skill + fal.ai Flux/Dev API
- 生成 18 張圖片（8 立繪 + 5 頭像 + 4 背景 + 1 主視覺）
- 整合進遊戲（角色圖鑑、戰鬥背景、首頁、對話）
- 修復圖片映射（icon 缺失、抽卡結果顯示）

**Phase Three — UI 精修 + 效能優化（10 項）**
- 數值千分位格式化
- 體力恢復倒計時（+1 05:23 格式）
- SSR 抽卡金色發光演出
- 保底進度條（藍→橘→紅漸變）
- 已通關關卡 ✓ 標記
- 角色詳情面板（技能/隊長技/親密度）
- 戰鬥 HUD 改善
- 效能自適應幀率（15/30/60fps）
- 首頁毛玻璃資源列
- Toast 通知滑入動畫 + 顏色分類

**第二批美術生成（10 張）**
- R/N 角色立繪 4 張（葛林·尤、夏羽、波林、影切·莫）
- R 角色 icon 2 張
- SR 缺失 icon 4 張（艾理、菲洛、奧爾泰、沃爾崔 v2）
- 全 12 角色現在都有 portrait + icon
- 總美術素材：28 張

**Bug 修復**
- 序章對話覆蓋層擋住所有畫面 → 加入跳過按鈕 + 導航列隱藏
- 編隊系統無法操作 → 重寫事件綁定（點擊加入/移除切換）
- 親密互動卡住 → 修復對話格式轉換 + 狀態恢復
- 舊存檔遷移 → 自動標記已通關玩家的序章完成

---

## 美術資源使用記錄

### fal.ai API 使用
- **模型**: fal-ai/flux/dev（從 flux-kontext/pro 降級，因 pro 端點不可用）
- **API Key**: 使用者提供
- **生成日期**: 2026-03-30
- **總張數**: 18 張
- **成功率**: 18/18 (100%)
- **輸出目錄**: ~/Desktop/ai-art-staging/2026-03-30_sensultra-enhanced/

### 生成清單

| 檔名 | 尺寸 | 類別 | 去背 | 用途 |
|------|------|------|------|------|
| char_01_lanzeta.png | 1024x1536 | 立繪 | 是 | 蘭澤塔 SSR火 |
| char_01_lanzeta_icon.png | 256x256 | 頭像 | 否 | 蘭澤塔頭像 |
| char_02_voltrei.png | 1024x1536 | 立繪 | 是 | 沃爾崔 SSR水 |
| char_02_voltrei_icon.png | 256x256 | 頭像 | 否 | 沃爾崔頭像 |
| char_03_morira.png | 1024x1536 | 立繪 | 是 | 森羅輝 SSR木 |
| char_03_morira_icon.png | 256x256 | 頭像 | 否 | 森羅輝頭像 |
| char_04_yaya_zvan.png | 1024x1536 | 立繪 | 是 | 夜鴉茲凡 SSR暗 |
| char_04_yaya_zvan_icon.png | 256x256 | 頭像 | 否 | 夜鴉茲凡頭像 |
| char_05_suqing.png | 1024x1536 | 立繪 | 是 | 蘇青 SR水（主角） |
| char_05_suqing_icon.png | 256x256 | 頭像 | 否 | 蘇青頭像 |
| char_06_airy.png | 1024x1536 | 立繪 | 是 | 艾理 SR火 |
| char_07_philo.png | 1024x1536 | 立繪 | 是 | 菲洛亞爾 SR光 |
| char_08_orltai.png | 1024x1536 | 立繪 | 是 | 奧爾泰 SR暗 |
| bg_01_main_menu.png | 540x960 | 背景 | 否 | 主畫面（曉城） |
| bg_02_dark_forest.png | 540x960 | 背景 | 否 | 幽闇森林 |
| bg_03_base_interior.png | 540x960 | 背景 | 否 | 基地內部 |
| bg_04_boss_arena.png | 540x960 | 背景 | 否 | Boss 戰場 |
| key_01_main_visual.png | 1920x1080 | 主視覺 | 否 | 宣傳用主視覺 |

### Gemini API 使用（視覺驗證）
- **模型**: gemini-2.5-pro
- **使用時機**: Agent V Phase 1（遊戲拆解階段）
- **分析影片**: 3 支 YouTube 影片（超感穿梭封測實機）
- **用途**: 驗證遊戲 UI/機制的視覺事實

---

## 程式碼統計

| 檔案 | 行數 | 用途 |
|------|------|------|
| js/main.js | ~1,500 | 遊戲主控制器 |
| js/ui.js | ~1,200 | DOM UI 管理 |
| js/data.js | ~1,000 | 角色/關卡/劇情資料 |
| js/renderer.js | ~700 | Canvas 渲染 |
| js/board.js | ~450 | 三消引擎 |
| js/battle.js | ~450 | 戰鬥系統 |
| js/economy.js | ~450 | 經濟系統 |
| js/character.js | ~400 | 角色邏輯 |
| js/dialogue.js | ~350 | 對話系統 |
| js/audio.js | ~250 | 音效系統 |
| js/save.js | ~80 | 存檔系統 |
| css/style.css | ~1,800 | 樣式 |
| index.html | ~20 | 入口 |
| **總計** | **~8,650** | |

---

## 相關文件

| 文件 | 位置 | 內容 |
|------|------|------|
| 拆解分析報告 | game-reverse-engineering/超感穿梭/document-1.md | Document 1 完整報告 |
| Track A 開發概要 | game-reverse-engineering/超感穿梭/stage9-track-a.md | 開發規格書 |
| 數值參考（PAD/TOS） | game-reverse-engineering/超感穿梭/numerical-ref-pad-tos.md | 轉珠遊戲數值 |
| 數值參考（其他） | game-reverse-engineering/超感穿梭/numerical-ref-others.md | 其他三消遊戲數值 |
| 經濟基準線 | game-reverse-engineering/超感穿梭/numerical-ref-economy.md | Gacha 業界標準 |
| 深度優化計畫書 | sensultra-enhanced/plan-v2-deep-optimization.md | 1,827 行完整計畫 |
| 審計報告 | sensultra-enhanced/audit-report.md | 品質審計結果 |
