Below is a **clean, fully‑renderable `README.md`** that fixes every syntax problem in your draft, adds the missing closing braces in `package.json`, and makes the document look professional on GitHub.

```markdown
# Task Manager – COMP3810 Group Project

> A full‑stack task‑management system with user roles, dashboard, admin CRUD, and a RESTful API.

---

## Project Info

| **Project Name** | Task Manager |
|------------------|--------------|
| **Group**        | Group 63 |
| **Members**      | **Name** – **SID** |
|                  | U Yat Long – 13901050 |
|                  | FUNG CHUN – 13479693 |
|                  | So Chak Lam – 13492330 |
|                  | Tse Cheuk Hin – 13485097 |

---

## Project Structure

### `server.js`
- Starts Express, configures middleware (`body‑parser`, sessions, static files).
- Connects to **MongoDB Atlas** via Mongoose.
- Routes:
  - Auth: `/login`, `/logout`
  - Views: `/dashboard`, `/admin/*`
  - **RESTful API**: `/api/tasks`, `/api/users`
- Listens on `process.env.PORT || 3000`.

### `package.json`
```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cookie-session": "^2.0.0",
    "csurf": "^1.11.0",
    "dotenv": "^17.2.3",
    "ejs": "^3.1.9",
    "express": "^4.18.2",
    "mongoose": "^7.5.0"
  },
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

### `public/` Folder
| File | Purpose |
|------|---------|
| `styles.css` | Global responsive styling |
| `script.js`  | Form validation & dynamic UI |
| `images/`    | Logo, icons, avatars |

### `views/` Folder
| File | Purpose |
|------|---------|
| `login.ejs` | Login form |
| `dashboard.ejs` | User dashboard with stats |
| `admin_users.ejs` | Admin – manage users |
| `admin_tasks.ejs` | Admin – manage tasks |
| `partials/dashbox.ejs` | Reusable metric card |

### `models/` Folder
| Model | Fields |
|-------|--------|
| `User.js` | `name`, `email`, `password` (hashed), `role` (`admin`/`user`) |
| `Task.js` | `title`, `description`, `priority`, `status`, `createdBy`, `assignedTo`, `dueDate` |

---

## Live Demo

[**https://comp3810-group-63-9qvf.onrender.com/login**](https://comp3810-group-63-9qvf.onrender.com/login)

> *Render free tier may spin‑down – wait 15‑30 s for the first request.*

---

## Operation Guide

### Login / Logout
1. Open the live URL.  
2. Use a **pre‑seeded account**:

   | Role | Email | Password |
   |------|-------|----------|
   | Admin | `admin@example.com` | `Admin123!` |
   | User  | `user1@example.com` | `User123!` |

3. Click **Login** → redirected to `/dashboard`.  
4. Click **Logout** (top‑right) → session cleared, back to login.

---

### Dashboard (`/dashboard`)
- Summary cards (via `dashbox.ejs`):
  - Total Tasks
  - Pending / Completed
  - My Tasks
- Admin navigation:
  - **[Users](#admin-users)** → `/admin/users`
  - **[Tasks](#admin-tasks)** → `/admin/tasks`

---

### Admin: Manage Users (`/admin/users`)
| Action | UI |
|--------|----|
| **Create** | **Add New User** button → form → submit |
| **Read**   | Table of all users |
| **Update** | **Edit** button → modify → save |
| **Delete** | **Delete** button → confirm |

---

### Admin: Manage Tasks (`/admin/tasks`)
| Action | UI |
|--------|----|
| **Create** | **Create Task** button → modal → submit |
| **Read**   | Table: title, status, assignee, due date |
| **Update** | **Edit** icon → update fields |
| **Delete** | **Trash** icon → confirm |

---

## RESTful API

> **All endpoints require authentication** – include the session cookie (`connect.sid`) obtained after login.

### Base URL
```
https://comp3810-group-63-9qvf.onrender.com
```

---

### 1. Tasks API – `/api/tasks` (Admin + Users)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/tasks` | Create a task |
| `GET`  | `/api/tasks` | List all tasks |
| `GET`  | `/api/tasks/:id` | Get one task |
| `PUT`  | `/api/tasks/:id` | Update task |
| `DELETE` | `/api/tasks/:id` | Delete task |

**Example payload (POST):**
```json
{
  "title": "Submit Assignment",
  "description": "COMP3810 final project",
  "priority": "high",
  "status": "pending",
  "assignedTo": "user1@example.com",
  "dueDate": "2025-12-10"
}
```

---

### 2. Users API – `/api/users` (**Admin only**)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/users` | List users |
| `GET`  | `/api/users/:id` | Get one user |
| `POST` | `/api/users` | Create user |
| `PUT`  | `/api/users/:id` | Update user |
| `DELETE` | `/api/users/:id` | Delete user |

---

## Test APIs with `curl`

1. **Log in** → DevTools → **Network** → copy the **Cookie** header (e.g. `connect.sid=s%3Aabc123...`).

### Create a Task
```bash
curl -X POST https://comp3810-group-63-9qvf.onrender.com/api/tasks \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "title": "Test via curl",
    "description": "API testing",
    "priority": "medium",
    "status": "pending",
    "assignedTo": "user1@example.com",
    "dueDate": "2025-12-15"
  }'
```

### List All Tasks
```bash
curl https://comp3810-group-63-9qvf.onrender.com/api/tasks \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

### Get One Task
```bash
curl https://comp3810-group-63-9qvf.onrender.com/api/tasks/692565709fbb0e4d6d0605fd \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

### Update Task
```bash
curl -X PUT https://comp3810-group-63-9qvf.onrender.com/api/tasks/692565709fbb0e4d6d0605fd \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{"status": "completed"}'
```

### Delete Task
```bash
curl -X DELETE https://comp3810-group-63-9qvf.onrender.com/api/tasks/692565709fbb0e4d6d0605fd \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express |
| Frontend | EJS, CSS, Vanilla JS |
| Database | MongoDB Atlas |
| Auth | `cookie-session` + `bcryptjs` |
| Deployment | Render.com |

---

*Built by Group 63 – COMP3810 Web Application Development*
