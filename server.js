const express = require('express');
const mongoose = require('mongoose');
const cookieSession = require('cookie-session');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'models', '.env') });

const bcrypt = require('bcryptjs');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT;
const MONGO_URL = process.env.MONGO_URL;
// Safe defaults: some deployments (e.g. Render) provide env vars directly.
// Avoid referencing an undefined `config` object which causes a crash on startup.
const sessionKeys = process.env.SESSION_KEYS ? process.env.SESSION_KEYS.split(',') : ['change-me-session-key'];
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cookieSession({
  name: 'session',
  keys: sessionKeys,
  maxAge: 24 * 60 * 1000
}));
// flash (session-backed)
app.use(require('./models/middleware/flash'));

// CSRF filter (skip API routes)
app.use(require('./models/middleware/csrfFilter'));

// expose csrf token and demo flag to views
app.use(require('./models/middleware/exposeLocals'));

const serverStartId = Date.now().toString();

// Middleware: if the client's session was created under a different server start,
// clear the cookie-session so clients are forced to re-authenticate.
app.use(require('./models/middleware/serverStartGuard')(serverStartId));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const Task = require('./models/Task');
const { ensureAdminAtStartup } = require('./models/ensureAdmin');
const User = require('./models/User');

// In-memory tracking of online users: username -> lastActive timestamp
// Note: This is ephemeral and resets when server restarts.
const onlineUsers = new Map();
// Middleware to refresh lastActive for authenticated users on each request
const refreshLastActive = require('./models/middleware/refreshLastActive')(onlineUsers);
app.use(refreshLastActive);

// ...existing code...
mongoose.connect(MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ MongoDB connected');
  // Ensure the configured admin user is actually admin when DB is ready
  ensureAdminAtStartup(ADMIN_USERNAME);
}).catch(err => {
  console.error('❌ MongoDB connection failed:', err);
  process.exit(1);
});

// web UI routes (unchanged)
app.get('/', (req, res) => {
  // Redirect root to the login page (per UX request)
  return res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// Registration routes
app.get('/register', (req, res) => {
  res.render('register', { error: null });
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.render('register', { error: 'Username and password are required' });
  }
  try {
    const existing = await User.findOne({ username });
    if (existing) return res.render('register', { error: 'Username already taken' });

    const user = new User({ username, password, role: 'normal' });
    await user.save();
    return res.redirect('/login');
  } catch (err) {
    console.error('Register error:', err);
    return res.render('register', { error: 'Registration failed' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Authenticate against the users collection in the database only

  try {
    const user = await User.findOne({ username });
    if (!user) return res.render('login', { error: 'Invalid credentials' });

    const match = user.comparePassword(password);
    if (!match) return res.render('login', { error: 'Invalid credentials' });

    req.session = req.session || {};
    req.session.user = { username: user.username, role: user.role, _id: user._id.toString() };
    const redirectTo = (req.session && req.session.returnTo) ? req.session.returnTo : '/dashboard';
    req.session.returnTo = null;
    return res.redirect(redirectTo);
  } catch (err) {
    console.error('Login error:', err);
    return res.render('login', { error: 'Login failed' });
  }
});

// Demo login removed for security; development/demo accounts
// should be created via `scripts/` or a dedicated admin flow.

app.get('/tasks', async (req, res) => {
  if (!req.session || !req.session.user) return res.redirect('/login');
  
  try {
    const tasks = await Task.find();
    return res.render('tasks', { tasks: tasks, user: req.session ? req.session.user : null });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return res.status(500).render('tasks', { tasks: [], user: req.session ? req.session.user : null, pageError: 'Unable to fetch tasks' });
  }
});

// simple auth middleware
const requireAuth = require('./models/middleware/requireAuth');

// admin-only middleware
const requireAdmin = require('./models/middleware/requireAdmin');

// Dashboard page
app.get('/dashboard', requireAuth, async (req, res) => {
  try {
    let total, pending, inProgress, completed;
    total = await Task.countDocuments();
    pending = await Task.countDocuments({ status: 'pending' });
    inProgress = await Task.countDocuments({ status: 'in-progress' });
    completed = await Task.countDocuments({ status: 'completed' });

    res.render('dashboard', {
      user: req.session ? req.session.user : null,
      totalTasks: total,
      pendingCount: pending,
      inProgressCount: inProgress,
      completedCount: completed
    });
  } catch (err) {
    console.error('Error rendering dashboard:', err);
    res.render('dashboard', { user: req.session ? req.session.user : null });
  }
});

// Admin tools page (web UI)
app.get('/admin/tools', requireAdmin, (req, res) => {
  res.render('admin_tools', { user: req.session ? req.session.user : null });
});

// Create task (web UI)
app.get('/tasks/create', requireAuth, (req, res) => {
  res.render('create_task', { user: req.session ? req.session.user : null, error: null });
});

app.post('/tasks/create', requireAuth, async (req, res) => {
  const { title, description, priority = 'medium', status = 'pending', dueDate } = req.body;
  if (!title) return res.render('create_task', { user: req.session ? req.session.user : null, error: 'Title is required' });
  try {
    const createdBy = req.session && req.session.user ? req.session.user._id : undefined;
    const newTask = new Task({ title, description, priority, status, dueDate: dueDate || undefined, createdBy });
    await newTask.save();
    return res.redirect('/tasks');
  } catch (err) {
    res.render('create_task', { user: req.session ? req.session.user : null, error: 'Unable to create task' });
  }
});

// Edit task (web UI)
app.get('/tasks/:id/edit', requireAuth, async (req, res) => {
  const id = req.params.id;
  try {
    const task = await Task.findById(id);
    if (!task) return res.redirect('/tasks');
    return res.render('edit_task', { user: req.session ? req.session.user : null, task });
  } catch (err) {
    res.redirect('/tasks');
  }
});

app.post('/tasks/:id/update', requireAuth, async (req, res) => {
  const id = req.params.id;
  const update = req.body;
  try {
    await Task.findByIdAndUpdate(id, update);
    return res.redirect('/tasks');
  } catch (err) {
    res.redirect('/tasks');
  }
});

// Delete (web UI)
app.post('/tasks/:id/delete', requireAuth, async (req, res) => {
  const id = req.params.id;
  try {
    await Task.findByIdAndDelete(id);
    return res.redirect('/tasks');
  } catch (err) {
    res.redirect('/tasks');
  }
});

// Logout
app.post('/logout', (req, res) => {
  // clear cookie-session
  // mark user offline in in-memory tracking
  if (req.session && req.session.user && req.session.user.username) {
    onlineUsers.delete(req.session.user.username);
  }
  req.session = null;
  res.clearCookie('session');
  return res.redirect('/');
});

// JSON API routes
// GET all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await Task.find();
    return res.json(tasks);
  } catch (err) {
    return res.status(500).json({ error: 'Unable to fetch tasks' });
  }
});

// GET single task
app.get('/api/tasks/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    return res.json(task);
  } catch (err) {
    return res.status(500).json({ error: 'Unable to fetch task' });
  }
});

// POST create task
app.post('/api/tasks', async (req, res) => {
  const { title, description, priority = 'low', status = 'pending' } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  try {
    const createdBy = req.session && req.session.user ? req.session.user._id : undefined;
    const newTask = new Task({ title, description, priority, status, createdBy });
    const saved = await newTask.save();
    return res.status(201).json(saved);
  } catch (err) {
    return res.status(500).json({ error: 'Unable to create task' });
  }
});

// PUT update task
app.put('/api/tasks/:id', async (req, res) => {
  const id = req.params.id;
  const update = req.body;
  try {
    const updated = await Task.findByIdAndUpdate(id, update, { new: true });
    if (!updated) return res.status(404).json({ error: 'Task not found' });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: 'Unable to update task' });
  }
});

// DELETE task
app.delete('/api/tasks/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const deleted = await Task.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Task not found' });
    return res.json({ message: 'Deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Unable to delete task' });
  }
});

// Admin API: list all users, show online status
app.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}, 'username role createdAt');
    const list = users.map(u => ({
      username: u.username,
      role: u.role,
      createdAt: u.createdAt,
      online: onlineUsers.has(u.username),
      lastActive: onlineUsers.has(u.username) ? new Date(onlineUsers.get(u.username)).toISOString() : null
    }));
    return res.json({ count: list.length, users: list });
  } catch (err) {
    console.error('Admin users error:', err);
    return res.status(500).json({ error: 'Unable to fetch users' });
  }
});

// Rendered admin users page
app.get('/admin/users/list', requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}, 'username role createdAt');
    const list = users.map(u => ({
      username: u.username,
      role: u.role,
      createdAt: u.createdAt,
      online: onlineUsers.has(u.username),
      lastActive: onlineUsers.has(u.username) ? new Date(onlineUsers.get(u.username)).toISOString() : null
    }));
    return res.render('admin_users', { user: req.session ? req.session.user : null, users: list, hideInlineFlash: true });
  } catch (err) {
    console.error('Admin users page error:', err);
    return res.redirect('/admin/tools');
  }
});

// Delete a user (admin only)
app.post('/admin/users/delete', requireAdmin, async (req, res) => {
  try {
    const usernameToDelete = req.body && req.body.username;

    if (!usernameToDelete) {
      req.session = req.session || {};
      req.session.flash = { type: 'error', message: 'No username provided.' };
      return res.redirect('/admin/users/list');
    }

    // Prevent admin from deleting themselves
    const currentUser = req.session && req.session.user ? req.session.user.username : null;
    if (currentUser && currentUser === usernameToDelete) {
      req.session = req.session || {};
      req.session.flash = { type: 'error', message: 'Cannot delete your own admin account.' };
      return res.redirect('/admin/users/list');
    }

    const deleted = await User.findOneAndDelete({ username: usernameToDelete });
    req.session = req.session || {};
    if (!deleted) {
      req.session.flash = { type: 'error', message: 'User not found.' };
    } else {
      if (deleted && deleted.username) onlineUsers.delete(deleted.username);
      req.session.flash = { type: 'success', message: `Deleted user ${deleted.username}.` };
    }
    return res.redirect('/admin/users/list');
  } catch (err) {
    console.error('Admin delete user error:', err);
    req.session = req.session || {};
    req.session.flash = { type: 'error', message: 'Failed to delete user.' };
    return res.redirect('/admin/users/list');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
