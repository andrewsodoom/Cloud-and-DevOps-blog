import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../component/Navbar'
import AuthCard from '../component/AuthCard'
import AccountPanel from '../component/AccountPanel'
import ArticleCard from '../component/ArticleCard'
import TrendingPosts from '../component/TrendingPosts'
import ExternalFeed from '../component/ExternalFeed'
import Footer from '../component/Footer'
import { topics } from '../data/articles'
import { listPosts } from '../services/postService'
import { getInitials, toArticle } from '../utils/posts'
import useSeo from '../hooks/useSeo'
import { absoluteUrl } from '../utils/seo'

function Home({
  user,
  sessionChecked,
  loggingOut,
  authMode,
  setAuthMode,
  flash,
  onDismissFlash,
  onAuthenticated,
  onLogout,
}) {
  const [posts, setPosts] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 9, total: 0, pages: 0 })
  const [filters, setFilters] = useState({ category: '', search: '', tag: '' })
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [feedStatus, setFeedStatus] = useState('loading')
  const [feedError, setFeedError] = useState('')
  const [loadingMore, setLoadingMore] = useState(false)
  const [feedAttempt, setFeedAttempt] = useState(0)
  const [featuredPost, setFeaturedPost] = useState(null)
  const [featuredStatus, setFeaturedStatus] = useState('loading')
  const heroRef = useRef(null)

  useSeo(
    {
      title: 'CloudCraft Journal | Cloud & DevOps insights',
      description:
        'Practical cloud, platform engineering, and DevOps guides, field notes, and industry context for people who ship software.',
      path: '/',
      jsonLd: [
        {
          '@type': 'WebSite',
          name: 'CloudCraft Journal',
          url: absoluteUrl('/'),
          description:
            'Practical cloud, platform engineering, and DevOps guides for people who ship software.',
          publisher: {
            '@type': 'Organization',
            name: 'CloudCraft Journal',
            url: absoluteUrl('/'),
            logo: absoluteUrl('/favicon.svg'),
          },
        },
        {
          '@type': 'Organization',
          name: 'CloudCraft Journal',
          url: absoluteUrl('/'),
          logo: absoluteUrl('/favicon.svg'),
        },
      ],
    },
    [],
  )

  useEffect(() => {
    const node = heroRef.current

    if (!node || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    let frame = 0

    const updateShift = () => {
      frame = 0
      const shift = Math.min(40, Math.max(0, window.scrollY * 0.15))

      node.style.setProperty('--cloud-shift', `${shift.toFixed(1)}px`)
    }

    const handleScroll = () => {
      if (frame) return

      frame = window.requestAnimationFrame(updateShift)
    }

    updateShift()
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    listPosts({ limit: 1 }, controller.signal)
      .then((payload) => {
        if (!active) return

        setFeaturedPost(payload.posts?.[0] || null)
        setFeaturedStatus('ready')
      })
      .catch((error) => {
        if (error.name === 'AbortError' || !active) return
        setFeaturedStatus('error')
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [])

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const firstPage = page === 1

    setFeedError('')

    if (firstPage) {
      setFeedStatus('loading')
      setPosts([])
    } else {
      setLoadingMore(true)
    }

    listPosts(
      {
        limit: 9,
        page,
        category: filters.category,
        search: filters.search,
        tag: filters.tag,
      },
      controller.signal,
    )
      .then((payload) => {
        if (!active) return

        setPosts((current) =>
          firstPage ? payload.posts || [] : [...current, ...(payload.posts || [])],
        )
        setPagination(payload.pagination || { page: 1, limit: 9, total: 0, pages: 0 })
        setFeedStatus('ready')
      })
      .catch((error) => {
        if (error.name === 'AbortError' || !active) return

        setFeedError(error.message || 'Could not load articles.')
        setFeedStatus('error')
      })
      .finally(() => {
        if (active && !firstPage) setLoadingMore(false)
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [filters, page, feedAttempt])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedMode = params.get('auth')
    const requestedTag = params.get('tag')

    if (requestedTag) {
      setFilters((current) => ({ ...current, tag: requestedTag.trim().toLowerCase() }))
      window.history.replaceState(null, '', `${window.location.pathname}#articles`)
    }

    if (requestedMode === 'login' || requestedMode === 'signup') {
      setAuthMode(requestedMode)
      window.history.replaceState(null, '', `${window.location.pathname}#join`)
      document.getElementById('join')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    const target = window.location.hash.replace('#', '')

    if (target) {
      document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [setAuthMode])

  const articles = posts.map(toArticle)
  const featuredArticle = featuredPost ? toArticle(featuredPost, 0) : null
  const hasFilters = Boolean(filters.category || filters.search || filters.tag)
  const hasMore = pagination.page < pagination.pages
  const canPublish = Boolean(user && (user.role === 'author' || user.role === 'admin'))
  const writePath = canPublish ? '/dashboard/new' : '/dashboard'
  const writeLabel = canPublish ? 'Write a post' : 'Start writing'
  const displayedArticles =
    featuredArticle && !hasFilters
      ? articles.filter((article) => article.id !== featuredArticle.id)
      : articles

  const scrollToArticles = () => {
    document.getElementById('articles')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setPage(1)
    setFilters((current) => ({ ...current, search: searchInput.trim() }))
    scrollToArticles()
  }

  const handleTopicClick = (topic) => {
    setPage(1)
    setFilters((current) => ({
      ...current,
      category: current.category === topic ? '' : topic,
    }))
    scrollToArticles()
  }

  const clearFilters = () => {
    setPage(1)
    setSearchInput('')
    setFilters({ category: '', search: '', tag: '' })
  }

  const scrollToAuth = (mode) => {
    setAuthMode(mode)
    document.getElementById('join')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="page">
      <Navbar
        user={user}
        onLogin={() => scrollToAuth('login')}
        onSignup={() => scrollToAuth('signup')}
        onLogout={onLogout}
        loggingOut={loggingOut}
      />

      {flash ? (
        <div className={`toast toast-${flash.tone}`} role="status">
          <span>{flash.text}</span>
          <button type="button" onClick={onDismissFlash} aria-label="Dismiss notification">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      ) : null}

      <main>
        <section className="hero-cloud" id="top" ref={heroRef}>
          <div className="hero-cloud-stage">
            <div className="cloudscape" aria-hidden="true">
              <div className="cloud-layer cloud-layer-1">
                <svg viewBox="0 0 1600 460" preserveAspectRatio="none">
                  <defs>
                    <radialGradient id="cloud-gradient-1">
                      <stop offset="0%" stopColor="#7da2ff" stopOpacity="0.72" />
                      <stop offset="52%" stopColor="#7da2ff" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#7da2ff" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  <ellipse cx="230" cy="310" rx="430" ry="150" fill="url(#cloud-gradient-1)" />
                  <ellipse cx="760" cy="270" rx="500" ry="175" fill="url(#cloud-gradient-1)" />
                  <ellipse cx="1300" cy="320" rx="470" ry="155" fill="url(#cloud-gradient-1)" />
                </svg>
              </div>

              <div className="cloud-layer cloud-layer-2">
                <svg viewBox="0 0 1600 460" preserveAspectRatio="none">
                  <defs>
                    <radialGradient id="cloud-gradient-2">
                      <stop offset="0%" stopColor="#a7bfff" stopOpacity="0.7" />
                      <stop offset="55%" stopColor="#a7bfff" stopOpacity="0.26" />
                      <stop offset="100%" stopColor="#a7bfff" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  <ellipse cx="360" cy="280" rx="440" ry="145" fill="url(#cloud-gradient-2)" />
                  <ellipse cx="980" cy="320" rx="480" ry="160" fill="url(#cloud-gradient-2)" />
                  <ellipse cx="1490" cy="270" rx="360" ry="130" fill="url(#cloud-gradient-2)" />
                </svg>
              </div>

              <div className="cloud-layer cloud-layer-3">
                <svg viewBox="0 0 1600 460" preserveAspectRatio="none">
                  <defs>
                    <radialGradient id="cloud-gradient-3">
                      <stop offset="0%" stopColor="#7ff2d4" stopOpacity="0.68" />
                      <stop offset="54%" stopColor="#7ff2d4" stopOpacity="0.24" />
                      <stop offset="100%" stopColor="#7ff2d4" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  <ellipse cx="280" cy="330" rx="400" ry="135" fill="url(#cloud-gradient-3)" />
                  <ellipse cx="820" cy="280" rx="470" ry="160" fill="url(#cloud-gradient-3)" />
                  <ellipse cx="1390" cy="330" rx="430" ry="145" fill="url(#cloud-gradient-3)" />
                </svg>
              </div>

              <div className="cloud-layer cloud-layer-4">
                <svg viewBox="0 0 1600 460" preserveAspectRatio="none">
                  <defs>
                    <radialGradient id="cloud-gradient-4">
                      <stop offset="0%" stopColor="#42f5c5" stopOpacity="0.6" />
                      <stop offset="58%" stopColor="#42f5c5" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#42f5c5" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  <ellipse cx="320" cy="360" rx="440" ry="150" fill="url(#cloud-gradient-4)" />
                  <ellipse cx="940" cy="300" rx="460" ry="155" fill="url(#cloud-gradient-4)" />
                  <ellipse cx="1520" cy="350" rx="380" ry="135" fill="url(#cloud-gradient-4)" />
                </svg>
              </div>
            </div>

            <div className="hero-cloud-top">
              <span className="hero-cloud-brand">CloudCraft Journal</span>
              <a className="hero-cloud-news" href="#industry">
                <span>New</span>
                Industry pulse
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>
              <span className="hero-cloud-issue">Vol. 01 / 2026</span>
            </div>

            <div className="hero-cloud-main">
              <div className="hero-cloud-copy">
                <span className="hero-cloud-kicker">
                  <span className="pulse-dot" />
                  The cloud engineering journal
                </span>
                <h1>
                  Cloud moves <em>fast.</em>
                  <span>Stay ahead.</span>
                </h1>
                <p>
                  Deep, practical guides on Kubernetes, Terraform, and platform engineering.
                  Written by engineers who have debugged it at 2am, so you do not have to.
                </p>
                <div className="hero-cloud-actions">
                  <a className="hero-cloud-primary" href="#articles">
                    Explore field notes
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </a>
                  <Link className="hero-cloud-secondary" to={writePath}>
                    {writeLabel}
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
                      <path d="m13.5 6.5 3 3" />
                    </svg>
                  </Link>
                </div>
                <div className="hero-cloud-topics" aria-label="Popular topics">
                  <span>Browse</span>
                  {['Kubernetes', 'Terraform', 'CI/CD'].map((topic) => (
                    <button key={topic} type="button" onClick={() => handleTopicClick(topic)}>
                      {topic}
                    </button>
                  ))}
                </div>
                <div className="hero-cloud-meta">
                  <span>
                    <strong>2,400+</strong> engineers read weekly
                  </span>
                  <span className="hero-cloud-dot" aria-hidden="true" />
                  <span>New field note every week</span>
                </div>
              </div>

              <div className="hero-cloud-art">
                {featuredStatus === 'loading' ? (
                  <div className="hero-cloud-feature hero-cloud-feature-loading" role="status">
                    <span className="auth-loader" aria-hidden="true" />
                    <p>Finding the latest field note...</p>
                  </div>
                ) : null}

                {featuredStatus === 'error' ? (
                  <div className="hero-cloud-feature hero-cloud-feature-empty">
                    <span className="hero-cloud-card-kicker">Inside the journal</span>
                    <h2>Rollouts, runbooks, and the lessons between.</h2>
                    <p>
                      Read practical field notes on Kubernetes, Terraform, CI/CD, and platform
                      engineering.
                    </p>
                    <a className="hero-cloud-card-cta" href="#articles">
                      Browse the journal
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </a>
                  </div>
                ) : null}

                {featuredStatus === 'ready' && featuredArticle ? (
                  <Link className="hero-cloud-feature" to={`/posts/${featuredArticle.slug}`}>
                    <div
                      className={`hero-cloud-cover tone-${featuredArticle.tone}${
                        featuredArticle.coverImage ? ' has-image' : ''
                      }`}
                    >
                      {featuredArticle.coverImage ? (
                        <img
                          src={featuredArticle.coverImage}
                          alt=""
                          referrerPolicy="no-referrer"
                          onError={(event) => {
                            event.currentTarget.hidden = true
                          }}
                        />
                      ) : null}
                      <span className="hero-cloud-card-kicker">Featured field note</span>
                      <span className="hero-cloud-cover-category">{featuredArticle.category}</span>
                      <span className="hero-cloud-cover-index" aria-hidden="true">
                        01
                      </span>
                    </div>
                    <div className="hero-cloud-feature-body">
                      <div className="hero-cloud-feature-meta">
                        <span>{featuredArticle.date}</span>
                        <span>{featuredArticle.readTime}</span>
                      </div>
                      <h2>{featuredArticle.title}</h2>
                      <div className="hero-cloud-feature-foot">
                        <span className="hero-cloud-author">
                          <span className="hero-cloud-avatar" aria-hidden="true">
                            {getInitials(featuredArticle.author)}
                          </span>
                          {featuredArticle.author}
                        </span>
                        <span className="hero-cloud-read">
                          Read story
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M5 12h14M13 6l6 6-6 6" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </Link>
                ) : null}

                {featuredStatus === 'ready' && !featuredArticle ? (
                  <div className="hero-cloud-feature hero-cloud-feature-empty">
                    <span className="hero-cloud-card-kicker">The journal starts here</span>
                    <h2>Your first field note could be here.</h2>
                    <p>
                      Share a rollout, a runbook, or the bug that taught you something worth
                      keeping.
                    </p>
                    <Link className="hero-cloud-card-cta" to={writePath}>
                      Publish a post
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="hero-cloud-bottom">
              <span className="hero-cloud-tags">
                Kubernetes · Terraform · Platform engineering · Observability · CI/CD · SRE
              </span>
              <span className="hero-cloud-scroll">
                Scroll to explore
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5v14M6 13l6 6 6-6" />
                </svg>
              </span>
            </div>
          </div>
        </section>

        <section className="topics-section" id="topics" aria-labelledby="topics-heading">
          <div className="container">
            <div className="topics-heading">
              <h2 id="topics-heading">Explore by topic</h2>
              <p>Pick a lane. Go deep.</p>
            </div>
            <div className="topic-strip">
              {topics.map((topic) => (
                <button
                  className={`topic-chip ${filters.category === topic ? 'active' : ''}`}
                  type="button"
                  key={topic}
                  onClick={() => handleTopicClick(topic)}
                  aria-pressed={filters.category === topic}
                >
                  <span aria-hidden="true" />
                  {topic}
                </button>
              ))}
            </div>
          </div>
        </section>

        <TrendingPosts />

        <section className="feed-section" id="articles" aria-labelledby="articles-heading">
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="section-kicker">Latest field notes</span>
                <h2 id="articles-heading">Fresh from the trenches</h2>
              </div>
              <p>No fluff. Just the patterns, trade-offs, and commands that survived contact with production.</p>
            </div>

            <div className="feed-tools">
              <form className="feed-search" onSubmit={handleSearchSubmit}>
                <input
                  type="search"
                  placeholder="Search articles by title or excerpt"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  aria-label="Search articles"
                />
                <button className="btn ghost compact" type="submit">
                  Search
                </button>
              </form>

              {hasFilters ? (
                <div className="feed-filter-summary">
                  <span>
                    {filters.category ? `Topic: ${filters.category}` : 'All topics'}
                    {filters.tag ? ` / Tag: #${filters.tag}` : ''}
                    {filters.search ? ` / Search: "${filters.search}"` : ''}
                  </span>
                  <button className="text-button" type="button" onClick={clearFilters}>
                    Clear filters
                  </button>
                </div>
              ) : null}
            </div>

            {feedStatus === 'loading' ? (
              <p className="feed-status" role="status">
                Loading the latest field notes...
              </p>
            ) : null}

            {feedStatus === 'error' ? (
              <div className="feed-status feed-status-error" role="alert">
                <p>{feedError || 'Could not load articles. Make sure the API is running, then try again.'}</p>
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => setFeedAttempt((value) => value + 1)}
                >
                  Try again
                </button>
              </div>
            ) : null}

            {feedStatus === 'ready' && displayedArticles.length === 0 ? (
              <p className="feed-status">
                {hasFilters
                  ? 'No articles match those filters.'
                  : articles.length > 0
                    ? 'The featured field note is the only story so far. More soon.'
                    : 'No articles published yet. Check back soon.'}
              </p>
            ) : null}

            {displayedArticles.length > 0 && feedStatus !== 'loading' ? (
              <div className="article-grid">
                {displayedArticles.map((article, index) => (
                  <ArticleCard article={article} index={index} key={article.id} />
                ))}
              </div>
            ) : null}

            {feedStatus === 'ready' && displayedArticles.length > 0 && hasMore ? (
              <div className="feed-more">
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading more...' : 'Load more articles'}
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <ExternalFeed />

        <section className="write-section" id="write" aria-labelledby="write-heading">
          <div className="container">
            <div className="write-card">
              <div className="write-copy">
                <span className="section-kicker">Publish with CloudCraft</span>
                <h2 id="write-heading">Your hard-won lesson deserves an audience.</h2>
                <p>
                  Turn a runbook, a debugging session, or a production win into a clear field note.
                  Draft it, add an optional cover image, and publish it to the feed.
                </p>
                <div className="write-steps">
                  <span>
                    <strong>01</strong> Draft your story
                  </span>
                  <span>
                    <strong>02</strong> Preview the details
                  </span>
                  <span>
                    <strong>03</strong> Publish to the feed
                  </span>
                </div>
              </div>
              <div className="write-action">
                <Link className="btn primary large" to={writePath}>
                  {writeLabel}
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
                <p>
                  {canPublish
                    ? 'Your editor is one click away.'
                    : user
                      ? 'Enable author access from your dashboard to publish.'
                      : 'Create a free account, then enable author access when you are ready.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="about-section" id="about" aria-labelledby="about-heading">
          <div className="container">
            <div className="about-card">
              <div className="about-intro">
                <span className="section-kicker">Why CloudCraft</span>
                <h2 id="about-heading">The signal, not the noise.</h2>
                <p>
                  Every article starts with a real problem: a failed rollout, a leaky bill, a
                  pipeline that takes forty minutes. We show the reasoning, the trade-offs, and the
                  code you can run today.
                </p>
              </div>
              <div className="about-points">
                <article className="about-point">
                  <span>01</span>
                  <h3>Built in production</h3>
                  <p>Real rollouts, incidents, and bills. Not theoretical architecture diagrams.</p>
                </article>
                <article className="about-point">
                  <span>02</span>
                  <h3>Trade-offs included</h3>
                  <p>What broke, what it cost, and when the simpler option wins.</p>
                </article>
                <article className="about-point">
                  <span>03</span>
                  <h3>Ready to run</h3>
                  <p>Commands, manifests, and pipelines you can adapt on the next deploy.</p>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section className="join-section" id="join" aria-labelledby="join-heading">
          <div className="container join-grid">
            <div className="join-copy">
              <span className="eyebrow">
                <span className="pulse-dot" />
                The weekly dispatch
              </span>
              <h2 id="join-heading">Read deeply. Ship better. Share what you learn.</h2>
              <p>
                Create a free account to save your place, join the discussion, and publish your own
                field notes when you are ready.
              </p>
              <ul className="join-list">
                <li>Practical deep dives without the vendor pitch</li>
                <li>Comment and compare notes with other builders</li>
                <li>Publish when you have something worth sharing</li>
              </ul>
            </div>

            <div className="auth-shell join-auth">
              <div className="auth-glow" aria-hidden="true" />
              {!sessionChecked ? (
                <div className="auth-card auth-loading" role="status" aria-live="polite">
                  <span className="auth-loader" aria-hidden="true" />
                  <h2>Checking your session</h2>
                  <p>Getting your account ready...</p>
                </div>
              ) : user ? (
                <AccountPanel user={user} onLogout={onLogout} loggingOut={loggingOut} />
              ) : (
                <AuthCard
                  mode={authMode}
                  onModeChange={setAuthMode}
                  onAuthenticated={onAuthenticated}
                />
              )}
              <p className="auth-legal">
                Your session is secured by an httpOnly cookie issued by the CloudCraft API.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer onLogin={() => scrollToAuth('login')} onSignup={() => scrollToAuth('signup')} />
    </div>
  )
}

export default Home
