import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import PostDetail from './pages/PostDetail'
import ExternalArticle from './pages/ExternalArticle'
import AuthorProfile from './pages/AuthorProfile'
import Dashboard from './pages/Dashboard'
import AdminUsers from './pages/AdminUsers'
import AdminAnalytics from './pages/AdminAnalytics'
import Bookmarks from './pages/Bookmarks'
import AccountSettings from './pages/AccountSettings'
import { getCurrentUser, logout } from './services/authService'
import { applySeo } from './utils/seo'

function RouteSeoGuard() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (!/^\/(dashboard|admin|bookmarks|settings)(\/|$)/.test(pathname)) return

    applySeo({
      title: 'Private workspace',
      description: 'Sign in to manage your CloudCraft Journal workspace.',
      path: pathname,
      noIndex: true,
    })
  }, [pathname])

  return null
}

function App() {
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [flash, setFlash] = useState(null)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    let active = true

    getCurrentUser()
      .then((currentUser) => {
        if (active) setUser(currentUser)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setSessionChecked(true)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!flash) return undefined

    const timer = window.setTimeout(() => setFlash(null), 4500)

    return () => window.clearTimeout(timer)
  }, [flash])

  const handleAuthenticated = (nextUser) => {
    setUser(nextUser)
    setFlash({ tone: 'success', text: `You are signed in as ${nextUser.email}.` })
    window.history.replaceState(null, '', window.location.pathname)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleLogout = async () => {
    setLoggingOut(true)

    try {
      await logout()
      setUser(null)
      setFlash({ tone: 'info', text: 'You have been logged out.' })
    } catch (error) {
      setFlash({
        tone: 'info',
        text: error.message || 'Could not log out. Please try again.',
      })
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <BrowserRouter>
      <RouteSeoGuard />
      <Routes>
        <Route
          path="/"
          element={
            <Home
              user={user}
              sessionChecked={sessionChecked}
              loggingOut={loggingOut}
              authMode={authMode}
              setAuthMode={setAuthMode}
              flash={flash}
              onDismissFlash={() => setFlash(null)}
              onAuthenticated={handleAuthenticated}
              onLogout={handleLogout}
            />
          }
        />
        <Route
          path="/posts/:slug"
          element={
            <PostDetail
              user={user}
              loggingOut={loggingOut}
              onLogout={handleLogout}
            />
          }
        />
        <Route
          path="/industry/:id"
          element={
            <ExternalArticle
              user={user}
              loggingOut={loggingOut}
              onLogout={handleLogout}
            />
          }
        />
        <Route
          path="/authors/:id"
          element={
            <AuthorProfile
              user={user}
              loggingOut={loggingOut}
              onLogout={handleLogout}
            />
          }
        />
        <Route
          path="/dashboard/*"
          element={
            <Dashboard
              user={user}
              sessionChecked={sessionChecked}
              loggingOut={loggingOut}
              onLogout={handleLogout}
              onUserUpdated={setUser}
            />
          }
        />
        <Route
          path="/admin"
          element={
            <AdminUsers
              user={user}
              sessionChecked={sessionChecked}
              loggingOut={loggingOut}
              onLogout={handleLogout}
            />
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <AdminAnalytics
              user={user}
              sessionChecked={sessionChecked}
              loggingOut={loggingOut}
              onLogout={handleLogout}
            />
          }
        />
        <Route
          path="/bookmarks"
          element={
            <Bookmarks
              user={user}
              sessionChecked={sessionChecked}
              loggingOut={loggingOut}
              onLogout={handleLogout}
            />
          }
        />
        <Route
          path="/settings"
          element={
            <AccountSettings
              user={user}
              sessionChecked={sessionChecked}
              loggingOut={loggingOut}
              onLogout={handleLogout}
              onUserUpdated={setUser}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
