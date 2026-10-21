const mongoose = require('mongoose')

const subscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    source: {
      type: String,
      default: 'footer',
      trim: true,
      maxlength: 40,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (document, returned) => {
        returned.id = returned._id.toString()
        delete returned._id
        return returned
      },
    },
  },
)

module.exports = mongoose.models.Subscriber || mongoose.model('Subscriber', subscriberSchema)
