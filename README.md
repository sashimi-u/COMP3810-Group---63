comp3810sef-group63 — Task Manager
Brief Description: This project is a task management example for COMP3810, built with Express.js + EJS templates and Mongoose (MongoDB). Features include user login/logout, task CRUD (web pages and API), and basic admin tools.
Quick Start

Install dependencies

Bashnpm install

Start MongoDB (if using a database)
Set the MONGO_URL environment variable (e.g., mongodb+srv://<user>:<password>@cluster0...).
Scripts and tools will explicitly error if MONGO_URL is not set. The main app prioritizes the environment variable or the config in models/scripts/config.json on startup.
Start the server

Bashnpm start
# For development, use nodemon (if installed)
npm run dev

Open the website

texthttp://localhost:3000
Note: The root route (/) now redirects to /login. Direct access to / will be redirected to the login page.
Main Pages

/login — Login page
/dashboard — Dashboard (login required)
/tasks — Task list (login required)
/tasks/create — Create task (login required)
/tasks/:id/edit — Edit task (login required)
/admin/tools — Admin tools (admin required)
/admin/users/list — Admin user list (admin required)

Users & Administration

Create a user (local script):

Bash# Example: Create user 'alice' with password 'alice'
node models/scripts/createUser.js alice alice

An ensureAdmin mechanism ensures a specific user is set as admin when the DB is available (set the ADMIN_USERNAME environment variable to specify the user).

Demo Login Removed

For security reasons, the original /demo-login route (allowing anonymous or quick demo account login with a simple password) has been removed.
If you need to create a demo account in development or testing, do not restore the old demo-login endpoint. Instead, use one of the following methods:
Use the dedicated script:
node models/scripts/createUser.js <username> <password> (see example above).
Or create accounts in a local seed script, limited to non-production environments (NODE_ENV !== 'production').

Note: To quickly log in as admin in development, first create an account using the script, then use the ensureAdmin mechanism or manually set the account as admin in the DB.

This avoids exposing weak password login points or uncontrolled demo accounts in production.
Visuals & Styling (using-css branch)

This project has two visual branches:
using-css (uses shared CSS)
not-using-css (minimal styling without external CSS)
You are currently on the using-css development branch.

Global styles are in public/css/style.css. Key conventions:
Button classes: .btn, .btn-primary, .btn-secondary, .btn-danger, .btn-success, .btn-ghost
Task cards: .task, .task-meta, .pill (for priority/status)
Create/edit pages use segmented radio buttons (.segmented) styled as colored buttons


API (Examples)

GET /api/tasks — Get all tasks
GET /api/tasks/:id — Get a single task
POST /api/tasks — Create a task
PUT /api/tasks/:id — Update a task
DELETE /api/tasks/:id — Delete a task

Below are curl examples for CLI testing. Note: Some admin or protected routes require a valid session/cookie or prior login.
Example: Create a task (POST)
Bashcurl -X POST -H "Content-Type: application/json" \
  -d '{"title":"Buy milk","description":"Get a bottle from the supermarket","priority":"low","status":"pending"}' \
  http://localhost:3000/api/tasks
Example: Get all tasks (GET)
Bashcurl http://localhost:3000/api/tasks
Example: Get a single task (GET)
Bashcurl http://localhost:3000/api/tasks/<TASK_ID>
Example: Update a task (PUT)
Bashcurl -X PUT -H "Content-Type: application/json" \
  -d '{"status":"in-progress","priority":"high"}' \
  http://localhost:3000/api/tasks/<TASK_ID>
Example: Delete a task (DELETE)
Bashcurl -X DELETE http://localhost:3000/api/tasks/<TASK_ID>
Example: Register (form-encoded)
Bashcurl -X POST -d "username=newuser&password=secret" http://localhost:3000/register
Example: Login (form-encoded)
Bashcurl -X POST -d "username=alice&password=alice" -c cookies.txt http://localhost:3000/login

Note: The -c cookies.txt flag saves the server’s cookie to a file. For subsequent authenticated calls (e.g., admin APIs), use -b cookies.txt:

Bash# Example: Access admin user list with logged-in cookies (admin required)
curl -b cookies.txt http://localhost:3000/admin/users
These examples are for local or CI testing. In production or public environments, always use HTTPS and proper authentication to protect credentials and cookies.
Admin User Page

Added a server-rendered admin users page: /admin/users/list, displaying all users (admin access required).
The original JSON API /admin/users remains available for AJAX or programmatic use.

Common Issues / Development Notes

If you get EADDRINUSE (port in use):

Bashlsof -i :3000
# Kill the process
kill <PID>
# Or start on a different port
PORT=3001 npm start

If MongoDB is unavailable, the app falls back to in-memory demo data (login will be disabled — ensure DB connection to enable user login).

Key Files

server.js — Routes, authentication (cookie-session + bcrypt), data access (Mongoose + in-memory fallback)
models/ — User.js, Task.js (Mongoose schemas)
views/ — EJS templates (includes views/partials: header, sidebar, dashbox)
public/css/style.css — Global styles (buttons, tables, task cards, responsive layout)
models/scripts/createUser.js — CLI user creation (bcrypt)
