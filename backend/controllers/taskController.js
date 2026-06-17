const TaskModel = require('../models/taskModel');

const VALID_PRIORITIES = ['Low', 'Medium', 'High'];
const VALID_STATUSES = ['To Do', 'In Progress', 'Completed'];

const errorResponse = (res, statusCode, errorCode, message, description = null) => {
  return res.status(statusCode).json({
    errorCode,
    message,
    description
  });
};

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
        return errorResponse(res, 500, 'TASK_FETCH_ERROR', 'Failed to retrieve tasks', err.message);
      }
      res.status(200).json({ success: true, data: results });
    });
  },

  getTaskById: (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return errorResponse(res, 400, 'INVALID_TASK_ID', 'Invalid task ID', 'Task ID must be a valid number');
    }

    TaskModel.getTaskById(id, (err, results) => {
      if (err) {
        return errorResponse(res, 500, 'TASK_FETCH_ERROR', 'Failed to retrieve task', err.message);
      }
      if (results.length === 0) {
        return errorResponse(res, 404, 'TASK_NOT_FOUND', 'Task not found', `No task found with ID ${id}`);
      }
      res.status(200).json({ success: true, data: results[0] });
    });
  },

  createTask: (req, res) => {
    const { title, description, project_id, due_date, priority, status, created_by } = req.body;

    if (!title) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'Title is required', 'Task title cannot be empty');
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid priority value', `Priority must be one of: ${VALID_PRIORITIES.join(', ')}`);
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid status value', `Status must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    if (due_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(due_date);
      if (dueDate < today) {
        return errorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid due date', 'Due date cannot be in the past');
      }
    }

    const taskData = {
      title,
      description,
      project_id,
      due_date,
      priority: priority || 'Medium',
      status: status || 'To Do',
      created_by
    };

    TaskModel.createTask(taskData, (err, result) => {
      if (err) {
        return errorResponse(res, 500, 'TASK_CREATE_ERROR', 'Failed to create task', err.message);
      }
      res.status(201).json({ success: true, message: 'Task created successfully', taskId: result.insertId });
    });
  },

  updateTask: (req, res) => {
    const { id } = req.params;
    const { title, description, due_date, priority, status } = req.body;

    if (!id || isNaN(id)) {
      return errorResponse(res, 400, 'INVALID_TASK_ID', 'Invalid task ID', 'Task ID must be a valid number');
    }

    if (!title) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'Title is required', 'Task title cannot be empty');
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid priority value', `Priority must be one of: ${VALID_PRIORITIES.join(', ')}`);
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid status value', `Status must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    const taskData = { title, description, due_date, priority, status };

    TaskModel.updateTask(id, taskData, (err, result) => {
      if (err) {
        return errorResponse(res, 500, 'TASK_UPDATE_ERROR', 'Failed to update task', err.message);
      }
      if (result.affectedRows === 0) {
        return errorResponse(res, 404, 'TASK_NOT_FOUND', 'Task not found', `No task found with ID ${id}`);
      }
      res.status(200).json({ success: true, message: 'Task updated successfully' });
    });
  },

  deleteTask: (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return errorResponse(res, 400, 'INVALID_TASK_ID', 'Invalid task ID', 'Task ID must be a valid number');
    }

    TaskModel.deleteTask(id, (err, result) => {
      if (err) {
        return errorResponse(res, 500, 'TASK_DELETE_ERROR', 'Failed to delete task', err.message);
      }
      if (result.affectedRows === 0) {
        return errorResponse(res, 404, 'TASK_NOT_FOUND', 'Task not found', `No task found with ID ${id}`);
      }
      res.status(200).json({ success: true, message: 'Task deleted successfully' });
    });
  }

};

module.exports = TaskController;