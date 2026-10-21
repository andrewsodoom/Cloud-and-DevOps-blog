import { useLocation, useNavigate } from 'react-router-dom'

export function useSectionLink() {
  const location = useLocation()
  const navigate = useNavigate()

  return (id) => (event) => {
    if (event) {
      event.preventDefault()
    }

    if (location.pathname === '/') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.history.replaceState(null, '', `#${id}`)
      return
    }

    navigate(`/#${id}`)
  }
}
