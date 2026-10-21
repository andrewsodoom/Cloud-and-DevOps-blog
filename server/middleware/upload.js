const fs = require('node:fs')
const path = require('node:path')
const { randomUUID } = require('node:crypto')
const multer = require('multer')
const env = require('../config/env')

fs.mkdirSync(env.uploadDir, { recursive: true })

const EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

const storage = multer.diskStorage({
  destination: (req, file, callback) => callback(null, env.uploadDir),
  filename: (req, file, callback) => {
    callback(null, `${Date.now()}-${randomUUID()}${EXTENSIONS[file.mimetype]}`)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: env.uploadMaxBytes,
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    if (!EXTENSIONS[file.mimetype]) {
      const error = new Error('Upload a JPG, PNG, WebP, or GIF image.')
      error.status = 422
      callback(error)
      return
    }

    callback(null, true)
  },
})

function uploadSingleImage(req, res, next) {
  upload.single('image')(req, res, (error) => {
    if (!error) return next()

    if (error.code === 'LIMIT_FILE_SIZE') {
      error.status = 413
      error.message = 'Images must be 5 MB or smaller.'
    } else if (!error.status) {
      error.status = 422
    }

    return next(error)
  })
}

module.exports = { uploadSingleImage, uploadsPath: path.resolve(env.uploadDir) }
