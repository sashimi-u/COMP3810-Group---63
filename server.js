const express = require('express');
const mongoose = require('mongoose');
const cookieSession = require('cookie-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const app = express();

// Load optional JSON config from `scripts/config.json`. Environment variables
// take precedence. This allows quick local customization without changing code.
let config = {};
try {
  const cfgPath = path.join(__dirname, 'scripts', 'config.json');
  if (fs.existsSync(cfgPath)) {
    const raw = fs.readFileSync(cfgPath, 'utf8');
    config = JSON.parse(raw || '{}');
  }
} catch (err) {
  console.warn('Warning: failed to read scripts/config.json — using defaults or env vars');
}

const PORT = process.env.PORT || config.port || 3000;
const MONGO_URL = process.env.MONGO_URL || config.mongoUrl || 'mongodb://localhost:27017/taskmanager';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || config.adminUsername || 'admin';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cookieSession({
  name: 'session',
  keys: process.env.SESSION_KEYS ? process.env.SESSION_KEYS.split(',') : (config.sessionKeys || ['your-secret-key']),
  // 24 hours
  maxAge: 24 * 60 * 60 * 1000
}));

// Unique identifier for this server process start. When the server restarts
// this value changes — we'll use it to detect a restart on the client side
// (stored in the client's cookie session) and clear the client's cookie
// so stale sessions are removed after a server restart.
const serverStartId = Date.now().toString();

// Middleware: if the client's session was created under a different server
// start (i.e. server was restarted), clear the cookie-session so clients
// are forced to re-authenticate. For unauthenticated clients we just set
// a marker so they won't be repeatedly cleared on every request.
app.use((req, res, next) => {
  try {
    const clientServerId = req.session && req.session._serverStart;

    if (clientServerId !== serverStartId) {
      // If the client had an authenticated session (e.g. `user`), clear it
      if (req.session && req.session.user) {
        req.session = null;
        res.clearCookie('session');
      } else {
        // For unauthenticated clients, add the current server marker so
        // we don't clear them repeatedly on subsequent requests.
        req.session = req.session || {};
        req.session._serverStart = serverStartId;
      }
    }
  } catch (err) {
    // If anything goes wrong with reading/clearing the session, continue
    // without blocking the request.
  }
  next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const TaskSchema = new mongoose.Schema({
  title: String,
  description: String,
  priority: String,
  status: String
});

const Task = mongoose.model('Task', TaskSchema);
const { ensureAdminAtStartup } = require('./models/ensureAdmin');
const User = require('./models/User');

// In-memory tracking of online users: username -> lastActive timestamp
// Note: This is ephemeral and resets when server restarts.
const onlineUsers = new Map();

// Middleware to refresh lastActive for authenticated users on each request
function refreshLastActive(req, res, next) {
  if (req.session && req.session.user && req.session.user.username) {
    onlineUsers.set(req.session.user.username, Date.now());
  }
  next();
}
app.use(refreshLastActive);

// ...existing code...
let dbConnected = false;

// simple in-memory fallback data store
let inMemoryTasks = [
  { _id: '1', title: 'Sample Task 1', description: 'Database not available', priority: 'high', status: 'pending' },
  { _id: '2', title: 'Sample Task 2', description: 'Using demo data', priority: 'medium', status: 'in-progress' }
];

// Return next sequential `_id` for in-memory tasks (keeps IDs numeric strings)
function getNextInMemoryId() {
  const nums = inMemoryTasks
    .map(t => parseInt(t._id, 10))
    .filter(n => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return String(max + 1);
}

mongoose.connect(MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  dbConnected = true;
  console.log('✅ MongoDB connected');
  // Ensure the configured admin user is actually admin when DB is ready
  ensureAdminAtStartup(ADMIN_USERNAME);
}).catch(err => {
  dbConnected = false;
  console.log('❌ MongoDB connection failed, using in-memory data');
});

// web UI routes (unchanged)
app.get('/', (req, res) => {
  // Redirect root to the login page (per UX request)
  return res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Authenticate against the users collection in the database only
  if (!dbConnected) {
    // If there's no DB connection, do not allow login (no hardcoded fallback)
    return res.render('login', { error: 'Login unavailable: database not connected' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) return res.render('login', { error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.render('login', { error: 'Invalid credentials' });

    req.session = req.session || {};
    req.session.user = { username: user.username, role: user.role };
    const redirectTo = (req.session && req.session.returnTo) ? req.session.returnTo : '/dashboard';
    req.session.returnTo = null;
    return res.redirect(redirectTo);
  } catch (err) {
    console.error('Login error:', err);
    return res.render('login', { error: 'Login failed' });
  }
});

app.get('/tasks', async (req, res) => {
  if (!req.session || !req.session.user) return res.redirect('/login');
  
  let tasks;
  try {
    if (dbConnected) {
      tasks = await Task.find();
    } else {
      tasks = inMemoryTasks;
    }
  } catch (error) {
    tasks = inMemoryTasks;
  }
  
  res.render('tasks', { tasks: tasks, user: req.session ? req.session.user : null });
});

// simple auth middleware
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    // remember the originally requested URL so we can return after login
    req.session = req.session || {};
    req.session.returnTo = req.originalUrl;
    return res.redirect('/login');
  }
  next();
}

// admin-only middleware
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) return res.redirect('/login');
  if (!req.session.user.role || req.session.user.role !== 'admin') return res.status(403).send('Forbidden');
  next();
}

// Dashboard page
app.get('/dashboard', requireAuth, async (req, res) => {
  try {
    let total = 0, pending = 0, inProgress = 0, completed = 0;

    if (dbConnected) {
      total = await Task.countDocuments();
      pending = await Task.countDocuments({ status: 'pending' });
      inProgress = await Task.countDocuments({ status: 'in-progress' });
      completed = await Task.countDocuments({ status: 'completed' });
    } else {
      const tasks = inMemoryTasks || [];
      total = tasks.length;
      pending = tasks.filter(t => t.status === 'pending').length;
      inProgress = tasks.filter(t => t.status === 'in-progress').length;
      completed = tasks.filter(t => t.status === 'completed').length;
    }

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
    if (dbConnected) {
      const newTask = new Task({ title, description, priority, status, dueDate: dueDate || undefined });
      await newTask.save();
    } else {
      const newTask = { _id: getNextInMemoryId(), title, description, priority, status };
      inMemoryTasks.push(newTask);
    }
    res.redirect('/tasks');
  } catch (err) {
    res.render('create_task', { user: req.session ? req.session.user : null, error: 'Unable to create task' });
  }
});

// Edit task (web UI)
app.get('/tasks/:id/edit', requireAuth, async (req, res) => {
  const id = req.params.id;
  try {
    let task;
    if (dbConnected) {
      task = await Task.findById(id);
      if (!task) return res.redirect('/tasks');
    } else {
      task = inMemoryTasks.find(t => t._id === id);
      if (!task) return res.redirect('/tasks');
    }
    res.render('edit_task', { user: req.session ? req.session.user : null, task });
  } catch (err) {
    res.redirect('/tasks');
  }
});

app.post('/tasks/:id/update', requireAuth, async (req, res) => {
  const id = req.params.id;
  const update = req.body;
  try {
    if (dbConnected) {
      await Task.findByIdAndUpdate(id, update);
    } else {
      const idx = inMemoryTasks.findIndex(t => t._id === id);
      if (idx !== -1) inMemoryTasks[idx] = { ...inMemoryTasks[idx], ...update };
    }
    res.redirect('/tasks');
  } catch (err) {
    res.redirect('/tasks');
  }
});

// Delete (web UI)
app.post('/tasks/:id/delete', requireAuth, async (req, res) => {
  const id = req.params.id;
  try {
    if (dbConnected) {
      await Task.findByIdAndDelete(id);
    } else {
      const idx = inMemoryTasks.findIndex(t => t._id === id);
      if (idx !== -1) inMemoryTasks.splice(idx, 1);
    }
    res.redirect('/tasks');
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
    if (dbConnected) {
      const tasks = await Task.find();
      return res.json(tasks);
    } else {
      return res.json(inMemoryTasks);
    }
  } catch (err) {
    return res.status(500).json({ error: 'Unable to fetch tasks' });
  }
});

// GET single task
app.get('/api/tasks/:id', async (req, res) => {
  const id = req.params.id;
  try {
    if (dbConnected) {
      const task = await Task.findById(id);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      return res.json(task);
    } else {
      const task = inMemoryTasks.find(t => t._id === id);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      return res.json(task);
    }
  } catch (err) {
    return res.status(500).json({ error: 'Unable to fetch task' });
  }
});

// POST create task
app.post('/api/tasks', async (req, res) => {
  const { title, description, priority = 'low', status = 'pending' } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  try {
    if (dbConnected) {
      const newTask = new Task({ title, description, priority, status });
      const saved = await newTask.save();
      return res.status(201).json(saved);
    } else {
      const newTask = { _id: getNextInMemoryId(), title, description, priority, status };
      inMemoryTasks.push(newTask);
      return res.status(201).json(newTask);
    }
  } catch (err) {
    return res.status(500).json({ error: 'Unable to create task' });
  }
});

// PUT update task
app.put('/api/tasks/:id', async (req, res) => {
  const id = req.params.id;
  const update = req.body;
  try {
    if (dbConnected) {
      const updated = await Task.findByIdAndUpdate(id, update, { new: true });
      if (!updated) return res.status(404).json({ error: 'Task not found' });
      return res.json(updated);
    } else {
      const idx = inMemoryTasks.findIndex(t => t._id === id);
      if (idx === -1) return res.status(404).json({ error: 'Task not found' });
      inMemoryTasks[idx] = { ...inMemoryTasks[idx], ...update };
      return res.json(inMemoryTasks[idx]);
    }
  } catch (err) {
    return res.status(500).json({ error: 'Unable to update task' });
  }
});

// DELETE task
app.delete('/api/tasks/:id', async (req, res) => {
  const id = req.params.id;
  try {
    if (dbConnected) {
      const deleted = await Task.findByIdAndDelete(id);
      if (!deleted) return res.status(404).json({ error: 'Task not found' });
      return res.json({ message: 'Deleted' });
    } else {
      const idx = inMemoryTasks.findIndex(t => t._id === id);
      if (idx === -1) return res.status(404).json({ error: 'Task not found' });
      inMemoryTasks.splice(idx, 1);
      return res.json({ message: 'Deleted' });
    }
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
    return res.render('admin_users', { user: req.session ? req.session.user : null, users: list });
  } catch (err) {
    console.error('Admin users page error:', err);
    return res.redirect('/admin/tools');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
