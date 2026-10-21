import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../component/Navbar'
import Footer from '../component/Footer'
import { getAnalyticsOverview } from '../services/analyticsService'
import { formatDate } from '../utils/posts'

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Number(value) || 0)
}

function metricCards(metrics) {
  return [
    { label: 'Total views', value: metrics.totalViews, tone: 'mint' },
    { label: 'Published posts', value: metrics.publishedPosts, tone: 'blue' },
    { label: 'Likes', value: metrics.totalLikes, tone: 'violet' },
    { label: 'Comments', value: metrics.totalComments, tone: 'blue' },
    { label: 'Subscribers', value: metrics.totalSubscribers, tone: 'mint' },
    { label: 'Users', value: metrics.totalUsers, tone: 'violet' },
  ]
}

function AdminAnalytics({ user, sessionChecked, loggingOut, onLogout }) {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const isAdmin = user?.role === 'admin'
  const goToAuth = (mode) => navigate(`/?auth=${mode}#join`)

  useEffect(() => {
    if (!sessionChecked || !isAdmin) return undefined

    let active = true
    const controller = new AbortController()

    setStatus('loading')
    setError('')

    getAnalyticsOverview(controller.signal)
      .then((payload) => {
        if (!active) return
        setData(payload)
        setStatus('ready')
      })
      .catch((requestError) => {
        if (requestError.name === 'AbortError' || !active) return
        setError(requestError.message || 'Could not load analytics.')
        setStatus('error')
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [sessionChecked, isAdmin, attempt])

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

  if (!isAdmin) {
    return shell(
      <div className="dashboard-gate">
        <span className="section-kicker">Admin analytics</span>
        <h1>Admins only.</h1>
        <p>This dashboard is available to administrators.</p>
        <div className="dashboard-gate-actions">
          <Link className="btn primary" to={user ? '/dashboard' : '/'}>
            {user ? 'Go to your dashboard' : 'Browse articles'}
          </Link>
        </div>
      </div>,
    )
  }

  const metrics = data?.metrics
  const maxViews = Math.max(1, ...(data?.topPosts || []).map((post) => post.views))

  return shell(
    <>
      <header className="dashboard-header">
        <div>
          <span className="section-kicker">Blog analytics</span>
          <h1>The signal behind the stories</h1>
          <p>Views, engagement, subscribers, and the field notes earning attention.</p>
        </div>
        <div className="dashboard-header-actions">
          <Link className="btn ghost" to="/admin">
            Manage users
          </Link>
          <Link className="btn ghost" to="/dashboard">
            Dashboard
          </Link>
        </div>
      </header>

      {status === 'loading' ? (
        <p className="feed-status" role="status">
          Crunching the numbers...
        </p>
      ) : null}

      {status === 'error' ? (
        <div className="dashboard-gate">
          <p>{error}</p>
          <button className="btn primary" type="button" onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </button>
        </div>
      ) : null}

      {status === 'ready' && metrics ? (
        <>
          <div className="analytics-metrics">
            {metricCards(metrics).map((metric) => (
              <article className={`analytics-metric ${metric.tone}`} key={metric.label}>
                <span>{metric.label}</span>
                <strong>{formatNumber(metric.value)}</strong>
              </article>
            ))}
            <article className="analytics-metric accent">
              <span>Engagement rate</span>
              <strong>{metrics.engagementRate}%</strong>
              <small>Likes and comments per view</small>
            </article>
          </div>

          <div className="analytics-grid">
            <section className="analytics-panel" aria-labelledby="top-posts-heading">
              <div className="analytics-panel-head">
                <h2 id="top-posts-heading">Top field notes</h2>
                <span>Ranked by views, likes, and comments</span>
              </div>

              {data.topPosts.length === 0 ? (
                <p className="feed-status">No published posts yet.</p>
              ) : (
                <div className="analytics-posts">
                  {data.topPosts.map((post, index) => (
                    <article className="analytics-post" key={post.id}>
                      <span className="analytics-rank">{String(index + 1).padStart(2, '0')}</span>
                      <div className="analytics-post-main">
                        <Link to={`/posts/${post.slug}`}>{post.title}</Link>
                        <span>
                          {post.category} · {post.author}
                        </span>
                        <div className="analytics-bar" aria-hidden="true">
                          <span style={{ width: `${Math.max(6, (post.views / maxViews) * 100)}%` }} />
                        </div>
                      </div>
                      <div className="analytics-post-stats">
                        <strong>{formatNumber(post.views)}</strong>
                        <span>views</span>
                        <small>
                          {post.likes} likes · {post.comments} comments
                        </small>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <aside className="analytics-side">
              <section className="analytics-panel" aria-labelledby="tags-heading">
                <div className="analytics-panel-head">
                  <h2 id="tags-heading">Trending tags</h2>
                </div>
                {data.topTags.length > 0 ? (
                  <div className="analytics-tags">
                    {data.topTags.map((item) => (
                      <span key={item.tag}>
                        #{item.tag} <strong>{item.count}</strong>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="analytics-empty">Add tags to published posts to see topic trends.</p>
                )}
              </section>

              <section className="analytics-panel" aria-labelledby="recent-heading">
                <div className="analytics-panel-head">
                  <h2 id="recent-heading">Recently updated</h2>
                </div>
                <div className="analytics-recent">
                  {data.recentPosts.map((post) => (
                    <div key={post.id}>
                      <strong>{post.title}</strong>
                      <span>
                        {post.status} · {post.author} · {formatDate(post.updatedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </>
      ) : null}
    </>
  )
}

export default AdminAnalytics
