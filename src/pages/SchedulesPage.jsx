import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { scheduleAPI } from '../api/api'

function SchedulesPage() {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(false)
  const q = useSelector(s => s.ui.query)
  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const { data } = await scheduleAPI.getSchedules()
        setSchedules(Array.isArray(data) ? data : data?.items || [])
      } catch {} finally { setLoading(false) }
    })()
  }, [])

  return (
    <div className="container mt-5 pt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="fas fa-clock me-2"></i>Train Schedules</h2>
      </div>
      {loading && <div>Loading...</div>}
      <div className="row">
        {schedules.filter(s => {
          const hay = `${s?.trainNumber || ''} ${s?.trainName || ''} ${s?.station || ''}`.toLowerCase()
          return !q || hay.includes((q||'').toLowerCase())
        }).map(s => (
          <div className="col-12 mb-3" key={s.trainNumber || s._id || Math.random()}>
            <div className="card train-card">
              <div className="card-body">
                <div className="row align-items-center">
                  <div className="col-md-3">
                    <h6 className="mb-1">{s.trainNumber}</h6>
                    <small className="text-muted">{s.trainName}</small>
                  </div>
                  <div className="col-md-3">
                    <p className="mb-1"><strong>{s.station}</strong></p>
                    <small className="text-muted">Platform {s.platform}</small>
                  </div>
                  <div className="col-md-2">
                    <p className="mb-1">{s.scheduledTime}</p>
                    <small className="text-muted">Scheduled</small>
                  </div>
                  <div className="col-md-2">
                    <p className="mb-1">{s.actualTime}</p>
                    <small className="text-muted">Actual</small>
                  </div>
                  <div className="col-md-2">
                    <span className={`badge bg-${s?.status === 'on-time' ? 'success' : s?.status === 'delayed' ? 'warning' : 'danger'} train-status ${s?.status || ''}`}>{String(s?.status || '').replace('-', ' ').toUpperCase() || '—'}</span>
                  </div>
                </div>
                {Array.isArray(s.stops) && s.stops.length > 0 && (
                  <details className="mt-3">
                    <summary className="text-primary">View Stops</summary>
                    <ul className="list-group mt-2">
                      {s.stops.map((st, i) => (
                        <li key={i} className="list-group-item d-flex justify-content-between align-items-center">
                          <span>{st.name || st.station}</span>
                          <small className="text-muted">{st.time || st.arrival || ''}</small>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SchedulesPage