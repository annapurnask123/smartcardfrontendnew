import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '../slices/authSlice'
import { useEffect, useState } from 'react'

function AppLayout({ children }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector(s => s.auth.user)
  const notifications = useSelector(s => s.data.notifications)
  const [query, setQuery] = useState('')
  const [dark, setDark] = useState(false)

  function handleLogout() {
    dispatch(logout())
    navigate('/login')
  }

  function onGlobalSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    navigate(`/home?search=${encodeURIComponent(query.trim())}`)
  }
  useEffect(() => {
    document.body.dataset.bsTheme = dark ? 'dark' : 'light'
  }, [dark])
  return (
    <div>
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary fixed-top">
        <div className="container-fluid">
          <button className="navbar-toggler" type="button" data-bs-toggle="offcanvas" data-bs-target="#sidebar">
            <span className="navbar-toggler-icon"></span>
          </button>
          <Link className="navbar-brand" to="/home">
            <i className="fas fa-train me-2"></i>SmartMetroCard
          </Link>
          <div className="collapse navbar-collapse">
            <ul className="navbar-nav ms-auto d-none d-lg-flex">
              <li className="nav-item"><NavLink className="nav-link" to="/home">Home</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/plans">Plans</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/my-plans">My Plans</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/tickets">Tickets</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/cards">Cards</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/wallet">Wallet</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/journey">Journey</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/schedules">Schedules</NavLink></li>
            </ul>
          </div>
          <form className="d-none d-lg-flex me-2" onSubmit={onGlobalSearch} role="search">
            <div className="input-group">
              <span className="input-group-text"><i className="fas fa-search"></i></span>
              <input className="form-control" placeholder="Search stations, plans, tickets..." value={query} onChange={e=>setQuery(e.target.value)} />
            </div>
          </form>
          <div className="d-flex align-items-center">
            <Link className="btn btn-outline-light me-2 position-relative" to="/notifications">
              <i className="fas fa-bell"></i>
              {Array.isArray(notifications) && notifications.some(n=>!n.read) && (
                <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle">
                  <span className="visually-hidden">unread messages</span>
                </span>
              )}
            </Link>
            <div className="dropdown">
              <button className="btn btn-outline-light dropdown-toggle" data-bs-toggle="dropdown">
                <i className="fas fa-user-circle me-1"></i>{user?.name ? <span className="ms-1">{user.name}</span> : null}
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                <li><Link className="dropdown-item" to="/profile"><i className="fas fa-id-badge me-2"></i>Profile</Link></li>
                <li><button className="dropdown-item" type="button" onClick={()=>setDark(v=>!v)}><i className="fas fa-adjust me-2"></i>{dark?'Light Mode':'Dark Mode'}</button></li>
                <li><button className="dropdown-item" type="button" onClick={handleLogout}><i className="fas fa-sign-out-alt me-2"></i>Logout</button></li>
              </ul>
            </div>
          </div>
        </div>
      </nav>

      <div className="offcanvas offcanvas-start" tabIndex="-1" id="sidebar">
        <div className="offcanvas-header bg-primary text-white">
          <h5 className="offcanvas-title">Menu</h5>
          <button type="button" className="btn-close btn-close-white" data-bs-dismiss="offcanvas"></button>
        </div>
        <div className="offcanvas-body p-0">
          <nav className="nav flex-column">
            <NavLink className="nav-link" to="/home" data-bs-dismiss="offcanvas"><i className="fas fa-home me-2"></i>Home</NavLink>
            <NavLink className="nav-link" to="/plans" data-bs-dismiss="offcanvas"><i className="fas fa-list-alt me-2"></i>Subscription Plans</NavLink>
            <NavLink className="nav-link" to="/my-plans" data-bs-dismiss="offcanvas"><i className="fas fa-crown me-2"></i>My Plans</NavLink>
            <NavLink className="nav-link" to="/tickets" data-bs-dismiss="offcanvas"><i className="fas fa-ticket-alt me-2"></i>Tickets</NavLink>
            <NavLink className="nav-link" to="/cards" data-bs-dismiss="offcanvas"><i className="fas fa-credit-card me-2"></i>Cards</NavLink>
            <NavLink className="nav-link" to="/wallet" data-bs-dismiss="offcanvas"><i className="fas fa-wallet me-2"></i>Wallet</NavLink>
            <NavLink className="nav-link" to="/journey" data-bs-dismiss="offcanvas"><i className="fas fa-route me-2"></i>Journey Tracking</NavLink>
            <NavLink className="nav-link" to="/history" data-bs-dismiss="offcanvas"><i className="fas fa-history me-2"></i>History</NavLink>
            <NavLink className="nav-link" to="/transactions" data-bs-dismiss="offcanvas"><i className="fas fa-exchange-alt me-2"></i>Transactions</NavLink>
            <NavLink className="nav-link" to="/schedules" data-bs-dismiss="offcanvas"><i className="fas fa-clock me-2"></i>Train Schedules</NavLink>
          </nav>
        </div>
      </div>

      <div style={{ paddingTop: 70 }}>
        {children || <Outlet />}
      </div>
    </div>
  )
}

export default AppLayout

