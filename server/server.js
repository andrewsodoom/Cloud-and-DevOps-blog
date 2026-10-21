const app = require('./app')
const env = require('./config/env')
const { connectDB, disconnectDB } = require('./config/db')

let server = null
let shuttingDown = false

async function start() {
  await connectDB()

  server = app.listen(env.port, () => {
    console.log(`CloudCraft API running at http://localhost:${env.port}`)
  })
}

function shutdown(reason) {
  if (shuttingDown) return
  shuttingDown = true

  console.log(`\n${reason} received. Closing the server...`)

  const finish = async () => {
    try {
      await disconnectDB()
    } catch (error) {
      console.error('Failed to disconnect from MongoDB:', error.message)
    }

    process.exit(0)
  }

  if (!server) {
    finish()
    return
  }

  server.close(() => {
    finish()
  })

  setTimeout(() => {
    console.error('Shutdown took too long. Exiting.')
    process.exit(1)
  }, 10000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error)
  shutdown('Unhandled rejection')
})
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error)
  shutdown('Uncaught exception')
})

start().catch((error) => {
  console.error('Failed to start CloudCraft API:', error.message)
  process.exit(1)
})
