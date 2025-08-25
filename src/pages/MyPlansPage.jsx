import { useEffect, useState } from 'react'
import { subscriptionAPI } from '../api/api'
import { useNavigate } from 'react-router-dom'

function MyPlansPage() {
  const [plans, setPlans] = useState([])
  const [filteredPlans, setFilteredPlans] = useState([])
  const [banner, setBanner] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchPlans()
  }, [])

  // ...existing code...
function getStatusBadgeClass(status) {
  switch ((status || '').toLowerCase()) {
    case 'active':
    case 'pending':
      return 'bg-success';
    case 'expired':
      return 'bg-secondary';
    case 'expiring':
    case 'expiring_soon':
      return 'bg-warning text-dark';
    case 'cancelled':
    case 'canceled':
      return 'bg-danger';
    default:
      return 'bg-light text-dark';
  }
}
// ...existing code...
  async function fetchPlans() {
    try {
      const { data } = await subscriptionAPI.getAllSubscriptions()
      const plansData = Array.isArray(data) ? data : data?.items || []
      setPlans(plansData)
      setFilteredPlans(plansData)
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error)
      setPlans([])
      setFilteredPlans([])
    }
  }

  useEffect(() => {
    if (!statusFilter) {
      setFilteredPlans(plans)
    } else {
      const filtered = plans.filter(plan => {
        const planStatus = (plan.status || '').toLowerCase()
        const actualStatus = planStatus === 'pending' ? 'active' : planStatus

        switch (statusFilter) {
          case 'active':
            return actualStatus === 'active' || planStatus === 'pending'
          case 'expired':
            return actualStatus === 'expired'
          case 'expiring':
            return actualStatus === 'expiring' || actualStatus === 'expiring_soon'
          case 'cancelled':
            return actualStatus === 'cancelled' || actualStatus === 'canceled'
          default:
            return true
        }
      })
      setFilteredPlans(filtered)
    }
  }, [plans, statusFilter])

  // 🔄 Renew
  async function renew(sub) {
    try {
      const { data } = await subscriptionAPI.renewSubscription(sub.id || sub._id)
      const renewal = data.subscription || data

      // 👇 Redirect to payment page
      navigate('/payment', {
        state: {
          paymentInfo: {
            type: 'subscription',
            subscriptionId: renewal.id || renewal._id,
            userId: renewal.userId,
            paymentMethod: 'card',
            description: `Renewal - ${renewal.planName || renewal.name}`,
            planDetails: renewal
          }
        }
      })
    } catch (error) {
      console.error('Renewal failed:', error)
      setBanner('Renewal failed. Please try again.')
    }
  }

  // ❌ Cancel
  async function cancel(sub) {
    try {
      const { data } = await subscriptionAPI.cancelSubscription(sub.id || sub._id)
      const cancelled = data.subscription || data

      // update state with latest info from backend
      setPlans(plans.map(p => (p.id === cancelled.id || p._id === cancelled._id) ? cancelled : p))
      setBanner('Subscription cancelled successfully.')
    } catch (error) {
      console.error('Cancellation failed:', error)
      setBanner('Cancellation failed. Please try again.')
    }
  }

  return (
    <div className="container mt-5 pt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="fas fa-crown me-2"></i>My Plans</h2>
        <div className="input-group" style={{ maxWidth: 300 }}>
          <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
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
        {filteredPlans.length === 0 && <p className="text-muted">No plans found.</p>}
        {filteredPlans.map((plan, index) => (
          <div className="col-md-6 mb-4" key={plan.id || plan._id || `plan-${index}`}>
            <div className={`card border-0 shadow-sm hover-lift subscription-${plan.status}`}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h5 className="card-title mb-1">
                      <i className="fas fa-crown text-warning me-2"></i>
                      {plan.name || plan.planName}
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
