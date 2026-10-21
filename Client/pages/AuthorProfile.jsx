import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Navbar from '../component/Navbar'
import Footer from '../component/Footer'
import ArticleCard from '../component/ArticleCard'
import { getUser } from '../services/userService'
import { listPosts } from '../services/postService'
import { formatDate, getInitials, toArticle } from '../utils/posts'
import useSeo from '../hooks/useSeo'
import { absoluteUrl } from '../utils/seo'

function AuthorProfile({ user, loggingOut, onLogout }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [author, setAuthor] = useState(null)
  const [posts, setPosts] = useState([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    setStatus('loading')
    setError('')
    setAuthor(null)
    setPosts([])
    setTotal(0)

    Promise.all([
      getUser(id, controller.signal),
      listPosts({ author: id, limit: 50 }, controller.signal),
    ])
      .then(([profilePayload, postsPayload]) => {
        if (!active) return

        setAuthor(profilePayload.user)
        setPosts(postsPayload.posts || [])
        setTotal(postsPayload.pagination?.total || 0)
        setStatus('ready')
      })
      .catch((fetchError) => {
        if (fetchError.name === 'AbortError' || !active) return

        setStatus('error')
        setError(
          fetchError.status === 404
            ? 'not-found'
            : fetchError.message || 'Could not load this author.',
        )
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [id])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [id])

  useSeo(
    {
      title: author?.name,
      description: author
        ? `Read ${total} published ${total === 1 ? 'article' : 'articles'} by ${author.name} on CloudCraft Journal.`
        : 'CloudCraft Journal author profile.',
      path: `/authors/${id}`,
      noIndex: status === 'error',
      jsonLd: author
        ? [
            {
              '@type': 'ProfilePage',
              mainEntity: {
                '@type': 'Person',
                name: author.name,
                jobTitle: author.role,
                url: absoluteUrl(`/authors/${id}`),
              },
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
                  name: author.name,
                  item: absoluteUrl(`/authors/${id}`),
                },
              ],
            },
          ]
        : undefined,
    },
    [author, status, total, id],
  )

  const articles = posts.map(toArticle)
  const goToAuth = (mode) => navigate(`/?auth=${mode}#join`)
  const firstName = author?.name?.split(' ')[0]

  return (
    <div className="page">
      <Navbar
        user={user}
        onLogin={() => goToAuth('login')}
        onSignup={() => goToAuth('signup')}
        onLogout={onLogout}
        loggingOut={loggingOut}
      />

      <main className="author-main">
        <div className="container">
          <Link className="back-link" to="/">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
            Back to articles
          </Link>

          {status === 'loading' ? (
            <p className="feed-status" role="status">
              Loading author profile...
            </p>
          ) : null}

          {status === 'error' ? (
            <div className="post-missing">
              <p>{error === 'not-found' ? 'That author could not be found.' : error}</p>
              <Link className="btn primary" to="/">
                Browse all articles
              </Link>
            </div>
          ) : null}

          {status === 'ready' && author ? (
            <>
              <header className="author-hero">
                <span className="author-portrait" aria-hidden="true">
                  {getInitials(author.name)}
                </span>
                <div className="author-details">
                  <span className="section-kicker">Author profile</span>
                  <h1>{author.name}</h1>
                  <div className="author-meta">
                    <span className="author-role">{author.role}</span>
                    <span>Joined {formatDate(author.createdAt)}</span>
                    <span>
                      {total} published {total === 1 ? 'article' : 'articles'}
                    </span>
                  </div>
                </div>
              </header>

              <section className="author-work" aria-labelledby="author-work-heading">
                <div className="section-heading">
                  <div>
                    <span className="section-kicker">Published work</span>
                    <h2 id="author-work-heading">Field notes by {firstName}</h2>
                  </div>
                  <p>Deep dives, runbooks, and lessons from production.</p>
                </div>

                {articles.length > 0 ? (
                  <div className="article-grid">
                    {articles.map((article, index) => (
                      <ArticleCard article={article} index={index} key={article.id} />
                    ))}
                  </div>
                ) : (
                  <p className="feed-status">No published articles yet.</p>
                )}
              </section>
            </>
          ) : null}
        </div>
      </main>

      <Footer onLogin={() => goToAuth('login')} onSignup={() => goToAuth('signup')} />
    </div>
  )
}

export default AuthorProfile
