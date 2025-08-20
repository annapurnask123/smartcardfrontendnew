import { useSelector } from 'react-redux'

function JourneyTrackingPage() {
  const journey = useSelector(s => s.data.journey) || {
    source: '—', destination: '—', estimatedArrival: '—', progress: 0, stationsRemaining: 0, route: []
  }

  return (
    <div className="container mt-5 pt-5">
      <h2 className="mb-4"><i className="fas fa-route me-2"></i>Journey Tracking</h2>
      <div className="card">
        <div className="card-header bg-primary text-white">
          <h5><i className="fas fa-train me-2"></i>Current Journey</h5>
        </div>
        <div className="card-body">
          <div className="row mb-4">
            <div className="col-md-6">
              <div className="d-flex justify-content-between">
                <div>
                  <h6>From</h6>
                  <p className="mb-0">{journey.source}</p>
                </div>
                <div className="text-end">
                  <h6>To</h6>
                  <p className="mb-0">{journey.destination}</p>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="text-center">
                <h6>Estimated Arrival</h6>
                <p className="text-primary mb-0">{journey.estimatedArrival}</p>
              </div>
            </div>
          </div>
          <div className="journey-timeline">
            {journey.route.map(step => (
              <div key={step.id} className={`journey-step ${step.status}`}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">{step.name}</h6>
                    <small className="text-muted">{step.train ? `Train: ${step.train}` : ''}{step.platform ? ` | Platform: ${step.platform}` : ''}</small>
                  </div>
                  <div className="text-end">
                    <small>{step.time}</small>
                    {step.status === 'current' && <><br /><span className="badge bg-warning">Current</span></>}
                    {step.status === 'completed' && <><br /><span className="badge bg-success">Completed</span></>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <div className="d-flex justify-content-between mb-2">
              <span>Journey Progress</span>
              <span>{journey.progress}%</span>
            </div>
            <div className="progress">
              <div className="progress-bar bg-primary" style={{ width: `${journey.progress}%` }}></div>
            </div>
          </div>
          <div className="alert alert-info mt-3">
            <i className="fas fa-info-circle me-2"></i>
            <strong>{journey.stationsRemaining}</strong> stations remaining to reach your destination
          </div>
        </div>
      </div>
    </div>
  )
}

export default JourneyTrackingPage

