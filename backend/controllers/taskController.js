const TaskModel = require('../models/taskModel');

// Valid values
const VALID_PRIORITIES = ['Low', 'Medium', 'High'];
const VALID_STATUSES = ['To Do', 'In Progress', 'Completed'];

const TaskController = {

  getAllTasks: (req, res) => {
    const filters = {
      status: req.query.status || null,
      priority: req.query.priority || null,
      assigned_to: req.query.assigned_to || null,
      sortBy: req.query.sortBy || 'created_at',
      sortOrder: req.query.sortOrder || 'desc'
    };

    TaskModel.getAllTasks(filters, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to get tasks', message: err.message });
      }
      res.status(200).json({ success: true, data: results });
    });
  },

  getTaskById: (req, res) => {
    const { id } = req.params;
    TaskModel.getTaskById(id, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to get task', message: err.message });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.status(200).json({ success: true, data: results[0] });
    });
  },

  createTask: (req, res) => {
    const { title, description, assigned_to, project_id, due_date, priority, status, created_by } = req.body;

    // Validation
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: 'Priority must be Low, Medium, or High' });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Status must be To Do, In Progress, or Completed' });
    }

    if (due_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(due_date);
      if (dueDate < today) {
        return res.status(400).json({ error: 'Due date cannot be in the past' });
      }
    }

    const taskData = {
      title,
      description,
      assigned_to,
      project_id,
      due_date,
      priority: priority || 'Medium',
      status: status || 'To Do',
      created_by
    };

    TaskModel.createTask(taskData, (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to create task', message: err.message });
      }
      res.status(201).json({ success: true, message: 'Task created successfully', taskId: result.insertId });
    });
  },

  updateTask: (req, res) => {
    const { id } = req.params;
    const { title, description, assigned_to, due_date, priority, status } = req.body;

    // Validation
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: 'Priority must be Low, Medium, or High' });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Status must be To Do, In Progress, or Completed' });
    }

    const taskData = { title, description, assigned_to, due_date, priority, status };

    TaskModel.updateTask(id, taskData, (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to update task', message: err.message });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.status(200).json({ success: true, message: 'Task updated successfully' });
    });
  },

  deleteTask: (req, res) => {
    const { id } = req.params;
    TaskModel.deleteTask(id, (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete task', message: err.message });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.status(200).json({ success: true, message: 'Task deleted successfully' });
    });
  }

};

module.exports = TaskController;