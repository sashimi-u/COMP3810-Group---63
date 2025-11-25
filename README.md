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

## 已移除 Demo 登入

- 為了安全性考量，專案中原本的 `/demo-login` route（允許匿名或以簡單密碼快速登入 demo 帳號）已被移除。
- 若你需要在開發或測試環境建立示範帳號，請不要恢復舊的 demo-login endpoint；建議使用下列方式之一：
  - 使用專用腳本建立：`node models/scripts/createUser.js <username> <password>`（上述範例）。
  - 或在本地 seed script 中建立帳號，並以環境限定（僅在 `NODE_ENV !== 'production'`）執行。

- 注意：若要在開發環境快速登入 admin，請先用腳本建立一個帳號，然後透過 `ensureAdmin` 機制或直接在 DB 設定該帳號為 `admin`。

這樣可以避免在生產環境暴露弱密碼登入點或不受控的 demo 帳號。

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

以下是對應各路由的 `curl` 範例（方便用 CLI 測試）。注意：某些 admin 或受保護的 route 需要有效的 session/cookie 或先登入。

示範：建立任務（POST）
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"title":"買牛奶","description":"到超市買一瓶","priority":"low","status":"pending"}' \
  http://localhost:3000/api/tasks
```

示範：取得所有任務（GET）
```bash
curl http://localhost:3000/api/tasks
```

示範：取得單一任務（GET）
```bash
curl http://localhost:3000/api/tasks/<TASK_ID>
```

示範：更新任務（PUT）
```bash
curl -X PUT -H "Content-Type: application/json" \
  -d '{"status":"in-progress","priority":"high"}' \
  http://localhost:3000/api/tasks/<TASK_ID>
```

示範：刪除任務（DELETE）
```bash
curl -X DELETE http://localhost:3000/api/tasks/<TASK_ID>
```

示範：註冊（使用表單編碼）
```bash
curl -X POST -d "username=newuser&password=secret" http://localhost:3000/register
```

示範：登入（使用表單編碼）
```bash
curl -X POST -d "username=alice&password=alice" -c cookies.txt http://localhost:3000/login
```

- 備註：上例 `-c cookies.txt` 會把伺服器回傳的 cookie 存成檔案；後續若要帶著登入狀態呼叫需要 cookie 的路由（例如 admin API），可用 `-b cookies.txt`：

```bash
# 範例：以已登入的 cookies 存取 admin 使用者清單（需 admin 權限）
curl -b cookies.txt http://localhost:3000/admin/users
```

以上範例旨在協助本機或 CI 測試；若要在生產或公開環境使用，請確保透過 HTTPS 與適當的認證方式保護你的憑證及 cookie。

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
