import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '../slices/authSlice'
import { useEffect, useState } from 'react'
import { setSearch } from '../slices/stationSlice'
import { setQuery as setUiQuery } from '../slices/uiSlice'
import Footer from '../components/Footer'
import Chatbot from '../components/Chatbot'
import NearbyStationsFinder from '../components/NearbyStationsFinder'

function AppLayout({ children }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useSelector(s => s.auth.user)
  const notifications = useSelector(s => s.notifications.messages)
  const [query, setQuery] = useState('')
  const [dark, setDark] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showNearbyStations, setShowNearbyStations] = useState(false)

  function handleLogout() {
    dispatch(logout())
    navigate('/login')
  }

  function onGlobalSearch(e) {
    e.preventDefault()
    const q = query.trim()
    dispatch(setSearch(q))
    dispatch(setUiQuery(q))
    setSidebarOpen(false) // Close sidebar on mobile after search
  }

  // Sync header input with URL param and slice
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const q = params.get('search') || params.get('q') || ''
    setQuery(q)
    dispatch(setSearch(q))
    dispatch(setUiQuery(q))
  }, [location.search, dispatch])
  
  useEffect(() => {
    const saved = localStorage.getItem('pref_theme')
    if (saved) setDark(saved === 'dark')
  }, [])
  
  useEffect(() => {
    document.body.dataset.bsTheme = dark ? 'dark' : 'light'
    localStorage.setItem('pref_theme', dark ? 'dark' : 'light')
  }, [dark])

  const unreadNotifications = Array.isArray(notifications) ? notifications.filter(n => !n.read).length : 0

  return (
    <div>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="offcanvas-backdrop fade show d-lg-none" 
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Mobile Sidebar */}
      <div className={`offcanvas offcanvas-start d-lg-none ${sidebarOpen ? 'show' : ''}`} id="sidebar">
        <div className="offcanvas-header">
          <h5 className="offcanvas-title">
            <i className="fas fa-train text-primary me-2"></i>SmartMetroCard
          </h5>
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setSidebarOpen(false)}
          ></button>
        </div>
        <div className="offcanvas-body">
          <nav className="nav flex-column">
            <NavLink 
              className="nav-link" 
              to="/home"
              onClick={() => setSidebarOpen(false)}
            >
              <i className="fas fa-home me-2"></i>Home
            </NavLink>
            <NavLink 
              className="nav-link" 
              to="/plans"
              onClick={() => setSidebarOpen(false)}
            >
              <i className="fas fa-crown me-2"></i>Plans
            </NavLink>
            <NavLink 
              className="nav-link" 
              to="/my-plans"
              onClick={() => setSidebarOpen(false)}
            >
              <i className="fas fa-list me-2"></i>My Plans
            </NavLink>
            <NavLink 
              className="nav-link" 
              to="/tickets"
              onClick={() => setSidebarOpen(false)}
            >
              <i className="fas fa-ticket-alt me-2"></i>Tickets
            </NavLink>
            <NavLink 
              className="nav-link" 
              to="/cards"
              onClick={() => setSidebarOpen(false)}
            >
              <i className="fas fa-credit-card me-2"></i>Cards
            </NavLink>
            <NavLink 
              className="nav-link" 
              to="/wallet"
              onClick={() => setSidebarOpen(false)}
            >
              <i className="fas fa-wallet me-2"></i>Wallet
            </NavLink>
            <NavLink 
              className="nav-link" 
              to="/journey"
              onClick={() => setSidebarOpen(false)}
            >
              <i className="fas fa-route me-2"></i>Journey
            </NavLink>
            <NavLink 
              className="nav-link" 
              to="/schedules"
              onClick={() => setSidebarOpen(false)}
            >
              <i className="fas fa-clock me-2"></i>Schedules
            </NavLink>
          </nav>
        </div>
      </div>

      <nav className="navbar navbar-expand-lg navbar-dark bg-primary fixed-top">
        <div className="container-fluid">
          <button 
            className="navbar-toggler d-lg-none" 
            type="button" 
            onClick={() => setSidebarOpen(true)}
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          
          <Link className="navbar-brand" to="/home">
            <i className="fas fa-train me-2"></i>SmartMetroCard
          </Link>
          
          <div className="collapse navbar-collapse">
            <ul className="navbar-nav ms-auto d-none d-lg-flex">
              <li className="nav-item">
                <NavLink className="nav-link" to="/home">
                  <i className="fas fa-home me-1"></i>Home
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/plans">
                  <i className="fas fa-crown me-1"></i>Plans
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/my-plans">
                  <i className="fas fa-list me-1"></i>My Plans
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/tickets">
                  <i className="fas fa-ticket-alt me-1"></i>Tickets
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/cards">
                  <i className="fas fa-credit-card me-1"></i>Cards
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/wallet">
                  <i className="fas fa-wallet me-1"></i>Wallet
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/journey">
                  <i className="fas fa-route me-1"></i>Journey
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/schedules">
                  <i className="fas fa-clock me-1"></i>Schedules
                </NavLink>
              </li>
            </ul>
          </div>
          
          <form className="d-none d-lg-flex me-2" onSubmit={onGlobalSearch} role="search">
            <div className="input-group">
              <span className="input-group-text">
                <i className="fas fa-search"></i>
              </span>
              <input 
                className="form-control" 
                placeholder="Search stations, plans, tickets..." 
                value={query} 
                onChange={e=>{ 
                  const v = e.target.value; 
                  setQuery(v); 
                  dispatch(setSearch(v)); 
                  dispatch(setUiQuery(v)); 
                }} 
              />
            </div>
          </form>
          
          <div className="d-flex align-items-center">
            <Link className="btn btn-outline-light me-2 position-relative" to="/notifications">
              <i className="fas fa-bell"></i>
              {unreadNotifications > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </Link>
            
            <button 
              className="btn btn-outline-light me-2" 
              type="button" 
              onClick={() => setShowNearbyStations(true)}
            >
              <i className="fas fa-map-marker-alt me-1"></i>Find Me
            </button>
            
            <div className="dropdown">
              <button className="btn btn-outline-light dropdown-toggle" data-bs-toggle="dropdown">
                <i className="fas fa-user-circle me-1"></i>
                {user?.name ? <span className="ms-1 d-none d-sm-inline">{user.name}</span> : null}
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                <li>
                  <Link className="dropdown-item" to="/profile">
                    <i className="fas fa-id-badge me-2"></i>Profile
                  </Link>
                </li>
                <li>
                  <button 
                    className="dropdown-item" 
                    type="button" 
                    onClick={()=>setDark(v=>!v)}
                  >
                    <i className="fas fa-adjust me-2"></i>{dark?'Light Mode':'Dark Mode'}
                  </button>
                </li>
                <li>
                  <button 
                    className="dropdown-item" 
                    type="button" 
                    onClick={handleLogout}
                  >
                    <i className="fas fa-sign-out-alt me-2"></i>Logout
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </nav>

      {/* Toast container */}
      <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1080 }}>
        <div id="global-toast" className="toast align-items-center text-bg-primary border-0" role="alert" aria-live="assertive" aria-atomic="true">
          <div className="d-flex">
            <div className="toast-body"></div>
            <button type="button" className="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
          </div>
        </div>
      </div>

      <NearbyStationsFinder 
        show={showNearbyStations} 
        onClose={() => setShowNearbyStations(false)} 
      />

      <main style={{ marginTop: '76px', minHeight: 'calc(100vh - 76px)' }}>
        {children || <Outlet />}
      </main>

      <Footer />
      
      <Chatbot />

      <style jsx>{`
        .offcanvas {
          max-width: 280px;
        }
        .nav-link {
          padding: 0.75rem 1rem;
          border-radius: 0.375rem;
          margin-bottom: 0.25rem;
          transition: all 0.2s ease-in-out;
        }
        .nav-link:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
        .nav-link.active {
          background-color: rgba(255, 255, 255, 0.2);
          font-weight: 600;
        }
        @media (max-width: 991.98px) {
          .navbar-brand {
            font-size: 1.1rem;
          }
          .input-group {
            max-width: 200px;
          }
        }
        @media (max-width: 575.98px) {
          .navbar-brand {
            font-size: 1rem;
          }
          .input-group {
            max-width: 150px;
          }
          .btn {
            padding: 0.375rem 0.75rem;
            font-size: 0.875rem;
          }
        }
      `}</style>
    </div>
  )
}

export default AppLayout
