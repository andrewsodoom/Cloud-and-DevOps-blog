import { useState } from 'react'
import { getContentSuggestions } from '../services/aiService'

function AiSuggestions({ draft, onApplyTitle, onApplyExcerpt, onApplyTags }) {
  const [status, setStatus] = useState('idle')
  const [suggestions, setSuggestions] = useState(null)
  const [provider, setProvider] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const requestSuggestions = async () => {
    setStatus('loading')
    setError('')

    try {
      const payload = await getContentSuggestions(draft)

      setSuggestions(payload.suggestions)
      setProvider(payload.provider)
      setNotice(payload.notice || '')
      setStatus('ready')
    } catch (requestError) {
      setError(requestError.message || 'Could not generate suggestions.')
      setStatus('error')
    }
  }

  return (
    <section className="ai-panel" aria-labelledby="ai-heading">
      <div className="ai-panel-head">
        <div>
          <span className="ai-kicker">AI writing assistant</span>
          <h2 id="ai-heading">Sharpen the headline and discovery</h2>
          <p>Get title options, a summary, tags, and a search preview from your draft.</p>
        </div>
        <button
          className="btn ghost compact"
          type="button"
          onClick={requestSuggestions}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Thinking...' : 'Suggest improvements'}
        </button>
      </div>

      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}

      {status === 'ready' && suggestions ? (
        <div className="ai-results">
          <div className="ai-result-meta">
            <span className={`ai-provider ${provider}`}>
              {provider === 'openai' ? 'OpenAI' : 'Local model'}
            </span>
            {notice ? <span>{notice}</span> : null}
          </div>

          {suggestions.titles?.length > 0 ? (
            <div className="ai-result-block">
              <h3>Headline options</h3>
              <div className="ai-title-options">
                {suggestions.titles.map((title) => (
                  <button type="button" key={title} onClick={() => onApplyTitle(title)}>
                    <span>{title}</span>
                    <strong>Use title</strong>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {suggestions.excerpt ? (
            <div className="ai-result-block">
              <h3>Suggested summary</h3>
              <p className="ai-excerpt">{suggestions.excerpt}</p>
              <button
                className="text-button"
                type="button"
                onClick={() => onApplyExcerpt(suggestions.excerpt)}
              >
                Use this summary
              </button>
            </div>
          ) : null}

          {suggestions.tags?.length > 0 ? (
            <div className="ai-result-block">
              <h3>Suggested tags</h3>
              <div className="ai-tag-options">
                {suggestions.tags.map((tag) => (
                  <button type="button" key={tag} onClick={() => onApplyTags([tag])}>
                    + {tag}
                  </button>
                ))}
              </div>
              <button
                className="text-button"
                type="button"
                onClick={() => onApplyTags(suggestions.tags)}
              >
                Add all tags
              </button>
            </div>
          ) : null}

          {suggestions.seoTitle ? (
            <div className="ai-seo-preview">
              <span>Search preview</span>
              <strong>{suggestions.seoTitle}</strong>
              <p>{suggestions.seoDescription || suggestions.excerpt}</p>
              <small>cloudcraft.journal / field-notes</small>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

export default AiSuggestions
