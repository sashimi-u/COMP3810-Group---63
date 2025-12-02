# Task Manager - COMP3810 Group Project

> A full-stack task management system with user roles, dashboard, admin CRUD, and RESTful API.

---

## Project Info

- **Project Name**: Task Manager
- **Group**: Group 63
- **Members**:
  | Name | SID |
  |------|-----|
  | U Yat Long | 13901050 |
  | FUNG CHUN | 13479693 |
  | So Chak Lam | 13492330 |
  | Tse Cheuk Hin | 13485097 |

---

## Project Structure

### `server.js`
- Initializes Express app with middleware (`body-parser`, sessions, static files).
- Connects to **MongoDB Atlas** via Mongoose.
- Defines:
  - Authentication routes (`/login`, `/logout`)
  - EJS view routes (`/dashboard`, `/admin/*`)
  - **RESTful API** endpoints (`/api/tasks`, `/api/users`)
- Listens on `process.env.PORT || 3000`

### `package.json`
```json
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cookie-session": "^2.0.0",
    "csurf": "^1.11.0",
    "dotenv": "^17.2.3",
    "ejs": "^3.1.9",
    "express": "^4.18.2",
    "mongoose": "^7.5.0"


### `public/` Folder
- `styles.css` → Global responsive styling
- `script.js` → Form validation & dynamic UI
- `images/` → Logo, icons, avatars

### `views/` Folder
| File | Purpose |
|------|--------|
| `login.ejs` | Login form |
| `dashboard.ejs` | User dashboard with stats |
| `admin_users.ejs` | Admin: manage users |
| `admin_tasks.ejs` | Admin: manage tasks |
| `partials/dashbox.ejs` | Reusable metric card |

### `models/` Folder
| Model | Fields |
|-------|--------|
| `User.js` | `name`, `email`, `password` (hashed), `role` (`admin`/`user`) |
| `Task.js` | `title`, `description`, `priority`, `status`, `createdBy`, `assignedTo`, `dueDate` |

---

## Live Demo

[**https://comp3810-group-63-9qvf.onrender.com/login**](https://comp3810-group-63-9qvf.onrender.com/login)

---

## Operation Guide

### Login / Logout

1. Go to the live URL.
2. Use one of these **pre-seeded accounts**:

   | Role | Email | Password |
   |------|-------|----------|
   | Admin | `admin@example.com` | `Admin123!` |
   | User | `user1@example.com` | `User123!` |

3. Click **Login** → Redirect to `/dashboard`
4. Click **Logout** (top-right) → Back to login

---

### Dashboard (`/dashboard`)
- Displays **summary cards**:
  - Total Tasks
  - Pending / Completed
  - My Tasks
- Admin links:
  - [Users](#admin-users) → `/admin/users`
  - [Tasks](#admin-tasks) → `/admin/tasks`

---

### Admin: Manage Users (`/admin/users`)

| Action | How |
|-------|-----|
| **Create** | Click **"Add New User"** → Fill form → Submit |
| **Read** | Table shows all users |
| **Update** | Click **Edit** → Modify → Save |
| **Delete** | Click **Delete** → Confirm |

---

### Admin: Manage Tasks (`/admin/tasks`)

| Action | How |
|-------|-----|
| **Create** | Click **"Create Task"** → Fill modal → Submit |
| **Read** | Table: title, status, assignee, due date |
| **Update** | Click **Edit** → Update fields |
| **Delete** | Click **Trash** → Confirm |

---

## RESTful API

> **All API endpoints require authentication**  
> Use session cookie (`connect.sid`) from browser login.

### Base URL
```
https://comp3810-group-63-9qvf.onrender.com
```

---

### 1. Tasks API – `/api/tasks` (Admin + Users)

| Method | Endpoint | Description |
|--------|----------|-----------|
| `POST` | `/api/tasks` | Create task |
| `GET` | `/api/tasks` | List all tasks |
| `GET` | `/api/tasks/:id` | Get one task |
| `PUT` | `/api/tasks/:id` | Update task |
| `DELETE` | `/api/tasks/:id` | Delete task |

#### Example: Create Task
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

### 2. Users API – `/api/users` (**Admin Only**)

| Method | Endpoint | Description |
|--------|----------|-----------|
| `GET` | `/api/users` | List users |
| `GET` | `/api/users/:id` | Get user |
| `POST` | `/api/users` | Create user |
| `PUT` | `/api/users/:id` | Update user |
| `DELETE` | `/api/users/:id` | Delete user |

---

## Test APIs with `curl`

> **Step 1**: Log in → Open DevTools → Network → Copy **Cookie** header  
> Example: `connect.sid=s%3Aabc123...`

### Create Task
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
