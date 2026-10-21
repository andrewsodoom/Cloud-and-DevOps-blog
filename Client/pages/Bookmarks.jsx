import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../component/Navbar'
import Footer from '../component/Footer'
import ArticleCard from '../component/ArticleCard'
import { listBookmarks, toggleBookmark } from '../services/postService'
import { toArticle } from '../utils/posts'

function Bookmarks({ user, sessionChecked, loggingOut, onLogout }) {
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [removingId, setRemovingId] = useState(null)
  const [notice, setNotice] = useState('')
  const goToAuth = (mode) => navigate(`/?auth=${mode}#join`)

  useEffect(() => {
    if (!sessionChecked || !user) return undefined

    let active = true
    const controller = new AbortController()

    setStatus('loading')
    setError('')

    listBookmarks(controller.signal)
      .then((payload) => {
        if (!active) return
        setPosts(payload.posts || [])
        setStatus('ready')
      })
      .catch((requestError) => {
        if (requestError.name === 'AbortError' || !active) return
        setError(requestError.message || 'Could not load your bookmarks.')
        setStatus('error')
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [sessionChecked, user])

  const handleRemove = async (article) => {
    setRemovingId(article.id)
    setError('')
    setNotice('')

    try {
      const payload = await toggleBookmark(article.id)
      setPosts((current) => current.filter((post) => post.id !== article.id))
      setNotice(payload.message)
    } catch (requestError) {
      setError(requestError.message || 'Could not remove that bookmark.')
    } finally {
      setRemovingId(null)
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
        <span className="section-kicker">Your reading list</span>
        <h1>Log in to see saved articles.</h1>
        <p>Bookmark field notes while you read, then return to them here.</p>
        <div className="dashboard-gate-actions">
          <button className="btn primary" type="button" onClick={() => goToAuth('login')}>
            Log in
          </button>
          <Link className="btn ghost" to="/">
            Browse articles
          </Link>
        </div>
      </div>,
    )
  }

  return shell(
    <>
      <header className="dashboard-header">
        <div>
          <span className="section-kicker">Reading list</span>
          <h1>Saved field notes</h1>
          <p>Your bookmarked articles, ready when you have time to go deeper.</p>
        </div>
        <div className="dashboard-header-actions">
          <Link className="btn ghost" to="/">
            Browse articles
          </Link>
        </div>
      </header>

      {error ? (
        <p className="dashboard-error" role="alert">
          {error}
        </p>
      ) : null}

      {notice ? (
        <p className="form-message" role="status">
          {notice}
        </p>
      ) : null}

      {status === 'loading' ? (
        <p className="feed-status" role="status">
          Loading your saved articles...
        </p>
      ) : null}

      {status === 'ready' && posts.length === 0 ? (
        <div className="dashboard-empty">
          <h2>No bookmarks yet.</h2>
          <p>Open an article and select “Save article” to build your reading list.</p>
          <Link className="btn primary" to="/">
            Find something to read
          </Link>
        </div>
      ) : null}

      {status === 'ready' && posts.length > 0 ? (
        <div className="article-grid">
          {posts.map((post, index) => (
            <ArticleCard
              article={toArticle(post, index)}
              index={index}
              key={post.id}
              onRemoveBookmark={handleRemove}
              removing={removingId === post.id}
            />
          ))}
        </div>
      ) : null}
    </>
  )
}

export default Bookmarks
