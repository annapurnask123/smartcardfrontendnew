import { useEffect, useState } from 'react'
import { userAPI } from '../api/api'

function HistoryPage() {
  const [items, setItems] = useState([])
  useEffect(() => {
    (async () => {
      try {
        const { data } = await userAPI.getUserJourneys()
        const arr = Array.isArray(data) ? data : data?.items || []
        setItems(arr.map(j => ({
          date: j.endedAt || j.startedAt || j.date,
          station: `${j.sourceName || j.source} - ${j.destinationName || j.destination}`,
          amount: j.fare ? `₹${j.fare}` : '—',
          status: (j.status || 'completed').toString().charAt(0).toUpperCase() + (j.status || 'completed').toString().slice(1)
        })))
      } catch {}
    })()
  }, [])
  return (
    <div className="container mt-5 pt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="fas fa-history me-2"></i>Journey History</h2>
      </div>
      <div className="row">
        {items.map((item, idx) => (
          <div className="col-12 mb-3" key={idx}>
            <div className="card">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">{item.station}</h6>
                    <small className="text-muted">{item.date}</small>
                  </div>
                  <div className="text-end">
                    <span className="fw-bold">{item.amount}</span><br />
                    <span className="badge bg-success">{item.status}</span>
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

export default HistoryPage

