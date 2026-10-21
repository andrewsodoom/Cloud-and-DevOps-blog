function sameId(left, right) {
  if (!left || !right) return false

  return String(left._id || left) === String(right._id || right)
}

function canViewPost(post, user) {
  if (!post) return false
  if (post.status === 'published') return true
  if (!user) return false

  return user.role === 'admin' || sameId(post.author, user)
}

function canManagePost(post, user) {
  if (!post || !user) return false

  return user.role === 'admin' || sameId(post.author, user)
}

module.exports = { sameId, canViewPost, canManagePost }
