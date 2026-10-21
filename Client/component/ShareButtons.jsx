import { useState } from 'react'

function shareUrl(slug) {
  return `${window.location.origin}/posts/${slug}`
}

function openShareWindow(url) {
  window.open(url, '_blank', 'noopener,noreferrer,width=620,height=540')
}

function ShareButtons({ title, slug }) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const url = shareUrl(slug)
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  const copyLink = async () => {
    setError('')

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      setError('Could not copy the link. Copy it from the address bar instead.')
    }
  }

  const nativeShare = async () => {
    setError('')

    try {
      await navigator.share({ title, url })
    } catch (shareError) {
      if (shareError.name !== 'AbortError') {
        setError('Could not open the share sheet.')
      }
    }
  }

  return (
    <div className="share-block">
      <span className="share-label">Share this field note</span>
      <div className="share-buttons">
        <button
          type="button"
          className="share-button x"
          onClick={() =>
            openShareWindow(
              `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
            )
          }
          aria-label="Share on X"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 4l16 16M20 4 4 20" />
          </svg>
          X
        </button>
        <button
          type="button"
          className="share-button linkedin"
          onClick={() =>
            openShareWindow(
              `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
            )
          }
          aria-label="Share on LinkedIn"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 9v10M6 5v.01M11 19v-6a3 3 0 0 1 6 0v6M11 9v10" />
          </svg>
          LinkedIn
        </button>
        <button
          type="button"
          className="share-button facebook"
          onClick={() =>
            openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`)
          }
          aria-label="Share on Facebook"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 8h3V4h-3a5 5 0 0 0-5 5v3H7v4h3v5h4v-5h3l1-4h-4V9a1 1 0 0 1 1-1Z" />
          </svg>
          Facebook
        </button>
        <button type="button" className="share-button copy" onClick={copyLink}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" />
          </svg>
          {copied ? 'Copied' : 'Copy link'}
        </button>
        {typeof navigator.share === 'function' ? (
          <button type="button" className="share-button native" onClick={nativeShare}>
            Share...
          </button>
        ) : null}
      </div>
      {error ? <p className="share-error">{error}</p> : null}
    </div>
  )
}

export default ShareButtons
