# comp3810sef-group63 — Task Manager

簡短說明：本專案為 COMP3810 的任務管理範例，使用 Express.js + EJS 模板與 Mongoose（MongoDB）。功能包含使用者登入/登出、任務 CRUD（網頁與 API）、以及簡單的 admin 工具。

## 快速開始

1. 安裝依賴

```bash
npm install
```

2. 啟動 MongoDB（若要使用資料庫），請設定 `MONGO_URL` 環境變數（例如 `mongodb+srv://<user>:<password>@cluster0...`）。本專案的 scripts 與工具在未設定 `MONGO_URL` 時會明確報錯，主應用在啟動時也會優先使用環境變數或 `models/scripts/config.json` 中的設定。

3. 啟動伺服器

```bash
npm start
# 開發時可用 nodemon（若已安裝）
npm run dev
```

4. 開啟網站

```text
http://localhost:3000
```

備註：根路由現在會導向 `/login`（直接打 `/` 會被 redirect 到登入頁）。

## 主要頁面
- `/login` — 登入頁面
- `/dashboard` — 儀表板（需登入）
- `/tasks` — 任務列表（需登入）
- `/tasks/create` — 建立任務（需登入）
- `/tasks/:id/edit` — 編輯任務（需登入）
- `/admin/tools` — 管理工具（需 admin）
- `/admin/users/list` — 管理員使用者清單（需 admin）

## 使用者與管理
- 建立使用者（本地腳本）：

```bash
# 範例：建立使用者 alice 密碼 alice
node models/scripts/createUser.js alice alice
```

- 有一個 `ensureAdmin` 機制會在 DB 可用時確保特定使用者為 admin（設定環境變數 `ADMIN_USERNAME` 以指定使用者）。

## 視覺與樣式（使用-css 分支）
- 本專案包含兩個視覺分支：`using-css`（使用共用 CSS）與 `not-using-css`（移除外部 CSS 的簡易樣式）。目前你正在 `using-css` 開發分支。
- 全域樣式位在 `public/css/style.css`。主要新增與慣例：
  - 按鈕類別：`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-success`, `.btn-ghost`
  - 任務卡片：`.task`, `.task-meta`, `.pill`（顯示 priority/status）
  - 建立/編輯頁面使用「分段式」radio（`.segmented`）呈現 coloured buttons

## API（示範）
- `GET /api/tasks` — 取得所有任務
- `GET /api/tasks/:id` — 取得單一任務
- `POST /api/tasks` — 建立任務
- `PUT /api/tasks/:id` — 更新任務
- `DELETE /api/tasks/:id` — 刪除任務

示範（建立任務）：
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"title":"買牛奶","description":"到超市買一瓶","priority":"low","status":"pending"}' \
  http://localhost:3000/api/tasks
```

## 管理員使用者頁面
- 新增 server-rendered admin users 頁面：`/admin/users/list`，會呈現所有使用者（需 admin 權限）。舊有的 JSON API `/admin/users` 仍保留供 AJAX 或程式使用。

## 常見問題 / 開發注意
- 若啟動時出現 `EADDRINUSE`（埠被佔用），可以檢查佔用者：

```bash
lsof -i :3000
# 停掉 PID
kill <PID>
# 或改用另一個埠啟動
PORT=3001 npm start
```

- 若 MongoDB 不可用，應用會使用記憶體示範資料（登入會被禁止，請確認 DB 連線以啟用使用者登入）。

## 檔案說明（重點）
- `server.js` — 路由、認證（cookie-session + bcrypt）、資料存取邏輯（Mongoose + in-memory fallback）
- `models/` — `User.js`, `Task.js`（Mongoose schema）
- `views/` — EJS 模板（含 `views/partials`：`header`, `sidebar`, `dashbox`）
- `public/css/style.css` — 全域樣式（按鈕、表格、任務卡、響應式布局）
- `models/scripts/createUser.js` — CLI 建立使用者（bcrypt）

## 我可以幫忙的事情
- 如果你要我啟動伺服器做快速檢查，我可以先檢查 3000 埠狀態並用 `PORT=3001` 啟動（或協助停止現有程序）。
- 若要我把 README 補上更詳細的部署/環境變數（如 `MONGO_URL`、`ADMIN_USERNAME`、production 環境建議），請告訴我要加入的細節。

---
更新於：2025-11-22
