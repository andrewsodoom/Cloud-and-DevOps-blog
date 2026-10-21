import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../component/Navbar'
import Footer from '../component/Footer'
import { updateProfile } from '../services/userService'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function AccountSettings({ user, sessionChecked, loggingOut, onLogout, onUserUpdated }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    currentPassword: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const goToAuth = (mode) => navigate(`/?auth=${mode}#join`)

  useEffect(() => {
    setForm((current) => ({
      ...current,
      name: user?.name || '',
      email: user?.email || '',
    }))
  }, [user?.id, user?.name, user?.email])

  const updateField = (event) => {
    const { name, value } = event.target

    setForm((current) => ({ ...current, [name]: value }))
    setMessage('')
    setError('')
    setErrors((current) => {
      if (!current[name]) return current

      const next = { ...current }
      delete next[name]
      return next
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = {}
    const name = form.name.trim()
    const email = form.email.trim()

    if (name.length < 2) {
      nextErrors.name = 'Name must be at least 2 characters.'
    } else if (name.length > 80) {
      nextErrors.name = 'Name must be 80 characters or fewer.'
    }

    if (!EMAIL_PATTERN.test(email)) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (form.password.length > 0) {
      if (form.password.length < 8) {
        nextErrors.password = 'Password must be at least 8 characters.'
      } else if (form.password.length > 72) {
        nextErrors.password = 'Password must be 72 characters or fewer.'
      }

      if (!form.currentPassword) {
        nextErrors.currentPassword = 'Enter your current password to set a new one.'
      }

      if (form.password !== form.confirmPassword) {
        nextErrors.confirmPassword = 'Passwords do not match.'
      }
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    const payload = { name, email }

    if (form.password) {
      payload.password = form.password
      payload.currentPassword = form.currentPassword
    }

    setSaving(true)
    setMessage('')
    setError('')

    try {
      const result = await updateProfile(payload)

      onUserUpdated(result.user)
      setForm((current) => ({
        ...current,
        currentPassword: '',
        password: '',
        confirmPassword: '',
      }))
      setMessage('Account updated.')
    } catch (updateError) {
      if (updateError.errors && typeof updateError.errors === 'object') {
        setErrors(updateError.errors)
      }

      setError(updateError.message || 'Could not update your account.')
    } finally {
      setSaving(false)
    }
  }

  const shell = (content) => (
    <div className="page">
      <Navbar
        user={user}
        onLogin={() => goToAuth('login')}
        onSignup={() => goToAuth('signup')}
        onLogout={onLogout}
        loggingOut={loggingOut}
      />
      <main className="dashboard-main">
        <div className="container">{content}</div>
      </main>
      <Footer onLogin={() => goToAuth('login')} onSignup={() => goToAuth('signup')} />
    </div>
  )

  if (!sessionChecked) {
    return shell(
      <p className="feed-status" role="status">
        Checking your session...
      </p>,
    )
  }

  if (!user) {
    return shell(
      <div className="dashboard-gate">
        <span className="section-kicker">Account</span>
        <h1>Log in to manage your account.</h1>
        <p>Update your name, email, and password after signing in.</p>
        <div className="dashboard-gate-actions">
          <button className="btn primary" type="button" onClick={() => goToAuth('login')}>
            Log in
          </button>
          <Link className="btn ghost" to="/">
            Back to articles
          </Link>
        </div>
      </div>,
    )
  }

  return shell(
    <>
      <header className="dashboard-header">
        <div>
          <span className="section-kicker">Account</span>
          <h1>Account settings</h1>
          <p>Keep your profile details and password up to date.</p>
        </div>
        <div className="dashboard-header-actions">
          <span className="dashboard-role">{user.role}</span>
          <Link className="btn ghost" to="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </header>

      <form className="settings-form" onSubmit={handleSubmit} noValidate>
        <section className="settings-section">
          <div className="settings-heading">
            <h2>Profile</h2>
            <p>This is how you appear on comments and published posts.</p>
          </div>

          <div className="editor-grid">
            <div className="editor-field">
              <label htmlFor="settings-name">Name</label>
              <input
                id="settings-name"
                name="name"
                type="text"
                autoComplete="name"
                maxLength={80}
                value={form.name}
                onChange={updateField}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name ? <p className="field-error">{errors.name}</p> : null}
            </div>

            <div className="editor-field">
              <label htmlFor="settings-email">Email</label>
              <input
                id="settings-email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={updateField}
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email ? <p className="field-error">{errors.email}</p> : null}
            </div>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-heading">
            <h2>Password</h2>
            <p>Leave these blank if you do not want to change your password.</p>
          </div>

          <div className="editor-field">
            <label htmlFor="settings-current-password">Current password</label>
            <input
              id="settings-current-password"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={updateField}
              aria-invalid={Boolean(errors.currentPassword)}
            />
            {errors.currentPassword ? (
              <p className="field-error">{errors.currentPassword}</p>
            ) : null}
          </div>

          <div className="editor-grid">
            <div className="editor-field">
              <label htmlFor="settings-password">New password</label>
              <input
                id="settings-password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={updateField}
                aria-invalid={Boolean(errors.password)}
              />
              {errors.password ? <p className="field-error">{errors.password}</p> : null}
            </div>

            <div className="editor-field">
              <label htmlFor="settings-confirm-password">Confirm new password</label>
              <input
                id="settings-confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={updateField}
                aria-invalid={Boolean(errors.confirmPassword)}
              />
              {errors.confirmPassword ? (
                <p className="field-error">{errors.confirmPassword}</p>
              ) : null}
            </div>
          </div>
        </section>

        {error ? (
          <p className="form-message dashboard-error" role="alert">
            {error}
          </p>
        ) : null}

        {message ? (
          <p className="form-message" role="status">
            {message}
          </p>
        ) : null}

        <div className="editor-actions">
          <Link className="btn ghost" to="/dashboard">
            Cancel
          </Link>
          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
    </>
  )
}

export default AccountSettings
