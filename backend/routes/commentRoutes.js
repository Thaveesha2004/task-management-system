const express = require('express');
const router = express.Router();
const CommentController = require('../controllers/commentController');
const roleMiddleware = require('../middleware/roleMiddleware');

/**
 * @swagger
 * /api/comments/{task_id}:
 *   get:
 *     summary: Get all comments for a task
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: task_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     responses:
 *       200:
 *         description: List of comments
 *       500:
 *         description: Server error
 */
router.get('/:task_id', roleMiddleware.isCollaboratorOrAbove, CommentController.getCommentsByTask);

/**
 * @swagger
 * /api/comments:
 *   post:
 *     summary: Add a comment to a task
 *     tags: [Comments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - task_id
 *               - user_id
 *               - content
 *             properties:
 *               task_id:
 *                 type: integer
 *               user_id:
 *                 type: integer
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment added successfully
 *       400:
 *         description: Validation error
 */
router.post('/', roleMiddleware.isCollaboratorOrAbove, CommentController.addComment);

/**
 * @swagger
 * /api/comments/{id}:
 *   delete:
 *     summary: Delete a comment
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Comment ID
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *       404:
 *         description: Comment not found
 */
router.delete('/:id', roleMiddleware.isProjectManager, CommentController.deleteComment);

module.exports = router;