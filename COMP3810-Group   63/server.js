// ...existing code...
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const TaskSchema = new mongoose.Schema({
  title: String,
  description: String,
  priority: String,
  status: String
});

const Task = mongoose.model('Task', TaskSchema);

// ...existing code...
let dbConnected = false;

// simple in-memory fallback data store
let inMemoryTasks = [
  { _id: '1', title: 'Sample Task 1', description: 'Database not available', priority: 'high', status: 'pending' },
  { _id: '2', title: 'Sample Task 2', description: 'Using demo data', priority: 'medium', status: 'in-progress' }
];

mongoose.connect('mongodb://localhost:27017/taskmanager', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  dbConnected = true;
  console.log('✅ MongoDB connected');
}).catch(err => {
  dbConnected = false;
  console.log('❌ MongoDB connection failed, using in-memory data');
});

// web UI routes (unchanged)
app.get('/', (req, res) => {
  res.send(`
    <h1>Task Manager Server is Working! ✅</h1>
    <p><a href="/login">Go to Login Page</a></p>
  `);
});

app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'password') {
    req.session.user = { username: 'admin' };
    return res.redirect('/tasks');
  }
  res.render('login', { error: 'Invalid credentials' });
});

app.get('/tasks', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  
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
  
  res.render('tasks', { tasks: tasks, user: req.session.user });
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
      const newTask = { _id: String(Date.now()), title, description, priority, status };
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
// ...existing code...