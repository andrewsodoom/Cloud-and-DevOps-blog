import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listExternalArticles } from '../services/externalService'
import { formatDate } from '../utils/posts'

const DISPLAY_LIMIT = 9

function sourceInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function ExternalCard({ article }) {
  const sourceName = article.source?.name || 'Industry'
  const published = article.publishedAt ? formatDate(article.publishedAt) : 'Recently'

  return (
    <Link
      className="external-card"
      to={`/industry/${article.id}`}
      aria-label={`Read ${article.title} from ${sourceName}`}
    >
      <div className="external-cover">
        <span className="external-cover-fallback" aria-hidden="true">
          {sourceInitials(sourceName)}
        </span>
        {article.image ? (
          <img
            src={article.image}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(event) => {
              event.currentTarget.hidden = true
            }}
          />
        ) : null}
        <span className="external-source">{sourceName}</span>
      </div>

      <div className="external-body">
        <div className="external-meta">
          <span>{published}</span>
          {article.tags?.length > 0 ? <span>#{article.tags[0]}</span> : null}
        </div>
        <h3>{article.title}</h3>
        {article.excerpt ? <p>{article.excerpt}</p> : null}
        <div className="external-footer">
          <span>{article.author || sourceName}</span>
          <span className="external-cta">
            Read article
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  )
}

function ExternalFeed() {
  const [articles, setArticles] = useState([])
  const [sources, setSources] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    setStatus('loading')
    setError('')

    listExternalArticles({ limit: DISPLAY_LIMIT }, controller.signal)
      .then((payload) => {
        if (!active) return

        setArticles(payload.articles || [])
        setSources(payload.sources || [])
        setStatus('ready')
      })
      .catch((requestError) => {
        if (requestError.name === 'AbortError' || !active) return

        setError(requestError.message || 'Could not load industry stories.')
        setStatus('error')
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [attempt])

  const availableSources = sources.filter((source) => source.count > 0)

  return (
    <section className="external-section" id="industry" aria-labelledby="industry-heading">
      <div className="container">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Beyond CloudCraft</span>
            <h2 id="industry-heading">The industry pulse</h2>
          </div>
          <p>
            Cloud and DevOps stories from other trusted sources, including The New Stack,
            LinkedIn Engineering, CNCF, Kubernetes, AWS, and HashiCorp.
          </p>
        </div>

        {status === 'loading' ? (
          <p className="feed-status" role="status">
            Gathering the latest stories from around the industry...
          </p>
        ) : null}

        {status === 'error' ? (
          <div className="feed-status feed-status-error" role="alert">
            <p>
              {error || 'Could not load industry stories right now. Please try again in a moment.'}
            </p>
            <button
              className="btn ghost"
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Try again
            </button>
          </div>
        ) : null}

        {status === 'ready' && articles.length === 0 ? (
          <p className="feed-status">
            No industry stories are available right now. Check back shortly.
          </p>
        ) : null}

        {articles.length > 0 ? (
          <div className="external-grid">
            {articles.map((article) => (
              <ExternalCard article={article} key={article.id} />
            ))}
          </div>
        ) : null}

        {availableSources.length > 0 ? (
          <div className="external-sources" aria-label="Industry sources">
            <span>Sources</span>
            {availableSources.map((source) => (
              <span className="external-source-pill" key={source.id}>
                {source.name}
              </span>
            ))}
          </div>
        ) : null}

        {articles.length > 0 ? (
          <p className="external-note">
            Stories are published by their original sources and presented here for convenient
            reading. All rights remain with the publishers.
          </p>
        ) : null}
      </div>
    </section>
  )
}

export default ExternalFeed
