import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Navbar from '../component/Navbar'
import Footer from '../component/Footer'
import { getExternalArticle } from '../services/externalService'
import { formatDate, getInitials } from '../utils/posts'
import useSeo from '../hooks/useSeo'
import { absoluteUrl } from '../utils/seo'

function ExternalArticle({ user, loggingOut, onLogout }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [article, setArticle] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  const goToAuth = (mode) => navigate(`/?auth=${mode}#join`)

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    setStatus('loading')
    setError('')
    setArticle(null)

    getExternalArticle(id, controller.signal)
      .then((payload) => {
        if (!active) return

        setArticle(payload.article)
        setStatus('ready')
      })
      .catch((requestError) => {
        if (requestError.name === 'AbortError' || !active) return

        setStatus('error')
        setError(
          requestError.status === 404
            ? 'That industry article could not be found.'
            : requestError.message || 'Could not load this industry article.',
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

  const sourceName = article?.source?.name || 'Industry source'

  useSeo(
    {
      title: article?.title,
      description:
        article?.excerpt ||
        'Cloud and DevOps industry context curated by CloudCraft Journal.',
      path: `/industry/${id}`,
      canonical: article?.sourceUrl || article?.url,
      image: article?.image || '/og-default.png',
      type: 'article',
      noIndex: true,
      publishedAt: article?.publishedAt,
      author: article?.author || article?.source?.name,
      section: article?.source?.name,
      tags: article?.tags || [],
      jsonLd: article
        ? [
            {
              '@type': 'NewsArticle',
              headline: article.title,
              description: article.excerpt,
              image: absoluteUrl(article.image || '/og-default.png'),
              datePublished: article.publishedAt,
              author: {
                '@type': 'Person',
                name: article.author || sourceName,
              },
              publisher: {
                '@type': 'Organization',
                name: sourceName,
              },
              isBasedOn: article.sourceUrl || article.url,
              mainEntityOfPage: article.sourceUrl || article.url,
            },
          ]
        : undefined,
    },
    [article, id],
  )

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
              Loading the story...
            </p>
          ) : null}

          {status === 'error' ? (
            <div className="post-missing">
              <p>{error}</p>
              <Link className="btn primary" to="/#industry">
                Back to industry pulse
              </Link>
            </div>
          ) : null}

          {status === 'ready' && article ? (
            <article className="post-article external-reader">
              <Link className="back-link" to="/#industry">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19 12H5M11 6l-6 6 6 6" />
                </svg>
                Back to industry pulse
              </Link>

              <div className="external-reader-meta">
                <span className="external-reader-source">{sourceName}</span>
                {article.publishedAt ? <span>{formatDate(article.publishedAt)}</span> : null}
                <span>
                  {article.hasFullContent ? `${article.readingTime || 1} min read` : 'Feed summary'}
                </span>
              </div>

              <h1>{article.title}</h1>

              {article.excerpt ? <p className="post-excerpt">{article.excerpt}</p> : null}

              {article.tags?.length > 0 ? (
                <div className="post-tags" aria-label="Article tags">
                  {article.tags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
              ) : null}

              <div className="post-byline external-reader-byline">
                <span className="post-avatar" aria-hidden="true">
                  {getInitials(article.author || sourceName)}
                </span>
                <div>
                  <strong>{article.author || sourceName}</strong>
                  <span>
                    Published by {sourceName}
                  </span>
                </div>
              </div>

              {article.image ? (
                <figure className="post-cover">
                  <img
                    src={article.image}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={(event) => {
                      event.currentTarget.closest('figure').hidden = true
                    }}
                  />
                </figure>
              ) : null}

              {article.content ? (
                <div
                  className="post-content external-reader-content"
                  dangerouslySetInnerHTML={{ __html: article.content }}
                />
              ) : null}

              {!article.hasFullContent ? (
                <p className="external-reader-notice" role="note">
                  {article.content
                    ? `${sourceName} shares only a summary in its feed.`
                    : `${sourceName} does not provide article text in its feed.`}{' '}
                  Read the full story at{' '}
                  <a
                    href={article.sourceUrl || article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {sourceName}
                  </a>
                  .
                </p>
              ) : null}

              <footer className="external-reader-attribution">
                <span>Source</span>
                <strong>{sourceName}</strong>
                <p>
                  This story was written and published by {sourceName}. CloudCraft Journal displays
                  only the content supplied by the publisher&apos;s feed or listing; all rights
                  remain with the original publisher.
                </p>
                {article.hasFullContent ? (
                  <a
                    className="external-reader-source-link"
                    href={article.sourceUrl || article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View original at {sourceName}
                  </a>
                ) : null}
              </footer>
            </article>
          ) : null}
        </div>
      </main>

      <Footer onLogin={() => goToAuth('login')} onSignup={() => goToAuth('signup')} />
    </div>
  )
}

export default ExternalArticle
