import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSectionLink } from '../hooks/useSectionLink'
import { useTheme } from '../hooks/useTheme'

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function Navbar({ user, onLogin, onSignup, onLogout, loggingOut }) {
  const [open, setOpen] = useState(false)
  const [theme, toggleTheme] = useTheme()
  const goToSection = useSectionLink()
  const closeMenu = () => setOpen(false)
  const navigateToSection = (id) => (event) => {
    closeMenu()
    goToSection(id)(event)
  }
  const canPublish = user?.role === 'author' || user?.role === 'admin'
  const writePath = canPublish ? '/dashboard/new' : '/dashboard'

  return (
    <header className="nav-shell">
      <div className="container nav-inner">
        <a
          className="brand"
          href="#top"
          onClick={navigateToSection('top')}
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

        <nav className={`nav-links ${open ? 'open' : ''}`} id="primary-nav" aria-label="Main navigation">
          <a href="#top" onClick={navigateToSection('top')}>
            Home
          </a>
          <a href="#articles" onClick={navigateToSection('articles')}>
            Articles
          </a>
          <a href="#topics" onClick={navigateToSection('topics')}>
            Topics
          </a>
          <a href="#industry" onClick={navigateToSection('industry')}>
            Industry
          </a>
          <a href="#about" onClick={navigateToSection('about')}>
            About
          </a>
          <Link className="nav-write" to={writePath} onClick={closeMenu}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
              <path d="m13.5 6.5 3 3" />
            </svg>
            Write
          </Link>
          {user ? (
            <>
              <Link to="/bookmarks" onClick={closeMenu}>
                Saved
              </Link>
              <Link to="/dashboard" onClick={closeMenu}>
                Dashboard
              </Link>
            </>
          ) : null}
          {user?.role === 'admin' ? (
            <Link to="/admin/analytics" onClick={closeMenu}>
              Analytics
            </Link>
          ) : null}
          {user?.role === 'admin' ? (
            <Link to="/admin" onClick={closeMenu}>
              Admin
            </Link>
          ) : null}
        </nav>

        <div className="nav-actions">
          <button
            className="theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
              </svg>
            )}
          </button>
          {user ? (
            <div className="nav-account">
              <Link className="nav-user" to="/settings" onClick={closeMenu} aria-label="Account settings">
                <span className="nav-avatar" aria-hidden="true">
                  {getInitials(user.name)}
                </span>
                <span className="nav-user-name">{user.name.split(' ')[0]}</span>
              </Link>
              <button
                className="nav-logout"
                type="button"
                onClick={onLogout}
                disabled={loggingOut}
              >
                {loggingOut ? 'Logging out...' : 'Log out'}
              </button>
            </div>
          ) : (
            <>
              <button className="btn ghost compact" type="button" onClick={onLogin}>
                Log in
              </button>
              <button className="btn primary compact" type="button" onClick={onSignup}>
                Sign up
              </button>
            </>
          )}

          <button
            className="menu-toggle"
            type="button"
            aria-expanded={open}
            aria-controls="primary-nav"
            aria-label={open ? 'Close navigation' : 'Open navigation'}
            onClick={() => setOpen((current) => !current)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {open ? (
                <path d="m6 6 12 12M18 6 6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}

export default Navbar
