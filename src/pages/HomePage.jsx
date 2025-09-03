import { useSelector, useDispatch } from 'react-redux'
import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { fetchStations, setSearch, setPage } from '../slices/stationSlice'

function HomePage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useSelector(state => state.auth.user)
  const { items: stations, page, pageSize, total, loading, search, error } = useSelector(state => state.stations)

  useEffect(() => {
    dispatch(fetchStations())
  }, [dispatch])

  // Initialize search from global search query param
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const q = params.get('search') || ''
    if (q && q !== search) {
      dispatch(setSearch(q))
    }
  }, [location.search, dispatch])

  function onBook(station) {
    const id = station.id || station._id || station.stationId || station.code
    navigate('/book?sourceId=' + encodeURIComponent(id))
  }

  function handleSearch(e) { dispatch(setSearch(e.target.value)) }

  function handlePageChange(newPage) {
    dispatch(setPage(newPage))
  }

  return (
    <div className="container-fluid mt-5 pt-5">
      <div className="row">
        <div className="col-12 px-3 px-md-4">
          <h2 className="mb-4 text-center text-md-start">Welcome, <span className="text-primary">{user?.name || 'User'}</span>!</h2>

          {/* Major Features Section */}
          <div className="row mb-5">
            <div className="col-12">
              <h4 className="mb-4 text-center">
                <i className="fas fa-star text-warning me-2"></i>
                Major Features
              </h4>
            </div>
            
            {/* Quick Actions - Mobile Optimized */}
            <div className="col-12 mb-4">
              <div className="row g-2">
                <div className="col-6 col-md-3">
                  <button 
                    className="btn btn-primary w-100 py-3 d-flex flex-column align-items-center"
                    onClick={() => navigate('/book')}
                  >
                    <i className="fas fa-ticket-alt fa-2x mb-2"></i>
                    <span className="small">Book Ticket</span>
                  </button>
                </div>
                <div className="col-6 col-md-3">
                  <button 
                    className="btn btn-success w-100 py-3 d-flex flex-column align-items-center"
                    onClick={() => navigate('/cards')}
                  >
                    <i className="fas fa-credit-card fa-2x mb-2"></i>
                    <span className="small">My Cards</span>
                  </button>
                </div>
                <div className="col-6 col-md-3">
                  <button 
                    className="btn btn-info w-100 py-3 d-flex flex-column align-items-center"
                    onClick={() => navigate('/my-plans')}
                  >
                    <i className="fas fa-crown fa-2x mb-2"></i>
                    <span className="small">My Plans</span>
                  </button>
                </div>
                <div className="col-6 col-md-3">
                  <button 
                    className="btn btn-warning w-100 py-3 d-flex flex-column align-items-center"
                    onClick={() => navigate('/schedule')}
                  >
                    <i className="fas fa-clock fa-2x mb-2"></i>
                    <span className="small">Schedules</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-sm-6 mb-4">
              <div className="card h-100 border-0 shadow-sm hover-lift">
                <div className="card-body text-center">
                  <div className="feature-icon mb-3">
                    <i className="fas fa-exchange-alt fa-3x text-primary"></i>
                  </div>
                  <h5 className="card-title">Transaction History</h5>
                  <p className="card-text text-muted">Track all your payments and transactions</p>
                  <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/transactions')}>
                    <i className="fas fa-arrow-right me-1"></i>View All
                  </button>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-sm-6 mb-4">
              <div className="card h-100 border-0 shadow-sm hover-lift">
                <div className="card-body text-center">
                  <div className="feature-icon mb-3">
                    <i className="fas fa-route fa-3x text-success"></i>
                  </div>
                  <h5 className="card-title">Journey History</h5>
                  <p className="card-text text-muted">View your past and current journeys</p>
                  <button className="btn btn-outline-success btn-sm" onClick={() => navigate('/history')}>
                    <i className="fas fa-arrow-right me-1"></i>View All
                  </button>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-sm-6 mb-4">
              <div className="card h-100 border-0 shadow-sm hover-lift">
                <div className="card-body text-center">
                  <div className="feature-icon mb-3">
                    <i className="fas fa-credit-card fa-3x text-warning"></i>
                  </div>
                  <h5 className="card-title">Card Management</h5>
                  <p className="card-text text-muted">Manage your virtual cards</p>
                  <button className="btn btn-outline-warning btn-sm" onClick={() => navigate('/cards')}>
                    <i className="fas fa-arrow-right me-1"></i>Manage
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="row mb-5">
            <div className="col-12">
              <h4 className="mb-4">
                <i className="fas fa-bolt text-warning me-2"></i>
                Quick Actions
              </h4>
            </div>
            <div className="col-md-2 col-sm-4 col-6 mb-3">
              <button className="btn btn-primary w-100 h-100 d-flex flex-column align-items-center justify-content-center p-3" onClick={() => navigate('/book')}>
                <i className="fas fa-ticket-alt fa-2x mb-2"></i>
                <span>Book Ticket</span>
              </button>
            </div>
            <div className="col-md-2 col-sm-4 col-6 mb-3">
              <button className="btn btn-success w-100 h-100 d-flex flex-column align-items-center justify-content-center p-3" onClick={() => navigate('/schedules')}>
                <i className="fas fa-clock fa-2x mb-2"></i>
                <span>View Schedule</span>
              </button>
            </div>
            <div className="col-md-2 col-sm-4 col-6 mb-3">
              <button className="btn btn-info w-100 h-100 d-flex flex-column align-items-center justify-content-center p-3" onClick={() => navigate('/journey')}>
                <i className="fas fa-map-marked-alt fa-2x mb-2"></i>
                <span>Track Journey</span>
              </button>
            </div>
            <div className="col-md-2 col-sm-4 col-6 mb-3">
              <button className="btn btn-warning w-100 h-100 d-flex flex-column align-items-center justify-content-center p-3" onClick={() => navigate('/wallet')}>
                <i className="fas fa-wallet fa-2x mb-2"></i>
                <span>Wallet</span>
              </button>
            </div>
            <div className="col-md-2 col-sm-4 col-6 mb-3">
              <button className="btn btn-secondary w-100 h-100 d-flex flex-column align-items-center justify-content-center p-3" onClick={() => navigate('/plans')}>
                <i className="fas fa-crown fa-2x mb-2"></i>
                <span>Plans</span>
              </button>
            </div>
            <div className="col-md-2 col-sm-4 col-6 mb-3">
              <button className="btn btn-dark w-100 h-100 d-flex flex-column align-items-center justify-content-center p-3" onClick={() => navigate('/notifications')}>
                <i className="fas fa-bell fa-2x mb-2"></i>
                <span>Notifications</span>
              </button>
            </div>
          </div>

          {/* Stations */}
          <div className="row">
            <div className="col-12">
              <h4 className="mb-4">
                <i className="fas fa-map-marker-alt text-danger me-2"></i>
                Available Stations
              </h4>
              {loading && (
                <div className="text-center">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              )}
              {error && <div className="alert alert-danger">{error}</div>}
              <div className="row">
                {stations.map(station => (
                  <div key={station.id || station._id} className="col-lg-3 col-md-4 col-sm-6 mb-3">
                    <div className="card h-100 border-0 shadow-sm hover-lift">
                      <div className="card-body text-center">
                        <div className="station-icon mb-3">
                          <i className="fas fa-train fa-2x text-primary"></i>
                        </div>
                        <h6 className="card-title">{station.name}</h6>
                        <button className="btn btn-primary btn-sm" onClick={() => onBook(station)}>
                          <i className="fas fa-ticket-alt me-1"></i>Book
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Pagination
                pagination={{ page, pageSize, total }}
                onPrev={() => handlePageChange(page - 1)}
                onNext={() => handlePageChange(page + 1)}
              />
            </div>
          </div>
        </div>
      </div>

      <style>{`
  .hover-lift {
    transition: transform 0.2s ease-in-out;
  }
  .hover-lift:hover {
    transform: translateY(-5px);
  }
  .feature-icon {
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .station-icon {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  @media (max-width: 768px) {
    .col-md-2 {
      margin-bottom: 1rem;
    }
  }
`}</style>

    </div>
  )
}

function Pagination({ pagination, onPrev, onNext }) {
  const { page, pageSize, total } = pagination
  const maxPage = total ? Math.ceil(total / pageSize) : page
  return (
    <div className="d-flex justify-content-between align-items-center mt-4">
      <button className="btn btn-outline-primary" disabled={page <= 1} onClick={onPrev}>
        <i className="fas fa-chevron-left me-1"></i>Prev
      </button>
      <span className="text-muted">Page {page}{maxPage ? ` of ${maxPage}` : ''}</span>
      <button className="btn btn-outline-primary" disabled={maxPage && page >= maxPage} onClick={onNext}>
        Next<i className="fas fa-chevron-right ms-1"></i>
      </button>
    </div>
  )
}

export default HomePage