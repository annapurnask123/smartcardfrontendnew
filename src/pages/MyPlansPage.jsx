import { useEffect, useState } from 'react'
import { subscriptionAPI } from '../api/api'

function MyPlansPage() {
  const [plans, setPlans] = useState([])
  const [banner, setBanner] = useState('')
  useEffect(() => {
    (async () => {
      try {
        const { data } = await subscriptionAPI.getAllSubscriptions()
        setPlans(Array.isArray(data) ? data : data?.items || [])
        const url = new URL(window.location.href)
        if (url.searchParams.get('activated') === '1') setBanner('Your plan is activated successfully')
      } catch {}
    })()
  }, [])
  async function renew(sub) {
    try {
      await subscriptionAPI.renewSubscription(sub.id || sub._id)
      setBanner('Renewal initiated. Please complete payment.')
    } catch {}
  }
  async function cancel(sub) {
    try {
      await subscriptionAPI.cancelSubscription(sub.id || sub._id)
      setPlans(plans.map(p => (p.id===sub.id||p._id===sub._id) ? { ...p, status: 'cancelled' } : p))
    } catch {}
  }
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
      {banner && <div className="alert alert-success">{banner}</div>}
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
                <div className="mt-3 d-flex gap-2">
                  <button className="btn btn-outline-primary btn-sm" onClick={() => renew(plan)}>Renew</button>
                  <button className="btn btn-outline-danger btn-sm" onClick={() => cancel(plan)}>Cancel</button>
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

