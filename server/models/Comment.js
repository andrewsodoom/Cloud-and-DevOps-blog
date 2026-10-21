const mongoose = require('mongoose')

const commentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
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

commentSchema.index({ post: 1, createdAt: -1 })

module.exports = mongoose.models.Comment || mongoose.model('Comment', commentSchema)
