import { useSelector } from 'react-redux'

function MyPlansPage() {
  const plans = useSelector(s => s.data.userPlans)
  return (
    <div className="container mt-5 pt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="fas fa-crown me-2"></i>My Plans</h2>
        <div className="input-group" style={{ maxWidth: 300 }}>
          <select className="form-select">
            <option value="">All Plans</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="expiring">Expiring Soon</option>
          </select>
        </div>
      </div>
      <div className="row">
        {plans.length === 0 && <p className="text-muted">No plans yet.</p>}
        {plans.map(plan => (
          <div className="col-md-6 mb-4" key={plan.id}>
            <div className={`card subscription-${plan.status}`}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h5 className="card-title">{plan.name}</h5>
                    <p className="card-text">
                      <small>Valid until: {plan.expiryDate}</small><br />
                      <small>Members: {plan.members}</small>
                    </p>
                  </div>
                  <span className="badge bg-light text-dark">{plan.status}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MyPlansPage

