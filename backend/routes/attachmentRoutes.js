const express = require('express');
const router = express.Router();
const AttachmentController = require('../controllers/attachmentController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { blockIfMustResetPassword } = require('../middleware/requirePasswordReset');
const upload = require('../middleware/uploadMiddleware');

const canView = requireRole('Admin', 'Project Manager', 'Collaborator');
const canUpload = requireRole('Admin', 'Project Manager', 'Collaborator');
const canDelete = requireRole('Admin', 'Project Manager');

// BE-15: first-login reset gate is applied to every attachment route (was missing here).

/**
 * @swagger
 * /api/attachments/upload:
 *   post:
 *     summary: Upload a file attachment to a task (multipart/form-data)
 *     tags: [Attachments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [task_id, file]
 *             properties:
 *               task_id:
 *                 type: integer
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Attachment uploaded
 *       400:
 *         description: Validation or unsupported file type
 *       403:
 *         description: No access to the task
 */
router.post(
  '/upload',
  verifyToken,
  blockIfMustResetPassword,
  canUpload,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        const message =
          err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 5 MB)' : err.message;
        return res.status(400).json({ errorCode: 'UPLOAD_ERROR', message });
      }
      next();
    });
  },
  AttachmentController.uploadAttachment
);

/**
 * @swagger
 * /api/attachments/download/{id}:
 *   get:
 *     summary: Download an attachment by id (served as application/octet-stream)
 *     tags: [Attachments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: File stream
 *       403:
 *         description: No access to the attachment
 *       404:
 *         description: Attachment not found
 */
router.get('/download/:id', verifyToken, blockIfMustResetPassword, canView, AttachmentController.downloadAttachment);

/**
 * @swagger
 * /api/attachments/{id}:
 *   delete:
 *     summary: Delete an attachment (Admin/PM)
 *     tags: [Attachments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Attachment deleted
 *       404:
 *         description: Attachment not found
 */
router.delete('/:id', verifyToken, blockIfMustResetPassword, canDelete, AttachmentController.deleteAttachment);

/**
 * @swagger
 * /api/attachments/{task_id}:
 *   get:
 *     summary: List attachments for a task (object-level authorized)
 *     tags: [Attachments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: task_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Attachment list
 *       403:
 *         description: No access to the task
 */
router.get('/:task_id', verifyToken, blockIfMustResetPassword, canView, AttachmentController.getAttachmentsByTask);

/**
 * @swagger
 * /api/attachments:
 *   post:
 *     summary: Add an attachment by URL reference
 *     tags: [Attachments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [task_id, file_name, file_url]
 *             properties:
 *               task_id:
 *                 type: integer
 *               file_name:
 *                 type: string
 *               file_url:
 *                 type: string
 *     responses:
 *       201:
 *         description: Attachment added
 *       403:
 *         description: No access to the task
 */
router.post('/', verifyToken, blockIfMustResetPassword, canUpload, AttachmentController.addAttachment);

module.exports = router;
