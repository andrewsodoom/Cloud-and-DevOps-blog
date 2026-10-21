import { Link } from 'react-router-dom'

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function AccountPanel({ user, onLogout, loggingOut }) {
  return (
    <div className="auth-card account-panel">
      <span className="auth-badge">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3 5 6v5c0 4.6 2.9 8.1 7 10 4.1-1.9 7-5.4 7-10V6l-7-3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        You are signed in
      </span>
      <h2>Welcome, {user.name.split(' ')[0]}.</h2>
      <p>
        Your account is connected to the CloudCraft API. Posts you publish will appear on the home
        feed.
      </p>

      <div className="account-badge">
        <span className="account-avatar" aria-hidden="true">
          {getInitials(user.name)}
        </span>
        <span>
          <strong>{user.name}</strong>
          <span>{user.email}</span>
        </span>
      </div>

      <div className="account-actions">
        <Link className="btn primary wide" to="/dashboard">
          Open your dashboard
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
        <a className="btn ghost wide" href="#articles">
          Browse articles
        </a>
        <Link className="btn ghost wide" to="/settings">
          Account settings
        </Link>
        <button className="btn ghost wide" type="button" onClick={onLogout} disabled={loggingOut}>
          {loggingOut ? 'Logging out...' : 'Log out'}
        </button>
      </div>
    </div>
  )
}

export default AccountPanel
