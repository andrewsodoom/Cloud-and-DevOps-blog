import { Link } from 'react-router-dom'
import { getInitials } from '../utils/posts'

function ArticleCard({ article, index, onRemoveBookmark, removing }) {
  const hasCover = Boolean(article.coverImage)

  return (
    <div className="article-card-shell">
      <Link className="article-link" to={`/posts/${article.slug}`}>
        <article className="article-card">
        <div className={`article-cover tone-${article.tone}${hasCover ? ' has-image' : ''}`}>
          {hasCover ? (
            <img
              className="cover-image"
              src={article.coverImage}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={(event) => {
                event.currentTarget.hidden = true
              }}
            />
          ) : null}
          <span className="cover-number" aria-hidden="true">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="cover-category">{article.category}</span>
          {hasCover ? null : (
            <svg className="cover-art" viewBox="0 0 320 180" aria-hidden="true">
              <path d="M-20 145C55 145 55 68 130 68s75 77 150 77 75-77 150-77" />
              <path d="M-20 175c75 0 75-77 150-77s75 77 150 77 75-77 150-77" />
              <circle cx="130" cy="68" r="6" />
              <circle cx="280" cy="68" r="6" />
            </svg>
          )}
        </div>

        <div className="article-body">
          <div className="article-meta-top">
            <span>{article.date}</span>
            <span>{article.readTime}</span>
          </div>
          <h3>{article.title}</h3>
          <p>{article.excerpt}</p>
          {article.tags?.length > 0 ? (
            <div className="article-tags" aria-label="Article tags">
              {article.tags.slice(0, 3).map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          ) : null}
          <div className="article-author">
            <span className="author-avatar" aria-hidden="true">
              {getInitials(article.author)}
            </span>
            <span>{article.author}</span>
          </div>
        </div>
      </article>
      </Link>
      {onRemoveBookmark ? (
        <button
          className="card-bookmark-remove"
          type="button"
          onClick={() => onRemoveBookmark(article)}
          disabled={removing}
        >
          {removing ? 'Removing...' : 'Remove bookmark'}
        </button>
      ) : null}
    </div>
  )
}

export default ArticleCard
