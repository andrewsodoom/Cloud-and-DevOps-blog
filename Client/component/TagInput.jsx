import { useState } from 'react'
import { MAX_TAGS, addTag, normalizeTag } from '../utils/tags'

const TAG_SUGGESTIONS = [
  'kubernetes',
  'terraform',
  'aws',
  'ci-cd',
  'platform-engineering',
  'observability',
  'security',
  'sre',
  'docker',
  'linux',
]

function TagInput({ value = [], onChange, error }) {
  const [input, setInput] = useState('')
  const [localError, setLocalError] = useState('')
  const suggestions = TAG_SUGGESTIONS.filter((tag) => !value.includes(tag)).slice(0, 6)

  const commit = (raw) => {
    const pieces = raw
      .split(',')
      .map((piece) => piece.trim())
      .filter(Boolean)

    if (pieces.length === 0) return

    let next = value
    let rejected = false

    for (const piece of pieces) {
      const candidate = addTag(next, piece)

      if (candidate === next && !next.includes(normalizeTag(piece))) {
        rejected = true
      }

      next = candidate
    }

    if (rejected) {
      setLocalError(
        value.length >= MAX_TAGS
          ? `You can add up to ${MAX_TAGS} tags.`
          : 'That tag could not be added.',
      )
    } else {
      setLocalError('')
    }

    onChange(next)
    setInput('')
  }

  const remove = (tag) => {
    setLocalError('')
    onChange(value.filter((item) => item !== tag))
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      commit(input)
      return
    }

    if (event.key === 'Backspace' && !input && value.length > 0) {
      remove(value[value.length - 1])
    }
  }

  return (
    <div className="editor-field tag-field">
      <label htmlFor="post-tags">
        Tags <span>Up to {MAX_TAGS}</span>
      </label>
      <div className={`tag-input ${error || localError ? 'has-error' : ''}`}>
        {value.map((tag) => (
          <span className="tag-chip" key={tag}>
            #{tag}
            <button
              type="button"
              aria-label={`Remove ${tag} tag`}
              onClick={() => remove(tag)}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id="post-tags"
          type="text"
          value={input}
          placeholder={value.length >= MAX_TAGS ? 'Tag limit reached' : 'Add a tag and press Enter'}
          onChange={(event) => {
            setInput(event.target.value)
            setLocalError('')
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => commit(input)}
          disabled={value.length >= MAX_TAGS}
          aria-invalid={Boolean(error || localError)}
        />
      </div>
      {suggestions.length > 0 ? (
        <div className="tag-suggestions" aria-label="Suggested tags">
          {suggestions.map((tag) => (
            <button
              type="button"
              key={tag}
              onClick={() => {
                if (value.length >= MAX_TAGS) {
                  setLocalError(`You can add up to ${MAX_TAGS} tags.`)
                  return
                }

                onChange(addTag(value, tag))
                setLocalError('')
              }}
            >
              + {tag}
            </button>
          ))}
        </div>
      ) : null}
      <p className="editor-help">
        Tags help readers find related field notes in search and trending topics.
      </p>
      {error || localError ? (
        <p className="field-error">{error || localError}</p>
      ) : null}
    </div>
  )
}

export default TagInput
