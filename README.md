# comp3810sef-group63 (Task Manager)

簡短說明：這是一個使用 Express + EJS + Mongoose 的簡易任務管理應用，符合 COMP3810 的作業要求（登入/登出、CRUD 網頁與 RESTful API）。

## 啟動

1. 安裝依賴

```bash
npm install
```

2. 如果有本地 MongoDB，預設連到 `mongodb://localhost:27017/taskmanager`。
   如果沒有，應用會自動使用記憶體內建示範資料。

3. 啟動 server

```bash
npm start
# 或開發環境
npm run dev
```

4. 在瀏覽器打開 `http://localhost:3000`。

- 登入頁面：`/login`（範例帳號：`admin` / `password`）
- 登入後可以到 `/dashboard` 或 `/tasks` 管理任務。

## 功能
- 網頁：登入/登出、建立任務、編輯任務、刪除任務、檢視任務列表
- RESTful API（無認證）：
  - `GET /api/tasks` 取得所有任務
  - `GET /api/tasks/:id` 取得單一任務
  - `POST /api/tasks` 建立任務
  - `PUT /api/tasks/:id` 更新任務
  - `DELETE /api/tasks/:id` 刪除任務

## 檔案結構重點
- `server.js`：主要路由與 API
- `models/`：`User.js`, `Task.js`
- `views/`：EJS 模板（`login.ejs`, `dashboard.ejs`, `tasks.ejs`, `create_task.ejs`, `edit_task.ejs`）

## 備註
- 當使用 MongoDB 時，會使用資料庫儲存任務，否則會在記憶體中維持示範資料（重啟後會消失）。
- 若要建立初始使用者，可使用提供的 `scripts/createUser.js`（若已實作）。

---
這份 README 可再補上部署到雲端的 URL 或更詳細步驟（例如 MONGO_URL env 設定），若要我幫忙我可以補上。

**Demo Curl 指令（示範 RESTful API）**

以下指令假設伺服器在本機 `http://localhost:3000` 執行。請把 `<TASK_ID>` 換成從 `GET /api/tasks` 取得的 `_id`。

- **取得所有任務**
```bash
curl http://localhost:3000/api/tasks
```

- **取得單一任務**
```bash
curl http://localhost:3000/api/tasks/<TASK_ID>
```

- **建立任務（POST）**
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"title":"買牛奶","description":"到超市買一瓶","priority":"low","status":"pending"}' \
  http://localhost:3000/api/tasks
```

- **更新任務（PUT）**
```bash
curl -X PUT -H "Content-Type: application/json" \
  -d '{"status":"completed"}' \
  http://localhost:3000/api/tasks/<TASK_ID>
```

- **刪除任務（DELETE）**
```bash
curl -X DELETE http://localhost:3000/api/tasks/<TASK_ID>
```

這些指令適合用來做快速 demo 或手動測試 API。若要用 Web UI，請先登入（`/login`），然後在瀏覽器操作 `/tasks`、`/tasks/create` 等頁面。

> 註：API 在回傳 `_id` 時，如果你啟用了 MongoDB，會是 Mongo 的 ObjectId（像 `64b7f2...`）；如果沒有連上 MongoDB，應用會使用記憶體示範資料，ID 為數字字串（`"1"`, `"2"`）。請以 API 回傳的 `_id` 為主，不要假設型別。

進階（在 shell 中直接取得新建立任務的 `_id` 並後續使用）：

- 使用 `jq`（推薦，需先安裝 `jq`）：

```bash
# 建立任務並把回傳的 `_id` 存到變數
created_id=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"title":"買牛奶","description":"到超市買一瓶","priority":"low","status":"pending"}' \
  http://localhost:3000/api/tasks | jq -r '._id')

# 使用變數去取得或操作任務
curl http://localhost:3000/api/tasks/$created_id
curl -X PUT -H "Content-Type: application/json" -d '{"status":"completed"}' http://localhost:3000/api/tasks/$created_id
curl -X DELETE http://localhost:3000/api/tasks/$created_id
```

- 不使用 `jq` 的簡單方法（回傳 JSON 原文，需要手動複製 `_id`）：

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"title":"買牛奶","description":"到超市買一瓶","priority":"low","status":"pending"}' \
  http://localhost:3000/api/tasks
# 從輸出中複製 _id，然後替換下面的 <TASK_ID>
curl http://localhost:3000/api/tasks/<TASK_ID>
```