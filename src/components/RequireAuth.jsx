import { useSelector } from 'react-redux'
import { Navigate, useLocation } from 'react-router-dom'

function RequireAuth({ children }) {
  const reduxToken = useSelector(s => s.auth.token)
  const reduxUser = useSelector(s => s.auth.user)
  const location = useLocation()

  // Fallback to localStorage so refreshes or persisted sessions don't force-login
  const lsToken = (() => { try { return localStorage.getItem('token') } catch { return null } })()
  const lsUser = (() => { try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null } })()

  const isAuthenticated = !!(reduxToken || lsToken || (reduxUser && (reduxUser.id || reduxUser._id)) || (lsUser && (lsUser.id || lsUser._id)))

  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

export default RequireAuth

