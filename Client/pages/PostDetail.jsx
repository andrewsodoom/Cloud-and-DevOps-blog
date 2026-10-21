import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Navbar from '../component/Navbar'
import Footer from '../component/Footer'
import ShareButtons from '../component/ShareButtons'
import {
  getPost,
  listComments,
  createComment,
  deleteComment,
  toggleLike,
  toggleBookmark,
} from '../services/postService'
import { formatDate, getInitials } from '../utils/posts'
import { contentToHtml } from '../utils/richText'
import useSeo from '../hooks/useSeo'
import { absoluteUrl } from '../utils/seo'

function formatDateTime(value) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function canDeleteComment(comment, post, user) {
  if (!user) return false
  if (user.role === 'admin') return true
  if (user.id === comment.author?.id) return true

  return user.id === post?.author?.id
}

function PostDetail({ user, loggingOut, onLogout }) {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [commentsError, setCommentsError] = useState('')
  const [likeError, setLikeError] = useState('')
  const [liking, setLiking] = useState(false)
  const [bookmarkError, setBookmarkError] = useState('')
  const [bookmarking, setBookmarking] = useState(false)
  const [commentBody, setCommentBody] = useState('')
  const [commentError, setCommentError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const goToAuth = (mode) => navigate(`/?auth=${mode}#join`)

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    setStatus('loading')
    setError('')
    setCommentsError('')
    setPost(null)
    setComments([])

    getPost(slug, controller.signal)
      .then((payload) => {
        if (!active) return

        setPost(payload.post)
        setStatus('ready')

        return listComments(payload.post.id, { limit: 20 }, controller.signal)
          .then((commentsPayload) => {
            if (active) setComments(commentsPayload.comments || [])
          })
          .catch((commentsFetchError) => {
            if (commentsFetchError.name === 'AbortError' || !active) return
            setCommentsError('Could not load comments.')
          })
      })
      .catch((fetchError) => {
        if (fetchError.name === 'AbortError' || !active) return

        setStatus('error')
        setError(
          fetchError.status === 404
            ? 'not-found'
            : fetchError.message || 'Could not load this article.',
        )
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [slug])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [slug])

  useSeo(
    {
      title: post?.title,
      description:
        post?.excerpt ||
        'A practical cloud, platform engineering, and DevOps field note from CloudCraft Journal.',
      path: post?.slug ? `/posts/${post.slug}` : `/posts/${slug}`,
      image: post?.coverImage || '/og-default.png',
      type: 'article',
      noIndex: status === 'error',
      publishedAt: post?.publishedAt || post?.createdAt,
      modifiedAt: post?.updatedAt,
      author: post?.author?.name,
      section: post?.category,
      tags: post?.tags || [],
      jsonLd: post
        ? [
            {
              '@type': 'BlogPosting',
              headline: post.title,
              description: post.excerpt,
              image: absoluteUrl(post.coverImage || '/og-default.png'),
              datePublished: post.publishedAt || post.createdAt,
              dateModified: post.updatedAt || post.publishedAt,
              author: {
                '@type': 'Person',
                name: post.author?.name || 'CloudCraft Journal',
                url: post.author?.id ? absoluteUrl(`/authors/${post.author.id}`) : undefined,
              },
              publisher: {
                '@type': 'Organization',
                name: 'CloudCraft Journal',
                logo: {
                  '@type': 'ImageObject',
                  url: absoluteUrl('/favicon.svg'),
                },
              },
              mainEntityOfPage: absoluteUrl(`/posts/${post.slug}`),
              articleSection: post.category,
              keywords: (post.tags || []).join(', '),
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Home',
                  item: absoluteUrl('/'),
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: post.title,
                  item: absoluteUrl(`/posts/${post.slug}`),
                },
              ],
            },
          ]
        : undefined,
    },
    [post, status, slug],
  )

  const handleLike = async () => {
    if (!user) {
      goToAuth('login')
      return
    }

    setLikeError('')
    setLiking(true)

    try {
      const payload = await toggleLike(post.id)

      setPost((current) =>
        current
          ? { ...current, likedByMe: payload.liked, likesCount: payload.likesCount }
          : current,
      )
    } catch (likeRequestError) {
      setLikeError(likeRequestError.message || 'Could not update your like.')
    } finally {
      setLiking(false)
    }
  }

  const handleBookmark = async () => {
    if (!user) {
      goToAuth('login')
      return
    }

    setBookmarkError('')
    setBookmarking(true)

    try {
      const payload = await toggleBookmark(post.id)

      setPost((current) =>
        current ? { ...current, bookmarkedByMe: payload.bookmarked } : current,
      )
    } catch (bookmarkRequestError) {
      setBookmarkError(
        bookmarkRequestError.message || 'Could not update your bookmark.',
      )
    } finally {
      setBookmarking(false)
    }
  }

  const handleCommentSubmit = async (event) => {
    event.preventDefault()

    const body = commentBody.trim()

    if (!body) {
      setCommentError('Write something before posting.')
      return
    }

    setSubmitting(true)
    setCommentError('')

    try {
      const payload = await createComment(post.id, body)

      setComments((current) => [payload.comment, ...current])
      setPost((current) =>
        current
          ? { ...current, commentCount: (current.commentCount || 0) + 1 }
          : current,
      )
      setCommentBody('')
    } catch (commentRequestError) {
      setCommentError(commentRequestError.message || 'Could not post your comment.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    setDeletingId(commentId)
    setCommentError('')

    try {
      await deleteComment(post.id, commentId)

      setComments((current) => current.filter((comment) => comment.id !== commentId))
      setPost((current) =>
        current
          ? { ...current, commentCount: Math.max(0, (current.commentCount || 1) - 1) }
          : current,
      )
    } catch (commentRequestError) {
      setCommentError(commentRequestError.message || 'Could not delete that comment.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="page">
      <Navbar
        user={user}
        onLogin={() => goToAuth('login')}
        onSignup={() => goToAuth('signup')}
        onLogout={onLogout}
        loggingOut={loggingOut}
      />

      <main className="post-main">
        <div className="container">
          {status === 'loading' ? (
            <p className="feed-status" role="status">
              Loading article...
            </p>
          ) : null}

          {status === 'error' ? (
            <div className="post-missing">
              <p>{error === 'not-found' ? 'That article could not be found.' : error}</p>
              <Link className="btn primary" to="/">
                Browse all articles
              </Link>
            </div>
          ) : null}

          {status === 'ready' && post ? (
            <article className="post-article">
              <Link className="back-link" to="/">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19 12H5M11 6l-6 6 6 6" />
                </svg>
                Back to articles
              </Link>

              <div className="post-kicker">
                <span>{post.category}</span>
                <span>{formatDate(post.publishedAt || post.createdAt)}</span>
                <span>{post.readingTime || 1} min read</span>
                <span>{post.views || 0} views</span>
              </div>

              <h1>{post.title}</h1>

              {post.excerpt ? <p className="post-excerpt">{post.excerpt}</p> : null}

              {post.tags?.length > 0 ? (
                <div className="post-tags" aria-label="Article tags">
                  {post.tags.map((tag) => (
                    <Link to={`/?tag=${encodeURIComponent(tag)}#articles`} key={tag}>
                      #{tag}
                    </Link>
                  ))}
                </div>
              ) : null}

              {post.author?.id ? (
                <Link className="post-byline post-byline-link" to={`/authors/${post.author.id}`}>
                  <span className="post-avatar" aria-hidden="true">
                    {getInitials(post.author.name)}
                  </span>
                  <div>
                    <strong>{post.author.name || 'CloudCraft'}</strong>
                    <span>{post.author.role || 'author'}</span>
                  </div>
                </Link>
              ) : (
                <div className="post-byline">
                  <span className="post-avatar" aria-hidden="true">
                    {getInitials(post.author?.name)}
                  </span>
                  <div>
                    <strong>{post.author?.name || 'CloudCraft'}</strong>
                    <span>{post.author?.role || 'author'}</span>
                  </div>
                </div>
              )}

              {post.coverImage ? (
                <figure className="post-cover">
                  <img
                    src={post.coverImage}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={(event) => {
                      event.currentTarget.closest('figure').hidden = true
                    }}
                  />
                </figure>
              ) : null}

              <div
                className="post-content"
                dangerouslySetInnerHTML={{ __html: contentToHtml(post.content) }}
              />

              <div className="post-actions">
                <button
                  className={`like-button ${post.likedByMe ? 'liked' : ''}`}
                  type="button"
                  onClick={handleLike}
                  disabled={liking}
                  aria-pressed={post.likedByMe}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 20.5s-7.5-4.6-7.5-10A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7.5 3.5c0 5.4-7.5 10-7.5 10Z" />
                  </svg>
                  {liking
                    ? 'Updating...'
                    : `${post.likedByMe ? 'Liked' : 'Like'} · ${post.likesCount || 0}`}
                </button>

                <button
                  className={`bookmark-button ${post.bookmarkedByMe ? 'bookmarked' : ''}`}
                  type="button"
                  onClick={handleBookmark}
                  disabled={bookmarking}
                  aria-pressed={post.bookmarkedByMe}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1Z" />
                  </svg>
                  {bookmarking
                    ? 'Updating...'
                    : post.bookmarkedByMe
                      ? 'Saved'
                      : 'Save article'}
                </button>

                {!user ? (
                  <span className="post-login-hint">
                    <button type="button" onClick={() => goToAuth('login')}>
                      Log in
                    </button>{' '}
                    to like, save, and comment.
                  </span>
                ) : null}
              </div>

              {likeError ? (
                <p className="post-alert" role="alert">
                  {likeError}
                </p>
              ) : null}

              {bookmarkError ? (
                <p className="post-alert" role="alert">
                  {bookmarkError}
                </p>
              ) : null}

              <ShareButtons title={post.title} slug={post.slug} />

              <section className="comments" aria-labelledby="comments-heading">
                <div className="comments-heading">
                  <h2 id="comments-heading">Comments</h2>
                  <span>{post.commentCount || 0} total</span>
                </div>

                {user ? (
                  <form className="comment-form" onSubmit={handleCommentSubmit}>
                    <textarea
                      name="comment"
                      placeholder="Share a question or a better way to do it..."
                      maxLength={2000}
                      value={commentBody}
                      onChange={(event) => {
                        setCommentBody(event.target.value)
                        setCommentError('')
                      }}
                      aria-label="Write a comment"
                    />
                    {commentError ? (
                      <p className="comment-error" role="alert">
                        {commentError}
                      </p>
                    ) : null}
                    <div className="comment-form-row">
                      <span>{commentBody.trim().length}/2000</span>
                      <button
                        className="btn primary compact"
                        type="submit"
                        disabled={submitting || !commentBody.trim()}
                      >
                        {submitting ? 'Posting...' : 'Post comment'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="comment-login">
                    <button type="button" onClick={() => goToAuth('login')}>
                      Log in
                    </button>{' '}
                    to join the discussion.
                  </p>
                )}

                {commentsError ? (
                  <p className="comment-error" role="alert">
                    {commentsError}
                  </p>
                ) : null}

                {comments.length > 0 ? (
                  <div className="comment-list">
                    {comments.map((comment) => (
                      <article className="comment" key={comment.id}>
                        <div className="comment-head">
                          <span className="comment-avatar" aria-hidden="true">
                            {getInitials(comment.author?.name)}
                          </span>
                          <div>
                            <div className="comment-author">
                              {comment.author?.name || 'Reader'}
                            </div>
                            <div className="comment-meta">
                              {formatDateTime(comment.createdAt)}
                            </div>
                          </div>
                          {canDeleteComment(comment, post, user) ? (
                            <button
                              className="comment-delete"
                              type="button"
                              onClick={() => handleDeleteComment(comment.id)}
                              disabled={deletingId === comment.id}
                            >
                              {deletingId === comment.id ? 'Deleting...' : 'Delete'}
                            </button>
                          ) : null}
                        </div>
                        <p className="comment-body">{comment.body}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="comments-empty">No comments yet. Start the conversation.</p>
                )}
              </section>
            </article>
          ) : null}
        </div>
      </main>

      <Footer onLogin={() => goToAuth('login')} onSignup={() => goToAuth('signup')} />
    </div>
  )
}

export default PostDetail
