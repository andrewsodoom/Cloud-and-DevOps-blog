import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import Navbar from '../component/Navbar'
import Footer from '../component/Footer'
import PostEditor from './PostEditor'
import ConfirmDialog from '../component/ConfirmDialog'
import { deletePost, listMyPosts } from '../services/postService'
import { becomeAuthor } from '../services/userService'

function formatDate(value) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function DashboardHome({ user }) {
  const [posts, setPosts] = useState([])
  const [status, setStatus] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [deletingId, setDeletingId] = useState(null)
  const [postToDelete, setPostToDelete] = useState(null)

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    setStatus('loading')
    setLoadError('')

    listMyPosts({ limit: 50 }, controller.signal)
      .then((payload) => {
        if (!active) return
        setPosts(payload.posts || [])
        setStatus('ready')
      })
      .catch((error) => {
        if (error.name === 'AbortError' || !active) return
        setLoadError(error.message || 'Could not load your posts.')
        setStatus('error')
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [attempt])

  const handleDelete = async () => {
    const post = postToDelete

    if (!post) return

    setDeletingId(post.id)
    setActionError('')
    setActionMessage('')

    try {
      await deletePost(post.id)
      setPosts((current) => current.filter((item) => item.id !== post.id))
      setActionMessage(`"${post.title}" was deleted.`)
      setPostToDelete(null)
    } catch (error) {
      setActionError(error.message || 'Could not delete that post.')
      setPostToDelete(null)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <header className="dashboard-header">
        <div>
          <span className="section-kicker">Author dashboard</span>
          <h1>Your posts</h1>
          <p>Drafts stay private. Published posts appear on the home feed.</p>
        </div>
        <div className="dashboard-header-actions">
          <span className="dashboard-role">{user.role}</span>
          {user.role === 'admin' ? (
            <>
              <Link className="btn ghost" to="/admin/analytics">
                Analytics
              </Link>
              <Link className="btn ghost" to="/admin">
                Manage users
              </Link>
            </>
          ) : null}
          <Link className="btn primary" to="/dashboard/new">
            New post
          </Link>
        </div>
      </header>

      {actionError ? (
        <p className="dashboard-error" role="alert">
          {actionError}
        </p>
      ) : null}

      {actionMessage ? (
        <p className="form-message" role="status">
          {actionMessage}
        </p>
      ) : null}

      {status === 'loading' ? (
        <p className="feed-status" role="status">
          Loading your posts...
        </p>
      ) : null}

      {status === 'error' ? (
        <div className="dashboard-gate">
          <p>{loadError}</p>
          <button className="btn primary" type="button" onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </button>
        </div>
      ) : null}

      {status === 'ready' && posts.length === 0 ? (
        <div className="dashboard-empty">
          <h2>No posts yet.</h2>
          <p>Start with a draft, then publish when it is ready for the feed.</p>
          <Link className="btn primary" to="/dashboard/new">
            Write your first post
          </Link>
        </div>
      ) : null}

      {status === 'ready' && posts.length > 0 ? (
        <div className="dashboard-list">
          {posts.map((post) => (
            <article className="dashboard-post" key={post.id}>
              <div className="dashboard-post-main">
                <div className="dashboard-post-title">
                  <h3>{post.title}</h3>
                  <span className={`status-pill ${post.status}`}>{post.status}</span>
                </div>
                <div className="dashboard-meta">
                  <span>{post.category || 'General'}</span>
                  <span>Updated {formatDate(post.updatedAt)}</span>
                  <span>{post.likesCount || 0} likes</span>
                  <span>{post.commentCount || 0} comments</span>
                </div>
              </div>
              <div className="dashboard-row-actions">
                <Link className="btn ghost compact" to={`/posts/${post.slug}`}>
                  View
                </Link>
                <Link className="btn ghost compact" to={`/dashboard/edit/${post.slug}`}>
                  Edit
                </Link>
                <button
                  className="text-button danger"
                  type="button"
                  onClick={() => {
                    setActionError('')
                    setActionMessage('')
                    setPostToDelete(post)
                  }}
                  disabled={deletingId === post.id}
                >
                  {deletingId === post.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(postToDelete)}
        title="Delete this post?"
        message={
          postToDelete
            ? `"${postToDelete.title}" will be permanently removed, along with its comments. This cannot be undone.`
            : ''
        }
        busy={Boolean(postToDelete && deletingId === postToDelete.id)}
        onCancel={() => {
          if (!deletingId) setPostToDelete(null)
        }}
        onConfirm={handleDelete}
      />
    </>
  )
}

function Dashboard({ user, sessionChecked, loggingOut, onLogout, onUserUpdated }) {
  const navigate = useNavigate()
  const [upgrading, setUpgrading] = useState(false)
  const [gateError, setGateError] = useState('')

  const goToAuth = (mode) => navigate(`/?auth=${mode}#join`)

  const handleBecomeAuthor = async () => {
    setUpgrading(true)
    setGateError('')

    try {
      const payload = await becomeAuthor()
      onUserUpdated(payload.user)
    } catch (error) {
      setGateError(error.message || 'Could not enable author access.')
    } finally {
      setUpgrading(false)
    }
  }

  const shell = (content) => (
    <div className="page">
      <Navbar
        user={user}
        onLogin={() => goToAuth('login')}
        onSignup={() => goToAuth('signup')}
        onLogout={onLogout}
        loggingOut={loggingOut}
      />
      <main className="dashboard-main">
        <div className="container">{content}</div>
      </main>
      <Footer onLogin={() => goToAuth('login')} onSignup={() => goToAuth('signup')} />
    </div>
  )

  if (!sessionChecked) {
    return shell(
      <p className="feed-status" role="status">
        Checking your session...
      </p>,
    )
  }

  if (!user) {
    return shell(
      <div className="dashboard-gate">
        <span className="section-kicker">Author dashboard</span>
        <h1>Log in to start writing.</h1>
        <p>Your drafts and published posts live here once you sign in.</p>
        <div className="dashboard-gate-actions">
          <button className="btn primary" type="button" onClick={() => goToAuth('login')}>
            Log in
          </button>
          <Link className="btn ghost" to="/">
            Back to articles
          </Link>
        </div>
      </div>,
    )
  }

  if (user.role === 'reader') {
    return shell(
      <div className="dashboard-gate">
        <span className="section-kicker">One step first</span>
        <h1>Become an author.</h1>
        <p>
          Your account can read and comment. Author access lets you create drafts, publish posts,
          and manage your own writing.
        </p>
        {gateError ? (
          <p className="comment-error" role="alert">
            {gateError}
          </p>
        ) : null}
        <div className="dashboard-gate-actions">
          <button
            className="btn primary"
            type="button"
            onClick={handleBecomeAuthor}
            disabled={upgrading}
          >
            {upgrading ? 'Enabling access...' : 'Enable author access'}
          </button>
          <Link className="btn ghost" to="/">
            Back to articles
          </Link>
        </div>
      </div>,
    )
  }

  return shell(
    <Routes>
      <Route index element={<DashboardHome user={user} />} />
      <Route path="new" element={<PostEditor />} />
      <Route path="edit/:slug" element={<PostEditor />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>,
  )
}

export default Dashboard
