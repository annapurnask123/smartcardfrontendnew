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
          <select className="form-select" onChange={(e) => {
            // Add filtering logic here
            console.log('Filter by:', e.target.value);
          }}>
            <option value="">All Plans</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="expiring">Expiring Soon</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
      {banner && <div className="alert alert-success">{banner}</div>}
      <div className="row">
        {plans.length === 0 && <p className="text-muted">No plans yet.</p>}
        {plans.map((plan, index) => (
          <div className="col-md-6 mb-4" key={plan.id || plan._id || `plan-${index}`}>
            <div className={`card border-0 shadow-sm hover-lift subscription-${plan.status}`}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h5 className="card-title mb-1">
                      <i className="fas fa-crown text-warning me-2"></i>
                      {plan.name}
                    </h5>
                    <p className="card-text text-muted mb-2">
                      <i className="fas fa-calendar-alt me-1"></i>
                      Valid until: {plan.expiryDate || 'N/A'}
                    </p>
                    <p className="card-text text-muted mb-0">
                      <i className="fas fa-users me-1"></i>
                      Members: {plan.members || 1}
                    </p>
                  </div>
                  <span className={`badge ${getStatusBadgeClass(plan.status)}`}>
                    {plan.status || 'Unknown'}
                  </span>
                </div>
                <div className="mt-3 d-flex gap-2">
                  <button 
                    className="btn btn-outline-primary btn-sm" 
                    onClick={() => renew(plan)}
                    disabled={plan.status === 'cancelled'}
                  >
                    <i className="fas fa-sync-alt me-1"></i>Renew
                  </button>
                  <button 
                    className="btn btn-outline-danger btn-sm" 
                    onClick={() => cancel(plan)}
                    disabled={plan.status === 'cancelled'}
                  >
                    <i className="fas fa-times me-1"></i>Cancel
                  </button>
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

function getStatusBadgeClass(status) {
  switch (status?.toLowerCase()) {
    case 'active': return 'bg-success'
    case 'expired': return 'bg-danger'
    case 'expiring': return 'bg-warning'
    case 'cancelled': return 'bg-secondary'
    default: return 'bg-light text-dark'
  }
}

// Add CSS for hover effects
const styles = `
  .hover-lift {
    transition: transform 0.2s ease-in-out;
  }
  .hover-lift:hover {
    transform: translateY(-2px);
  }
  .subscription-active {
    border-left: 4px solid #28a745;
  }
  .subscription-expired {
    border-left: 4px solid #dc3545;
  }
  .subscription-expiring {
    border-left: 4px solid #ffc107;
  }
  .subscription-cancelled {
    border-left: 4px solid #6c757d;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

