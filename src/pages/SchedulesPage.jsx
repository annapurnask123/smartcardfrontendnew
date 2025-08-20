import { useSelector } from 'react-redux'

function SchedulesPage() {
  const stations = useSelector(s => s.data.stations)
  const schedules = [
    { trainNumber: 'M101', trainName: 'Blue Express', station: 'Central Station', platform: '1', scheduledTime: '10:30 AM', actualTime: '10:32 AM', status: 'delayed' },
    { trainNumber: 'M205', trainName: 'Red Line Local', station: 'City Center', platform: '2', scheduledTime: '10:45 AM', actualTime: '10:45 AM', status: 'on-time' },
    { trainNumber: 'M308', trainName: 'Green Express', station: 'Park Avenue', platform: '3', scheduledTime: '11:00 AM', actualTime: 'Cancelled', status: 'cancelled' },
  ]

  return (
    <div className="container mt-5 pt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="fas fa-clock me-2"></i>Train Schedules</h2>
      </div>
      <div className="row">
        {schedules.map(s => (
          <div className="col-12 mb-3" key={s.trainNumber}>
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
                    <span className={`badge bg-${s.status === 'on-time' ? 'success' : s.status === 'delayed' ? 'warning' : 'danger'} train-status ${s.status}`}>{s.status.replace('-', ' ').toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SchedulesPage

