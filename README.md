# Task Manager - COMP3810 Group Project

## Project info

- **Project name**: Task Manager
- **Group**: Group 63
- **Students**:
  - U Yat Long (SID: 13901050)
  - FUNG CHUN (SID: 13479693)
  - So Chak Lam (SID: 13492330)
  - Tse Cheuk Hin (SID: 13485097)

---

## Project file intro

### server.js

- Initializes the Express application, configures middleware (body parsing, static files, session/auth), and connects to MongoDB via Mongoose.
- Defines routes for:
  - Login/logout and authentication middleware.
  - Rendering EJS views (dashboard, admin pages).
  - **RESTful CRUD APIs** for `tasks` and `users` (admin only).
- Starts the server on `process.env.PORT || 3000`.

### package.json

- Project metadata and scripts.
- Key dependencies:
  - `express`: Web framework.
  - `ejs`: View engine.
  - `mongoose`: MongoDB ODM.
  - `dotenv`: Environment config.
  - `express-session`, `connect-mongo`: Session management.
  - `bcrypt`: Password hashing.
  - `cors` (optional, for API testing).
- Scripts:
  ```json
  "start": "node server.js",
  "dev": "nodemon server.js"
public/ folder
	•	Static assets served directly.
	•	Contains:
	◦	styles.css: Global styling for dashboard, forms, and tables.
	◦	script.js: Client-side form validation and dynamic updates.
	◦	images/: App logo, icons, and UI assets.
views/ folder
	•	EJS templates for server-rendered pages.
	•	Included files:
	◦	login.ejs: Login form.
	◦	dashboard.ejs: Main user dashboard with task summary cards.
	◦	admin_users.ejs: Admin panel to manage users (CRUD).
	◦	admin_tasks.ejs: Admin panel to manage tasks (CRUD).
	◦	partials/dashbox.ejs: Reusable card component for dashboard metrics.
models/ folder
	•	Mongoose schema definitions.
	•	Model files:
	◦	User.js: Schema with name, email, password (hashed), role (admin/user).
	◦	Task.js: Schema with title, description, status (pending/completed), assignedTo (User ref), dueDate.

Cloud-based server URL
Live Demo: [https://comp3810-group63.onrender.com/login](https://comp3810-group-63-9qvf.onrender.com/login)

Operation guides (user flow)
Login/Logout
	1	Open the live URL in your browser.
	2	Use one of the pre-seeded accounts:
	◦	Admin:
	▪	Username: admin@example.com
	▪	Password: Admin123!
	◦	Normal User:
	▪	Username: user1@example.com
	▪	Password: User123!
	3	Click Login → redirected to /dashboard.
	4	Click Logout (top-right nav) → session destroyed, back to login.

Using the Dashboard and CRUD Web Pages
Dashboard (`dashboard.ejs`)
	•	Shows summary cards (via dashbox.ejs):
	◦	Total Tasks, Pending, Completed, Assigned to Me.
	•	Navigation links:
	◦	Admin → Users: /admin/users (admin only)
	◦	Admin → Tasks: /admin/tasks (admin only)
Admin: Manage Users (`admin_users.ejs`)
Action
UI Element
Create
“Add New User” button → opens form → submit
Read
Table lists all users (email, name, role)
Update
“Edit” button per row → inline form → save
Delete
“Delete” button per row → confirm dialog
Admin: Manage Tasks (`admin_tasks.ejs`)
Action
UI Element
Create
“Create Task” button → modal/form
Read
Table with title, status, assignee, due date
Update
“Edit” icon → edit row or modal
Delete
“Trash” icon → confirm

RESTful CRUD Services
All API endpoints require authentication. You must be logged in via the web UI first. The session cookie (connect.sid) is sent automatically in browser requests. For curl, include the cookie after logging in (copy from browser DevTools → Network → any request → “Cookie” header).
Base URL
[https://comp3810-group63.onrender.com](https://comp3810-group-63-9qvf.onrender.com/login)

1. Tasks API (`/api/tasks`) – Admin + Authenticated Users
Method
Endpoint
Description
Body (JSON)
POST
/api/tasks
Create a new task
{ "title": "Finish report", "description": "...", "status": "pending", "assignedTo": "user1@example.com", "dueDate": "2025-12-10" }
GET
/api/tasks
List all tasks (filterable: ?status=pending)
—
GET
/api/tasks/:id
Get one task
—
PUT
/api/tasks/:id
Update task
{ "title": "Updated", "status": "completed" }
DELETE
/api/tasks/:id
Delete task
—

2. Users API (`/api/users`) – Admin Only
Method
Endpoint
Description
Body (JSON)
GET
/api/users
List all users
—
GET
/api/users/:id
Get one user
—
POST
/api/users
Create user (admin)
{ "name": "John", "email": "john@example.com", "password": "Pass123!", "role": "user" }
PUT
/api/users/:id
Update user
{ "name": "John Doe", "role": "admin" }
DELETE
/api/users/:id
Delete user
—

How to Test APIs with `curl`
Step 1: Log in via browser → open DevTools → Network tab → reload → copy Cookie header from any request.
Example Cookie:
connect.sid=s%3Aabc123...xyz

Create a Task
curl -X POST https://comp3810-group63.onrender.com/api/tasks \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE_HERE" \
  -d '{
    "title": "API Test Task",
    "description": "Created via curl",
    "status": "pending",
    "assignedTo": "user1@example.com",
    "dueDate": "2025-12-15"
  }'
List All Tasks
curl https://comp3810-group63.onrender.com/api/tasks \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE_HERE"
Get One Task
curl https://comp3810-group63.onrender.com/api/tasks/675a1b2c3d4e5f6789abc123 \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE_HERE"
Update Task
curl -X PUT https://comp3810-group63.onrender.com/api/tasks/675a1b2c3d4e5f6789abc123 \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE_HERE" \
  -d '{"status": "completed"}'
Delete Task
curl -X DELETE https://comp3810-group63.onrender.com/api/tasks/675a1b2c3d4e5f6789abc123 \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE_HERE"

Task Manager is built with Express, EJS, MongoDB Atlas, and deployed on Render.
---
