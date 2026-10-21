import { useState } from 'react'
import { login, register } from '../services/authService'

const emptyForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  remember: true,
  terms: false,
}

function validate(form, mode) {
  const errors = {}
  const email = form.email.trim()

  if (!email) {
    errors.email = 'Email is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address.'
  }

  if (!form.password) {
    errors.password = 'Password is required.'
  } else if (form.password.length < 8) {
    errors.password = 'Use at least 8 characters.'
  }

  if (form.password.length > 72) {
    errors.password = 'Use 72 characters or fewer.'
  }

  if (mode === 'signup') {
    if (form.name.trim().length < 2) {
      errors.name = 'Tell us your name (at least 2 characters).'
    } else if (form.name.trim().length > 80) {
      errors.name = 'Name must be 80 characters or fewer.'
    }

    if (!form.confirmPassword) {
      errors.confirmPassword = 'Confirm your password.'
    } else if (form.confirmPassword !== form.password) {
      errors.confirmPassword = 'Passwords do not match.'
    }

    if (!form.terms) {
      errors.terms = 'Please accept the terms to continue.'
    }
  }

  return errors
}

function AuthCard({ mode, onModeChange, onAuthenticated }) {
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const isSignup = mode === 'signup'

  const changeMode = (nextMode) => {
    onModeChange(nextMode)
    setErrors({})
    setMessage('')
    setShowPassword(false)
    setForm((current) => ({
      ...emptyForm,
      email: current.email,
      remember: current.remember,
    }))
  }

  const updateField = (event) => {
    const { name, value, type, checked } = event.target

    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))

    setErrors((current) => {
      if (!current[name]) return current
      const next = { ...current }
      delete next[name]
      return next
    })
    setMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = validate(form, mode)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      setMessage('')
      return
    }

    setSubmitting(true)
    setMessage('')

    try {
      const nextUser = isSignup
        ? await register({
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password,
          })
        : await login({
            email: form.email.trim(),
            password: form.password,
          })

      onAuthenticated(nextUser)
    } catch (error) {
      if (error?.errors && typeof error.errors === 'object') {
        setErrors(error.errors)
      }

      setMessage(error?.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleForgotPassword = () => {
    setMessage('Password reset is not available yet.')
  }

  return (
    <div className="auth-card">
      <div className="auth-heading">
        <span className="auth-badge">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3 5 6v5c0 4.6 2.9 8.1 7 10 4.1-1.9 7-5.4 7-10V6l-7-3Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          Member access
        </span>
        <h2>{isSignup ? 'Create your account' : 'Welcome back'}</h2>
        <p>
          {isSignup
            ? 'Join 2,400+ engineers getting practical cloud and DevOps guides every week.'
            : 'Log in to save articles, follow topics, and pick up where you left off.'}
        </p>
      </div>

      <div className="auth-tabs" role="tablist" aria-label="Authentication">
        <button
          className={!isSignup ? 'active' : ''}
          type="button"
          role="tab"
          aria-selected={!isSignup}
          aria-controls="auth-panel"
          onClick={() => changeMode('login')}
        >
          Log in
        </button>
        <button
          className={isSignup ? 'active' : ''}
          type="button"
          role="tab"
          aria-selected={isSignup}
          aria-controls="auth-panel"
          onClick={() => changeMode('signup')}
        >
          Sign up
        </button>
      </div>

      <form
        className="auth-form"
        id="auth-panel"
        role="tabpanel"
        noValidate
        onSubmit={handleSubmit}
      >
        {isSignup ? (
          <div className="field">
            <label htmlFor="auth-name">Full name</label>
            <div className="input-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20c1-4 3.5-6 7-6s6 2 7 6" />
              </svg>
              <input
                id="auth-name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Ada Lovelace"
                value={form.name}
                onChange={updateField}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'auth-name-error' : undefined}
              />
            </div>
            {errors.name ? (
              <p className="field-error" id="auth-name-error">
                {errors.name}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="auth-email">Email address</label>
          <div className="input-wrap">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m4 7 8 6 8-6" />
            </svg>
            <input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={updateField}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'auth-email-error' : undefined}
            />
          </div>
          {errors.email ? (
            <p className="field-error" id="auth-email-error">
              {errors.email}
            </p>
          ) : null}
        </div>

        <div className="field">
          <div className="label-row">
            <label htmlFor="auth-password">Password</label>
            {!isSignup ? (
              <button className="inline-link" type="button" onClick={handleForgotPassword}>
                Forgot password?
              </button>
            ) : (
              <span>8+ characters</span>
            )}
          </div>
          <div className="input-wrap">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="4" y="10" width="16" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            <input
              id="auth-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              placeholder={isSignup ? 'Create a strong password' : 'Enter your password'}
              value={form.password}
              onChange={updateField}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'auth-password-error' : undefined}
            />
            <button
              className="reveal"
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((current) => !current)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {showPassword ? (
                  <path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 5.2A10.6 10.6 0 0 1 12 5c5.5 0 9 7 9 7a16.6 16.6 0 0 1-2.3 3.1M6.2 6.6C4.2 8.2 3 12 3 12s3.5 7 9 7c1.4 0 2.7-.4 3.8-1" />
                ) : (
                  <>
                    <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </>
                )}
              </svg>
            </button>
          </div>
          {errors.password ? (
            <p className="field-error" id="auth-password-error">
              {errors.password}
            </p>
          ) : null}
        </div>

        {isSignup ? (
          <div className="field">
            <label htmlFor="auth-confirm">Confirm password</label>
            <div className="input-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="4" y="10" width="16" height="10" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              <input
                id="auth-confirm"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repeat your password"
                value={form.confirmPassword}
                onChange={updateField}
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby={errors.confirmPassword ? 'auth-confirm-error' : undefined}
              />
            </div>
            {errors.confirmPassword ? (
              <p className="field-error" id="auth-confirm-error">
                {errors.confirmPassword}
              </p>
            ) : null}
          </div>
        ) : null}

        {isSignup ? (
          <div className="check-field">
            <label>
              <input
                name="terms"
                type="checkbox"
                checked={form.terms}
                onChange={updateField}
                aria-invalid={Boolean(errors.terms)}
                aria-describedby={errors.terms ? 'auth-terms-error' : undefined}
              />
              <span>I agree to the community guidelines and privacy policy.</span>
            </label>
            {errors.terms ? (
              <p className="field-error" id="auth-terms-error">
                {errors.terms}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="check-field">
            <label>
              <input
                name="remember"
                type="checkbox"
                checked={form.remember}
                onChange={updateField}
              />
              <span>Keep me signed in on this device</span>
            </label>
          </div>
        )}

        {message ? (
          <p className="form-message" role="status">
            {message}
          </p>
        ) : null}

        <button className="btn primary wide" type="submit" disabled={submitting}>
          {submitting
            ? isSignup
              ? 'Creating account...'
              : 'Logging in...'
            : isSignup
              ? 'Create free account'
              : 'Log in'}
          {!submitting ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          ) : null}
        </button>
      </form>
    </div>
  )
}

export default AuthCard
