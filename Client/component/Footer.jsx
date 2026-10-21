import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSectionLink } from '../hooks/useSectionLink'
import { subscribeToNewsletter } from '../services/newsletterService'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Footer({ onLogin, onSignup }) {
  const goToSection = useSectionLink()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  const handleSubscribe = async (event) => {
    event.preventDefault()
    const value = email.trim()

    if (!value) {
      setStatus('error')
      setMessage('Enter your email address.')
      return
    }

    if (!EMAIL_PATTERN.test(value)) {
      setStatus('error')
      setMessage('Enter a valid email address.')
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      const payload = await subscribeToNewsletter(value, 'footer')
      setStatus('success')
      setMessage(payload.message)
      setEmail('')
    } catch (error) {
      setStatus('error')
      setMessage(error.message || 'Could not join the list. Please try again.')
    }
  }

  return (
    <footer className="footer" id="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <a
            className="brand"
            href="#top"
            onClick={goToSection('top')}
            aria-label="CloudCraft Journal home"
          >
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32">
                <path d="M10 24h13a5 5 0 0 0 .7-9.95A7.6 7.6 0 0 0 8.8 16 4.2 4.2 0 0 0 10 24Z" />
                <path d="m13 19.5 2.6 2.5 5-5.5" />
              </svg>
            </span>
            <span className="brand-name">
              CloudCraft
              <span>Journal</span>
            </span>
          </a>
          <p>Practical cloud and DevOps writing for engineers who ship.</p>
        </div>

        <div className="footer-column">
          <h3>Explore</h3>
          <a href="#articles" onClick={goToSection('articles')}>
            Latest articles
          </a>
          <a href="#topics" onClick={goToSection('topics')}>
            Topics
          </a>
          <a href="#industry" onClick={goToSection('industry')}>
            Industry pulse
          </a>
          <a href="#about" onClick={goToSection('about')}>
            About
          </a>
        </div>

        <div className="footer-column">
          <h3>Account</h3>
          {onLogin ? (
            <button className="footer-link-button" type="button" onClick={onLogin}>
              Log in
            </button>
          ) : (
            <Link to="/?auth=login#join">Log in</Link>
          )}
          {onSignup ? (
            <button className="footer-link-button" type="button" onClick={onSignup}>
              Create account
            </button>
          ) : (
            <Link to="/?auth=signup#join">Create account</Link>
          )}
          <a href="#top" onClick={goToSection('top')}>
            Back to top
          </a>
        </div>

        <div className="footer-column footer-note">
          <h3>The weekly note</h3>
          <p>One useful idea for your cloud stack, every Wednesday.</p>
          <form className="newsletter-form" onSubmit={handleSubscribe} noValidate>
            <label className="visually-hidden" htmlFor="newsletter-email">
              Email address
            </label>
            <input
              id="newsletter-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              aria-invalid={status === 'error'}
              aria-describedby="newsletter-feedback"
              onChange={(event) => {
                setEmail(event.target.value)
                if (status !== 'loading') {
                  setStatus('idle')
                  setMessage('')
                }
              }}
              required
            />
            <button
              className="btn ghost compact"
              type="submit"
              disabled={status === 'loading'}
            >
              {status === 'loading'
                ? 'Joining...'
                : status === 'success'
                  ? 'Subscribed'
                  : 'Subscribe'}
            </button>
          </form>
          <p
            id="newsletter-feedback"
            className={`newsletter-message ${status}`}
            role="status"
            aria-live="polite"
          >
            {message || (status === 'success' ? '' : 'No spam. Just one practical idea each week.')}
          </p>
        </div>
      </div>

      <div className="container footer-bottom">
        <span>&copy; {new Date().getFullYear()} CloudCraft Journal. All rights reserved.</span>
        <span>Built for learning, one step at a time.</span>
      </div>
    </footer>
  )
}

export default Footer

