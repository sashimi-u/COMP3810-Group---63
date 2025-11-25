const express = require('express');
const mongoose = require('mongoose');
const cookieSession = require('cookie-session');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'models', '.env') });

const bcrypt = require('bcryptjs');
const fs = require('fs');
const csurf = require('csurf');
const app = express();
const PORT = process.env.PORT;
const MONGO_URL = process.env.MONGO_URL;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || config.adminUsername || 'admin';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cookieSession({
  name: 'session',
  keys: process.env.SESSION_KEYS ? process.env.SESSION_KEYS.split(',') : (config.sessionKeys),
  maxAge: 24 * 60 * 1000
}));

// Simple flash middleware (session-backed)
app.use((req, res, next) => {
  res.locals.flash = req.session && req.session.flash ? req.session.flash : null;
  if (req.session) delete req.session.flash;
  next();
});

// Apply CSRF middleware for non-API routes only
const csrfProtection = csurf();
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  return csrfProtection(req, res, next);
});

// expose csrf token to views
app.use((req, res, next) => {
  try {
    res.locals.csrfToken = req.csrfToken();
  } catch (e) {
    res.locals.csrfToken = undefined;
  }
  next();
});

// expose a convenient variable to templates to show demo buttons only in non-production
app.use((req, res, next) => {
  res.locals.showDemo = process.env.NODE_ENV !== 'production';
  next();
});

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
let dbConnected = false;

// simple in-memory fallback data store
let inMemoryTasks = [
  { _id: '1', title: 'Sample Task 1', description: 'Database not available', priority: 'high', status: 'pending' },
  { _id: '2', title: 'Sample Task 2', description: 'Using demo data', priority: 'medium', status: 'in-progress' }
];

// Helper: Return next sequential `_id` for in-memory tasks (keeps IDs numeric strings)
const getNextInMemoryId = require('./models/helpers/getNextInMemoryId');

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

// Registration routes
app.get('/register', (req, res) => {
  res.render('register', { error: null });
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!dbConnected) {
    return res.render('register', { error: 'Registration unavailable: database not connected' });
  }
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
  if (!dbConnected) {
    // If there's no DB connection, do not allow login (no hardcoded fallback)
    return res.render('login', { error: 'Login unavailable: database not connected' });
  }

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

// Demo login route for development/testing only
app.post('/demo-login', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).send('Demo login disabled in production');
    }

    const type = req.body.type;
    const demoUsername = type === 'admin' ? (process.env.ADMIN_USERNAME || 'admin') : 'alice';

    // Ensure the demo user exists (create if missing)
    const UserModel = require('./models/User');
    let user = await UserModel.findOne({ username: demoUsername });
    if (!user) {
      const demoPassword = type === 'admin' ? (process.env.ADMIN_PASSWORD || 'admin') : 'alice';
      const role = type === 'admin' ? 'admin' : 'normal';
      user = new UserModel({ username: demoUsername, password: demoPassword, role });
      await user.save();
      console.log(`Demo: created user ${demoUsername}`);
    }

    // Set session as authenticated user
    req.session = req.session || {};
    req.session.user = { username: user.username, role: user.role, _id: user._id.toString() };
    return res.redirect('/dashboard');
  } catch (err) {
    console.error('Demo login error:', err);
    return res.redirect('/login');
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
const requireAuth = require('./models/middleware/requireAuth');

// admin-only middleware
const requireAdmin = require('./models/middleware/requireAdmin');

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
      const createdBy = req.session && req.session.user ? req.session.user._id : undefined;
      const newTask = new Task({ title, description, priority, status, dueDate: dueDate || undefined, createdBy });
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
      const createdBy = req.session && req.session.user ? req.session.user._id : undefined;
      const newTask = new Task({ title, description, priority, status, createdBy });
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

    if (!dbConnected) {
      req.session = req.session || {};
      req.session.flash = { type: 'error', message: 'Cannot delete users while database is disconnected.' };
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
