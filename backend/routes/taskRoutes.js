const express = require('express');
const router = express.Router();
const TaskController = require('../controllers/taskController');

// Get all tasks
router.get('/', TaskController.getAllTasks);

// Get single task
router.get('/:id', TaskController.getTaskById);

// Create task
router.post('/', TaskController.createTask);

// Update task
router.put('/:id', TaskController.updateTask);

// Delete task
router.delete('/:id', TaskController.deleteTask);

module.exports = router;