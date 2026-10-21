import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listTrendingPosts } from '../services/postService'
import { formatDate } from '../utils/posts'

function TrendingPosts() {
  const [posts, setPosts] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    listTrendingPosts({ limit: 4 }, controller.signal)
      .then((payload) => {
        if (!active) return
        setPosts(payload.posts || [])
        setStatus('ready')
      })
      .catch((error) => {
        if (error.name === 'AbortError' || !active) return
        setStatus('error')
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [])

  if (status !== 'ready' || posts.length === 0) return null

  return (
    <section className="trending-section" aria-labelledby="trending-heading">
      <div className="container">
        <div className="trending-head">
          <div>
            <span className="section-kicker">Trending now</span>
            <h2 id="trending-heading">What engineers are reading</h2>
          </div>
          <p>Ranked by views, likes, and discussion across the journal.</p>
        </div>

        <div className="trending-grid">
          {posts.map((post) => (
            <Link className="trending-card" to={`/posts/${post.slug}`} key={post.id}>
              <span className="trending-rank">{String(post.trendRank).padStart(2, '0')}</span>
              <div className="trending-body">
                <span className="trending-category">{post.category}</span>
                <h3>{post.title}</h3>
                <div className="trending-meta">
                  <span>{formatDate(post.publishedAt)}</span>
                  <span>{post.views || 0} views</span>
                  <span>{post.likesCount || 0} likes</span>
                </div>
              </div>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export default TrendingPosts
