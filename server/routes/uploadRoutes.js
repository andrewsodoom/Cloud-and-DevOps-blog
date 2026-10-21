const express = require('express')
const authenticate = require('../middleware/authenticate')
const { requireRole } = require('../middleware/authorize')
const { uploadSingleImage } = require('../middleware/upload')
const env = require('../config/env')

const router = express.Router()

router.post('/', authenticate, requireRole('author', 'admin'), uploadSingleImage, (req, res) => {
  if (!req.file) {
    return res.status(422).json({ message: 'Choose an image to upload.' })
  }

  return res.status(201).json({
    message: 'Image uploaded.',
    url: `${env.publicApiUrl}/uploads/${req.file.filename}`,
    filename: req.file.filename,
  })
})

module.exports = router
