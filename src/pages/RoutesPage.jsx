import { useEffect, useState } from 'react'
import { routeAPI } from '../api/api'

function RoutesPage() {
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [routeStations, setRouteStations] = useState({})

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const { data } = await routeAPI.getAllRoutes()
        setRoutes(Array.isArray(data) ? data : data?.items || [])
      } catch (e) {
        setError('Failed to load routes')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function loadStations(routeId) {
    if (routeStations[routeId]) return
    try {
      const { data } = await routeAPI.getRouteStations(routeId)
      setRouteStations(prev => ({ ...prev, [routeId]: Array.isArray(data) ? data : data?.stations || [] }))
    } catch {}
  }

  const colorForLine = (lineName = '') => {
    const name = (lineName || '').toLowerCase()
    if (name.includes('red')) return 'bg-danger'
    if (name.includes('yellow')) return 'bg-warning'
    if (name.includes('green')) return 'bg-success'
    if (name.includes('blue')) return 'bg-primary'
    return 'bg-secondary'
  }

  return (
    <div className="container mt-5 pt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="fas fa-map me-2"></i>Routes</h2>
      </div>
      {loading && <div>Loading...</div>}
      {error && <div className="text-danger">{error}</div>}
      <div className="row">
        {routes.map(rt => (
          <div key={rt.id || rt._id} className="col-md-6 mb-4">
            <div className="card">
              <div className={`card-header text-white ${colorForLine(rt.name)}`}>
                <h5 className="mb-0">{rt.name || 'Route'}</h5>
              </div>
              <div className="card-body">
                <button className="btn btn-outline-primary btn-sm mb-3" onClick={() => loadStations(rt.id || rt._id)}>
                  <i className="fas fa-list me-2"></i>Show Stations
                </button>
                <ul className="list-group">
                  {(routeStations[rt.id || rt._id] || []).map(st => (
                    <li key={st.id || st._id} className="list-group-item d-flex justify-content-between align-items-center">
                      <span>{st.name}</span>
                      <span className="badge bg-light text-muted">{st.code || st.shortCode || ''}</span>
                    </li>
                  ))}
                  {!routeStations[rt.id || rt._id] && (
                    <li className="list-group-item text-muted">Click "Show Stations" to load.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RoutesPage

