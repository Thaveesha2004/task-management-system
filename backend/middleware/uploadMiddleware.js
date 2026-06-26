const path = require('path');
const multer = require('multer');

const MAX_FILE_SIZE = 5 * 1024 * 1024;

// BE-3: allowlist of safe attachment types. Note what is deliberately excluded:
// text/html, image/svg+xml, and any script/xhtml type — those can carry active
// content and must never be accepted as task attachments.
const ALLOWED_MIME_TYPES = new Set([
  // images
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/bmp',
  // documents
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // archives
  'application/zip',
  'application/x-zip-compressed',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp',
  '.pdf', '.txt', '.csv',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip',
]);

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  // Both the declared MIME type and the extension must be on the allowlist, so a
  // mislabelled .html/.svg is rejected even if its MIME header is spoofed.
  if (ALLOWED_MIME_TYPES.has(mime) && ALLOWED_EXTENSIONS.has(ext)) {
    return cb(null, true);
  }

  const err = new Error('Unsupported file type. Allowed: images, PDF, text/CSV, Office documents, ZIP.');
  err.code = 'UNSUPPORTED_FILE_TYPE';
  return cb(err);
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

module.exports = upload;
