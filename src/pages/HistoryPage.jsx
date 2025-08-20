function HistoryPage() {
  const items = [
    { date: '2024-08-20', station: 'Central Station - City Center', amount: '₹45', status: 'Completed' },
    { date: '2024-08-19', station: 'Park Avenue - Tech Hub', amount: '₹35', status: 'Completed' },
    { date: '2024-08-18', station: 'Mall Junction - University', amount: '₹40', status: 'Completed' },
  ]
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

