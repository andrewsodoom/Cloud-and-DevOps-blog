const mongoose = require('mongoose')

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    excerpt: {
      type: String,
      default: '',
      trim: true,
      maxlength: 300,
    },
    coverImage: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2048,
    },
    content: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      default: 'General',
      trim: true,
      maxlength: 60,
    },
    tags: {
      type: [String],
      default: [],
    },
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    readingTime: {
      type: Number,
      default: 1,
      min: 1,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    commentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    publishedAt: {
      type: Date,
      default: null,
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

postSchema.index({ status: 1, publishedAt: -1 })
postSchema.index({ category: 1, publishedAt: -1 })
postSchema.index({ tags: 1, publishedAt: -1 })
postSchema.index({ author: 1, updatedAt: -1 })

module.exports = mongoose.models.Post || mongoose.model('Post', postSchema)
