import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../component/Navbar'
import Footer from '../component/Footer'
import Dropdown from '../component/Dropdown'
import { listUsers, updateUserRole } from '../services/userService'

const ROLES = ['reader', 'author', 'admin']
const ROLE_OPTIONS = ROLES.map((role) => ({
  value: role,
  label: role.charAt(0).toUpperCase() + role.slice(1),
}))

function formatDate(value) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getInitials(name = '') {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

  return initials || 'CC'
}

function AdminUsers({ user, sessionChecked, loggingOut, onLogout }) {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 })
  const [status, setStatus] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [updatingId, setUpdatingId] = useState(null)

  const isAdmin = user?.role === 'admin'
  const goToAuth = (mode) => navigate(`/?auth=${mode}#join`)

  useEffect(() => {
    if (!sessionChecked || !isAdmin) return undefined

    let active = true
    const controller = new AbortController()

    setStatus('loading')
    setLoadError('')

    listUsers({ page, limit: 20, search, role }, controller.signal)
      .then((payload) => {
        if (!active) return

        setUsers(payload.users || [])
        setPagination(payload.pagination || { page: 1, limit: 20, total: 0, pages: 0 })
        setStatus('ready')
      })
      .catch((error) => {
        if (error.name === 'AbortError' || !active) return

        setLoadError(error.message || 'Could not load users.')
        setStatus('error')
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [sessionChecked, isAdmin, page, search, role, attempt])

  const handleSearch = (event) => {
    event.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  const handleRoleFilter = (nextRole) => {
    setPage(1)
    setRole(nextRole)
  }

  const handleRoleChange = async (target, nextRole) => {
    setUpdatingId(target.id)
    setActionError('')
    setActionMessage('')

    try {
      const payload = await updateUserRole(target.id, nextRole)

      setUsers((current) =>
        current.map((item) =>
          item.id === target.id ? { ...item, role: payload.user.role } : item,
        ),
      )
      setActionMessage(`${target.name} is now ${payload.user.role}.`)

      if (role) {
        setAttempt((value) => value + 1)
      }
    } catch (error) {
      setActionError(error.message || 'Could not update that role.')
    } finally {
      setUpdatingId(null)
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
        <span className="section-kicker">Admin</span>
        <h1>Log in to manage users.</h1>
        <p>This area is limited to administrators.</p>
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

  if (!isAdmin) {
    return shell(
      <div className="dashboard-gate">
        <span className="section-kicker">Admin</span>
        <h1>Admins only.</h1>
        <p>Your account does not have permission to manage users.</p>
        <div className="dashboard-gate-actions">
          <Link className="btn primary" to="/dashboard">
            Go to your dashboard
          </Link>
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
          <span className="section-kicker">Admin</span>
          <h1>Manage users</h1>
          <p>Search accounts and change reader, author, or admin access.</p>
        </div>
        <div className="dashboard-header-actions">
          <Link className="btn ghost" to="/admin/analytics">
            Analytics
          </Link>
          <Link className="btn ghost" to="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </header>

      <div className="admin-toolbar">
        <form className="admin-search" onSubmit={handleSearch}>
          <input
            type="search"
            placeholder="Search name or email"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            aria-label="Search users"
          />
          <button className="btn ghost compact" type="submit">
            Search
          </button>
        </form>

        <Dropdown
          className="admin-role-filter"
          value={role}
          options={[{ value: '', label: 'All roles' }, ...ROLE_OPTIONS]}
          onChange={handleRoleFilter}
          ariaLabel="Filter by role"
        />
      </div>

      {actionError ? (
        <p className="dashboard-error" role="alert">
          {actionError}
        </p>
      ) : null}

      {actionMessage ? <p className="form-message admin-message">{actionMessage}</p> : null}

      {status === 'loading' ? (
        <p className="feed-status" role="status">
          Loading users...
        </p>
      ) : null}

      {status === 'error' ? (
        <div className="dashboard-gate">
          <p>{loadError}</p>
          <button className="btn primary" type="button" onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </button>
        </div>
      ) : null}

      {status === 'ready' && users.length === 0 ? (
        <div className="dashboard-empty">
          <h2>No users found.</h2>
          <p>Try a different search term or role filter.</p>
        </div>
      ) : null}

      {status === 'ready' && users.length > 0 ? (
        <>
          <div className="admin-list">
            {users.map((account) => (
              <article className="admin-row" key={account.id}>
                <div className="admin-user">
                  <span className="admin-avatar" aria-hidden="true">
                    {getInitials(account.name)}
                  </span>
                  <div className="admin-user-info">
                    <strong>
                      {account.name}
                      {account.id === user.id ? <span className="admin-you">You</span> : null}
                    </strong>
                    <span>{account.email}</span>
                    <span>Joined {formatDate(account.createdAt)}</span>
                  </div>
                </div>

                <div className="admin-role-control">
                  <span>Role</span>
                  <Dropdown
                    compact
                    value={account.role}
                    options={ROLE_OPTIONS}
                    onChange={(nextRole) => handleRoleChange(account, nextRole)}
                    ariaLabel={`Role for ${account.name}`}
                    disabled={account.id === user.id || updatingId === account.id}
                  />
                </div>
              </article>
            ))}
          </div>

          <div className="admin-pagination">
            <button
              className="btn ghost compact"
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={pagination.page <= 1}
            >
              Previous
            </button>
            <span>
              Page {pagination.page || 1} of {pagination.pages || 1} · {pagination.total || 0} users
            </span>
            <button
              className="btn ghost compact"
              type="button"
              onClick={() => setPage((current) => Math.min(pagination.pages || 1, current + 1))}
              disabled={pagination.page >= pagination.pages}
            >
              Next
            </button>
          </div>
        </>
      ) : null}
    </>
  )
}

export default AdminUsers
