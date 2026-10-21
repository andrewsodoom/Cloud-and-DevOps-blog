function notFound(req, res) {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} was not found.` })
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error)
  }

  const status = error.status || error.statusCode || 500

  if (status >= 500) {
    console.error(error)
  }

  return res.status(status).json({
    message: status >= 500 ? 'Something went wrong on the server.' : error.message,
  })
}

module.exports = { notFound, errorHandler }
