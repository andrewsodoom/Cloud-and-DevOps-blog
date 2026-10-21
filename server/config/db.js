const mongoose = require('mongoose')
const env = require('./env')

mongoose.connection.on('error', (error) => {
  console.error('MongoDB connection error:', error.message)
})

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected.')
})

async function connectDB() {
  await mongoose.connect(env.mongodbUri, {
    serverSelectionTimeoutMS: 10000,
  })

  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`)
}

async function disconnectDB() {
  if (mongoose.connection.readyState === 0) return

  await mongoose.disconnect()
  console.log('MongoDB disconnected.')
}

module.exports = { connectDB, disconnectDB }
