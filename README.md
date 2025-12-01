## Project info

- Project name: Task Manager
- Group: Group 63
- Students:
  - U Yat Long(SID:13901050)
  -  (SID: )
  - So Chak Lam (SID: 13492330)
  - Tse Cheuk Hin (SID: 13485097)

## Project file intro

### server.js

- Initializes the Express application, configures middleware (body parsing, static files, session/auth if applicable), and connects to the database.
- Defines routes for:
  - Login/logout and basic authentication checks.
  - Rendering EJS views such as dashboard pages and admin pages.
  - RESTful CRUD endpoints for main resources (e.g. users, events, tasks).
- Starts the HTTP server listening on the configured port (from environment variable or default 3000).

### package.json

- Contains project metadata (name, version, scripts).
- Main dependencies:
  - express: Web framework to handle routing and middleware.
  - ejs: Template engine for rendering UI views.
  - mongoose: Database access and schema definitions.
  - dotenv: Environment variable management.
  - express-session, bcrypt, etc., if you use sessions and password hashing.
- Includes npm scripts such as:
  - "start": Start the server with `node server.js`.
  - "dev": Start the server with a watcher like `nodemon`.

### public/ folder

- Stores static assets served directly by Express.
- Typical contents:
  - CSS files for layout and styling of dashboard and admin pages.
  - Client-side JavaScript for form validation, AJAX, or dynamic UI behavior.
  - Images/icons used in navigation, logo, or dashboard widgets.

### views/ folder

- Contains EJS templates for server-side rendered pages.
- Included files: 
  - dashboard.ejs: Main user dashboard, showing key panels/metrics and navigation to other features.
  - admin_users.ejs: Admin page to list, create, edit, and delete users.
  - dashbox.ejs: A reusable partial for dashboard boxes/cards embedded into the main dashboard or other pages.

### models/ folder

- Contains model definitions for interacting with the database.
- Typical model files:
  - User.js: Defines user schema, roles (admin/normal user), and authentication-related fields.
  - Event.js: Defines events/tasks schema if your project manages events.
  - Other domain models as required (e.g. Booking.js, Task.js).

## Cloud-based server URL

- Production/test URL:
  - https://comp3810-group-63-9qvf.onrender.com/login

## Operation guides (user flow)

### Login/Logout

1. Navigate to the cloud URL in a browser.
2. On the login page, enter one of the valid accounts, for example:
   - Admin: 
     - Username: admin@example.com
     - Password: Admin123!
   - Normal user:
     - Username: user1@example.com
     - Password: User123!
3. Click “Login” to authenticate and access the dashboard.
4. To log out, click the “Logout” button or link in the navigation bar to end the session and return to the login page.

### Using the dashboard and CRUD web pages

- Dashboard:
  - After login, the dashboard page (dashboard.ejs) displays key boxes/cards implemented using the dashbox partial, such as counts of users, events, or tasks.
  - Use the provided navigation links/buttons to access admin or resource-specific pages.
- Admin users (admin_users.ejs):
  - Create: Use the “Add User” button or form at the top/bottom of the page to submit new user details.
  - Read: The user list table shows existing users and their basic info.
  - Update: Click an “Edit” or “Update” button next to a user row, modify fields in the form, then submit.
  - Delete: Click a “Delete” button next to a user row to remove a user (confirm if a popup appears).


### RESTful CRUD services

Below is an example structure for your APIs. Replace resource names and paths with your actual routes.

- Base resource: /api/users
  - Create user:
    - Method: POST
    - Path: /api/users
    - Body: JSON with fields such as `{ "name": "...", "email": "...", "role": "admin" }`
  - Read all users:
    - Method: GET
    - Path: /api/users
  - Read single user:
    - Method: GET
    - Path: /api/users/:id
  - Update user:
    - Method: PUT
    - Path: /api/users/:id
    - Body: JSON with fields to update.
  - Delete user:
    - Method: DELETE
    - Path: /api/users/:id

Example curl commands (change host/paths as needed):

- Create user:
  - curl -X POST https://your-host/api/users \
    -H "Content-Type: application/json" \
    -d '{"name":"Test User","email":"test@example.com","role":"user"}'
- List users:
  - curl https://your-host/api/users
- Get one user:
  - curl https://your-host/api/users/USER_ID
- Update user:
  - curl -X PUT https://your-host/api/users/USER_ID \
    -H "Content-Type: application/json" \
    -d '{"name":"Updated Name"}'
- Delete user:
  - curl -X DELETE https://your-host/api/users/USER_ID

