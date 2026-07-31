# Unified Workspace Settings and Caption Directory Titles

**目標：** 將 OpenPress 專屬設定統一到 `openpress/settings.json`，讓 Workspace Appearance 能跨瀏覽器、跨電腦與協作者一致；同時限制圖目錄與表目錄的長標題高度，避免左側導覽被單一 caption 撐開。

## 現況

OpenPress 目前從 `package.json#openpress` 讀取頁面、編號、PDF 與部署設定。Workspace Appearance 則直接讀寫 browser `localStorage`，所以不同瀏覽器會得到不同的 color mode 與 accent。

圖目錄和表目錄共用主目錄的無限行標題樣式。Caption 較長時，單一項目會占用多行並推動後續項目，降低掃讀效率。

## 設定來源

`openpress/settings.json` 成為 OpenPress 設定的主要來源。新專案不再將 OpenPress 設定寫進 `package.json`。

它是可編輯、應進 Git 的 workspace source。實作時必須同步更新 AGENTS 與 `skills/openpress/SKILL.md` 的 Source Boundary；`public/openpress/settings.json` 和 `dist-react/openpress/settings.json` 才是不可手改的 generated output。

第一版 schema：

```json
{
  "version": 1,
  "appearance": {
    "colorMode": "dark",
    "accent": "amber"
  },
  "page": "a4",
  "captionNumbering": {
    "figure": "圖",
    "table": "表",
    "separator": " "
  },
  "pdf": {
    "filename": "document.pdf"
  },
  "deploy": {
    "adapter": "cloudflare-pages",
    "source": ".deploy/openpress",
    "projectName": null,
    "commitDirty": false,
    "requiresConfirmation": true
  }
}
```

`appearance` 支援：

- `colorMode`: `system`、`dark`、`light`
- `accent`: `amber`、`blue`、`emerald`、`violet`、`rose`

其他欄位沿用現有 engine 型別、預設值與驗證規則。Workspace 和 Press 的名稱、標題、theme 與內容仍由 `<Workspace>`、`<Press>` 及 Press Tree source 管理，不移進 settings。

## 載入與相容性

Engine 以欄位為單位套用下列優先序：

1. `openpress/settings.json`
2. `package.json#openpress`
3. framework defaults

這個 fallback 僅供舊專案遷移。若 settings 與 package 同時宣告相同欄位，settings 生效，`doctor` 回報重複設定。若只有 legacy package 設定，CLI 繼續正常工作，但 `doctor` 提示執行 upgrade。

新建專案只產生 `openpress/settings.json`。Workspace 偵測接受 `press/*/press.tsx` 或 `openpress/settings.json`，不再依賴 package field 作為唯一標記。

## Migration

`open-press upgrade` 負責明確遷移，不在啟動 dev server 時偷偷改檔。

Upgrade 流程：

1. 讀取並驗證 `package.json#openpress`。
2. 若 `openpress/settings.json` 已存在，先檢查重複欄位與值是否相容。
3. 將所有已支援欄位合併到 version 1 settings。
4. 原子寫入 `openpress/settings.json`。
5. 只有在 legacy object 的所有欄位都已辨識並成功搬移後，才移除 `package.json#openpress`。
6. 若遇到未知欄位或衝突，停止遷移並保留兩個來源，不丟失資料。

Framework dogfood workspace 和 starter fixtures 在同一批變更中遷移。舊 package field 暫時維持可讀，之後再透過 major release 移除。

## Dev Settings API

本機 dev server 提供：

- `GET /__openpress/workspace-settings`
- `PUT /__openpress/workspace-settings`

GET 回傳 normalize 後的完整設定與來源資訊。PUT 接受完整 versioned settings object，先完成 schema 與既有安全規則驗證，再透過同目錄暫存檔與 rename 原子寫入 `openpress/settings.json`。

Appearance UI 可以先更新畫面，但必須顯示 pending 狀態。PUT 成功後確認新值；失敗時回復上一份設定並顯示可操作的錯誤訊息。部署後不提供 PUT。

## Public Runtime

Build 在 `public/openpress/settings.json` 與對應的 `dist-react/openpress/settings.json` 產生公開 runtime projection。它不是 source 的完整複製，只包含瀏覽器需要的安全欄位：

```json
{
  "version": 1,
  "appearance": {
    "colorMode": "dark",
    "accent": "amber"
  }
}
```

PDF、deploy、page 與 caption numbering 不放進公開 settings。這些設定仍由 engine 在 build/export 階段使用。

Workspace App 啟動時讀取 `/openpress/settings.json`。本機 dev middleware 以 source settings 動態回應同一路徑，build／deploy 則由靜態輸出回應，因此 UI 不需要辨識環境。

Appearance 不再以 `localStorage` 作為 source of truth。舊 color mode 與 accent keys 只在一次性 migration 中作 fallback：若 settings 尚未宣告 appearance，可以讀取舊值協助使用者寫入 source；一旦 source 存在就忽略舊 keys。

## 個人與裝置狀態

下列狀態不移進 settings：

- 每個 Press 的 zoom
- 左側 panel 寬度
- panel 開關狀態
- 閱讀位置與 bookmark guide
- inspector mode
- 當下選擇的主目錄、圖目錄或表目錄

它們與螢幕尺寸、瀏覽器或操作過程相關，繼續使用 `localStorage` 或 `sessionStorage`。Settings 只保存 workspace 共用設定，不同步即時閱讀狀態。

## 圖目錄與表目錄標題

Caption directory 保留固定編號欄，標題最多顯示兩行：

```text
圖 1   OpenPress 的願景：文件內容、
       Media 與 React component…
```

行為規則：

- 使用兩行 clamp 與省略號，列表項目維持穩定高度。
- Active item 不展開，避免切頁時導覽上下跳動。
- Hover 或 keyboard focus 顯示完整標題 tooltip。
- Button 的 accessible name 與 DOM 文字保留完整 caption。
- Tooltip 不攔截點擊；點擊仍直接前往 caption 所在頁。
- Tooltip 只在文字實際 overflow 時顯示，短標題不增加多餘互動。

主目錄維持現有多行階層樣式，不套用 caption clamp。

## 錯誤處理

- Settings 不存在：使用 defaults；dev Settings UI 第一次儲存時建立檔案。
- JSON 無法解析或 version 不支援：build、doctor 與 PUT 回報明確錯誤，不以 defaults 靜默覆蓋。
- 欄位值不合法：列出 JSON path 與允許值。
- PUT 寫入失敗：保留原檔，UI rollback。
- Legacy migration 遇到未知欄位：停止並保留 package field。
- Public runtime settings 無法載入：使用 Appearance defaults，App 仍可閱讀文件，並在開發環境記錄 warning。

## 測試

### Engine

- settings loader 的 precedence、defaults、version 與 schema validation
- legacy package fallback
- upgrade 成功遷移及 package field 移除
- 未知欄位與衝突時不破壞原設定
- public runtime projection 不包含 page、PDF 或 deploy

### Dev server

- GET 回傳 normalize 後設定
- PUT 驗證並原子寫入
- malformed body、unsupported version 與 write failure
- deployed/static mode 不提供 PUT

### UI

- Settings Page 從 server/runtime settings 初始化
- 儲存成功後更新 Appearance
- 儲存失敗時 rollback 並顯示錯誤
- 兩個獨立 browser context 讀到相同 Appearance
- 舊 Appearance localStorage 不覆蓋 source settings

### Caption directory

- 長標題維持兩行與省略號
- 短標題不顯示 tooltip
- overflow 標題在 hover 與 focus 顯示完整 tooltip
- accessible name 保留完整標題
- active item 不改變列表高度

## 非目標

- 不同步不同瀏覽器目前正在閱讀的頁面。
- 不將 zoom、panel width 或閱讀位置變成 workspace 共用設定。
- 不提供 deployed website 修改 settings 的能力。
- 不在這次變更加入可自訂 hotkeys。
- 不移動 Press theme 或 authored content。
