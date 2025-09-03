import { useEffect, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { 
  fetchSubscriptions, 
  cancelSubscription,
  updateSubscriptionLocal,
  clearError
} from '../slices/subscriptionSlice'
import { cardAPI, paymentAPI, subscriptionAPI } from '../api/api'

// Helper function for badge styling
function getStatusBadgeClass(status) {
  switch ((status || '').toLowerCase()) {
    case 'active':
    case 'success':
      return 'bg-success text-white'
    case 'expired':
      return 'bg-danger text-white'
    case 'expiring':
    case 'expiring_soon':
      return 'bg-warning text-dark'
    case 'cancelled':
    case 'canceled':
      return 'bg-secondary text-white'
    case 'pending':
      return 'bg-info text-white'
    default:
      return 'bg-light text-dark'
  }
}

// Fallback expiry date calculator
function calculateExpiryDate(planType, startDate = new Date()) {
  const start = new Date(startDate)
  const planTypeLower = (planType || '').toLowerCase()
  
  switch (planTypeLower) {
    case 'daily':
    case 'day pass':
      start.setDate(start.getDate() + 1)
      break
    case 'weekly':
      start.setDate(start.getDate() + 7)
      break
    case 'monthly':
    case 'monthly plan':
      start.setMonth(start.getMonth() + 1)
      break
    case 'yearly':
    case 'annual':
      start.setFullYear(start.getFullYear() + 1)
      break
    case 'family':
    case 'familycard':
      start.setMonth(start.getMonth() + 1)
      break
    default:
      // Default to monthly if plan type is unknown
      start.setMonth(start.getMonth() + 1)
  }
  return start.toISOString()
}

// Utility function to check if a plan is expired
function isPlanExpired(plan) {
  if (!plan?.expiryDate) return false
  return new Date(plan.expiryDate) < new Date()
}

function MyPlansPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  // Get subscriptions from Redux store
  const { subscriptions = [], loading, error } = useSelector(
    state => state.subscription || {}
  )

  const [filteredPlans, setFilteredPlans] = useState([])
  const [banner, setBanner] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const hasShownExpiringBanner = useRef(false)
  const [cards, setCards] = useState([])
  const [selectedPlanForCard, setSelectedPlanForCard] = useState({})
  const [showCardPlanModal, setShowCardPlanModal] = useState(false)
  const [selectedCard, setSelectedCard] = useState(null)
  const [renewingPlan, setRenewingPlan] = useState(null)
  const [processingPayment, setProcessingPayment] = useState(null)
  const [cancellingPlan, setCancellingPlan] = useState(null)

  useEffect(() => {
    dispatch(fetchSubscriptions())
    fetchUserCards()
  }, [dispatch])

  // Fetch user cards
  const fetchUserCards = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      if (user.id || user._id) {
        const response = await cardAPI.getUserCards(user.id || user._id)
        const userCards = response.data || []
        setCards(userCards)
        
        // Load saved plan selections
        const savedSelections = JSON.parse(localStorage.getItem('cardPlanSelections') || '{}')
        setSelectedPlanForCard(savedSelections)
      }
    } catch (error) {
      console.error('Failed to fetch cards:', error)
    }
  }

  // Save plan selection for card
  const handleSetPlanForCard = (cardId, planId) => {
    const newSelections = {
      ...selectedPlanForCard,
      [cardId]: planId
    }
    setSelectedPlanForCard(newSelections)
    localStorage.setItem('cardPlanSelections', JSON.stringify(newSelections))
    setBanner(`Plan assigned to card successfully!`)
    setTimeout(() => setBanner(''), 3000)
    setShowCardPlanModal(false)
  }

  // Remove plan from card
  const handleRemovePlanFromCard = (cardId) => {
    const newSelections = { ...selectedPlanForCard }
    delete newSelections[cardId]
    setSelectedPlanForCard(newSelections)
    localStorage.setItem('cardPlanSelections', JSON.stringify(newSelections))
    setBanner(`Plan removed from card successfully!`)
    setTimeout(() => setBanner(''), 3000)
  }

  // Get plan name by ID
  const getPlanNameById = (planId) => {
    const plan = subscriptions.find(sub => (sub._id || sub.id) === planId)
    return plan ? (plan.planId?.name || plan.planName || plan.name || 'Unknown Plan') : 'Unknown Plan'
  }

  useEffect(() => {
    dispatch(fetchSubscriptions())
  }, [dispatch])

  // Filtering logic
  useEffect(() => {
    let list = subscriptions.filter(p => {
      // Show all subscriptions, not just active ones
      return true;
    })

    if (statusFilter) {
      list = list.filter(plan => {
        const planStatus = (plan.status || '').toLowerCase()
        if (statusFilter === 'active') return planStatus === 'active'
        if (statusFilter === 'pending') return planStatus === 'pending'
        if (statusFilter === 'expired') return isPlanExpired(plan) || planStatus === 'expired'
        if (statusFilter === 'cancelled') return planStatus === 'cancelled' || planStatus === 'canceled'
        return true
      })
    }

    setFilteredPlans(list)
  }, [subscriptions, statusFilter])

  // Pay Again for pending plans - redirect to PaymentPage using paymentAPI
  const payAgain = async (sub) => {
    setProcessingPayment(sub.id || sub._id)
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const planName = sub.planId?.name || sub.planName || sub.name || 'Unnamed Plan'
      const planPrice = sub.planId?.price || sub.price || 0
      if (!planPrice) {
        setBanner('Unable to determine plan price. Please contact support.')
        return
      }

      // Create payment order via backend
      const { data: order } = await paymentAPI.createPaymentOrder({
        type: 'subscription',
        id: sub.id || sub._id,
        userId: user.id || user._id,
        amount: planPrice,
        paymentMethod: 'razorpay'
      })

      // Navigate to PaymentPage to complete
      navigate('/payment', {
        state: {
          paymentInfo: {
            type: 'subscription',
            subscriptionId: sub.id || sub._id,
            userId: user.id || user._id,
            amount: planPrice,
            description: `Payment for ${planName}`,
            order
          }
        }
      })
    } catch (error) {
      console.error('Pay again error:', error)
      setBanner('Failed to create payment order. Please try again.')
    } finally {
      setProcessingPayment(null)
    }
  }

  // Renew subscription
  function renew(sub) {
    setRenewingPlan(sub.id || sub._id);

    // Allow renew only after end date
    const isExpired = isPlanExpired(sub) || (sub.status || '').toLowerCase() === 'expired';
    if (!isExpired) {
      alert('Renewal is only available after the subscription end date.');
      setRenewingPlan(null);
      return;
    }

    // Ask user: choose new plan or renew same plan
    if (window.confirm('Do you want to choose a new plan to renew?\nClick OK to choose a plan, or Cancel to renew the same plan.')) {
      navigate('/plans');
      setRenewingPlan(null);
      return;
    }

    const startDate = new Date();
    const planName = sub.planId?.name || sub.planName || sub.name || 'Unnamed Plan';
    const expiryDate = calculateExpiryDate(planName, startDate);

    // Get the plan price from the populated planId data
    const planPrice = sub.planId?.price || sub.price || 0;
    
    if (!planPrice || planPrice <= 0) {
      alert('Unable to determine plan price. Please contact support.');
      setRenewingPlan(null);
      return;
    }

    // Validate plan price format
    if (typeof planPrice !== 'number' || isNaN(planPrice)) {
      alert('Invalid plan price format. Please contact support.');
      setRenewingPlan(null);
      return;
    }

    // Validate minimum price
    if (planPrice < 1) {
      alert('Plan price must be at least ₹1. Please contact support.');
      setRenewingPlan(null);
      return;
    }

    // Update immediately for UX
    dispatch(updateSubscriptionLocal({
      id: sub.id || sub._id,
      updates: {
        startDate: startDate.toISOString(),
        expiryDate,
        status: 'pending'
      }
    }));

    navigate('/payment', {
      state: {
        paymentInfo: {
          type: 'renewal',
          subscriptionId: sub.id || sub._id,
          userId: sub.user?.id || sub.user?._id || sub.userId,
          description: `Renewal - ${planName}`,
          amount: planPrice,
          planDetails: { ...sub, startDate, expiryDate, planName }
        }
      }
    });
    
    setRenewingPlan(null);
  }

  // Cancel subscription - FIXED VERSION to actually delete from DB
  async function cancel(sub) {
    setCancellingPlan(sub.id || sub._id);
    const status = sub.status?.toLowerCase();
    
    if (status === 'cancelled' || status === 'canceled') {
      setBanner('This subscription is already cancelled.');
      setTimeout(() => setBanner(''), 3000);
      setCancellingPlan(null);
      return;
    }
    
    // Allow cancellation of pending plans (removed restriction)
    const confirmMessage = status === 'pending' 
      ? 'Are you sure you want to cancel this pending subscription? This will permanently delete the subscription.'
      : status === 'active'
      ? 'Are you sure you want to cancel this active subscription? It will remain active until expiry.'
      : 'Are you sure you want to cancel this subscription?';

    if (!window.confirm(confirmMessage)) {
      setCancellingPlan(null);
      return;
    }

    try {
      if (status === 'pending') {
        // For pending plans, delete them completely from database
        console.log('Deleting pending subscription:', sub.id || sub._id);
        
        try {
          // Call the delete API endpoint
          await subscriptionAPI.deleteSubscription(sub.id || sub._id);
          
          // Remove from Redux state after successful deletion
          const updatedSubscriptions = subscriptions.filter(s => (s.id || s._id) !== (sub.id || sub._id));
          dispatch({ type: 'subscription/setSubscriptions', payload: updatedSubscriptions });
          
          setBanner('Pending subscription deleted successfully from database.');
          setTimeout(() => setBanner(''), 3000);
          
        } catch (deleteError) {
          console.error('Delete API failed:', deleteError);
          
          // If delete API fails, try cancel API as fallback
          try {
            await dispatch(cancelSubscription(sub.id || sub._id)).unwrap();
            dispatch(updateSubscriptionLocal({
              id: sub.id || sub._id,
              updates: { status: 'cancelled' }
            }));
            setBanner('Subscription cancelled (delete failed, marked as cancelled instead).');
          } catch (cancelError) {
            throw deleteError; // Throw original delete error
          }
        }
        
      } else {
        // For active/expired plans, mark as cancelled
        dispatch(updateSubscriptionLocal({
          id: sub.id || sub._id,
          updates: { status: 'cancelled' }
        }));

        // Try to call the cancel API
        try {
          await dispatch(cancelSubscription(sub.id || sub._id)).unwrap();
          setBanner('Subscription cancelled successfully.');
        } catch (apiError) {
          console.warn('API cancel failed, but UI updated:', apiError);
          setBanner('Subscription marked as cancelled (API unavailable).');
        }
        setTimeout(() => setBanner(''), 3000);
      }
      
    } catch (err) {
      console.error('Cancel/Delete failed:', err);
      
      // For pending plans that failed to delete, reload from server
      if (status === 'pending') {
        dispatch(fetchSubscriptions()); // Reload to get current state
      } else {
        // Revert the UI change if the API call failed
        dispatch(updateSubscriptionLocal({
          id: sub.id || sub._id,
          updates: { status: sub.status } // Revert to original status
        }));
      }
      
      let errorMessage = 'Operation failed. Please try again.';
      
      // Check for specific error types
      if (err?.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err?.error) {
        if (err.error.includes('payment verification') || err.error.includes('verification failed')) {
          errorMessage = 'Payment verification failed. The subscription has been marked for cancellation.';
        } else if (err.error.includes('Access denied') || err.error.includes('Authentication') || err.error.includes('Unauthorized')) {
          errorMessage = 'Authentication error. Please refresh and try again.';
        } else if (err.error.includes('not found')) {
          errorMessage = 'Subscription not found. Please refresh the page.';
        } else {
          errorMessage = err.error;
        }
      } else if (err?.message) {
        if (err.message.includes('401') || err.message.includes('403')) {
          errorMessage = 'Authentication error. Please refresh and try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setBanner(errorMessage);
      setTimeout(() => setBanner(''), 5000);
    } finally {
      setCancellingPlan(null);
    }
  }

  // Format date safely
  function formatDate(date, fallback = 'N/A') {
    if (!date) return fallback;
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return fallback;
    }
  }

  // Calculate days until expiration
  function daysUntilExpiry(expiryDate) {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="container mt-5 pt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="fas fa-crown me-2"></i>My Plans</h2>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-primary btn-sm"
            onClick={() => dispatch(fetchSubscriptions())}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-1"></span>
                Refreshing...
              </>
            ) : (
              <>
                <i className="fas fa-sync-alt me-1"></i>
                Refresh
              </>
            )}
          </button>
          <div className="input-group" style={{ maxWidth: 300 }}>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Plans</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {banner && <div className="alert alert-info">{banner}</div>}
      {error && <div className="alert alert-danger">
        <i className="fas fa-exclamation-triangle me-2"></i>
        {error}
        <button 
          className="btn btn-sm btn-outline-danger ms-3" 
          onClick={() => dispatch(clearError())}
        >
          Dismiss
        </button>
      </div>}

      {/* Card Plan Assignment Section */}
      {cards.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="fas fa-credit-card text-primary me-2"></i>
                  Card Plan Assignment
                </h5>
              </div>
              <div className="card-body">
                <p className="text-muted mb-3">
                  Assign subscription plans to your cards. Cards with assigned plans will use the subscription for journeys instead of deducting balance.
                </p>
                <div className="row">
                  {cards.map(card => (
                    <div className="col-md-6 mb-3" key={card._id || card.id}>
                      <div className="border rounded p-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h6 className="mb-0">
                            <i className="fas fa-credit-card me-1"></i>
                            {card.cardNumber || `Card ${card._id?.slice(-4) || 'Unknown'}`}
                          </h6>
                          <span className={`badge ${card.isPrimary ? 'bg-primary' : 'bg-secondary'}`}>
                            {card.isPrimary ? 'Primary' : 'Secondary'}
                          </span>
                        </div>
                        <div className="mb-2">
                          <small className="text-muted">Balance: ₹{(card.balance || 0).toFixed(2)}</small>
                        </div>
                        {selectedPlanForCard[card._id || card.id] ? (
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <span className="badge bg-success me-2">Plan Assigned</span>
                              <small>{getPlanNameById(selectedPlanForCard[card._id || card.id])}</small>
                            </div>
                            <button 
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => handleRemovePlanFromCard(card._id || card.id)}
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <button 
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => {
                              setSelectedCard(card)
                              setShowCardPlanModal(true)
                            }}
                            disabled={subscriptions.filter(sub => sub.status === 'active').length === 0}
                          >
                            <i className="fas fa-plus me-1"></i>
                            Assign Plan
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading your subscriptions...</p>
          <small className="text-muted">Please wait while we fetch your subscription data</small>
        </div>
      )}

      <div className="row">
        {!loading && filteredPlans.length === 0 && (
          <div className="col-12 text-center py-5">
            <i className="fas fa-crown text-muted" style={{ fontSize: '3rem' }}></i>
            <h4 className="text-muted mt-3">No subscriptions found</h4>
            <p className="text-muted">
              {subscriptions.length === 0 
                ? "You don't have any subscriptions yet. Check out our plans to get started!"
                : "No subscriptions match your current filter. Try changing the status filter above."
              }
            </p>
            {subscriptions.length === 0 && (
              <button 
                className="btn btn-primary" 
                onClick={() => navigate('/plans')}
              >
                <i className="fas fa-plus me-2"></i>Browse Plans
              </button>
            )}
          </div>
        )}
        {filteredPlans.map((sub, i) => {
          const daysLeft = daysUntilExpiry(sub.expiryDate);
          const isExpiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft > 0;
          const isPending = (sub.status || '').toLowerCase() === 'pending';
          const isExpired = isPlanExpired(sub) || (sub.status || '').toLowerCase() === 'expired';
          
          return (
            <div className="col-md-6 mb-4" key={sub.id || sub._id || i}>
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body d-flex flex-column">
                  <h5 className="card-title">
                    <i className="fas fa-crown text-warning me-2"></i>
                    {sub.planId?.name || sub.planName || sub.name || 'Unnamed Plan'}
                  </h5>
                  <div className="flex-grow-1">
                    <p className="card-text text-muted mb-1">
                      <i className="fas fa-calendar-plus me-1"></i>
                      Started: {formatDate(sub.startDate || sub.createdAt)}
                    </p>
                    <p className="card-text text-muted mb-1">
                      <i className="fas fa-calendar-alt me-1"></i>
                      Expires: {formatDate(sub.expiryDate || sub.endDate || calculateExpiryDate(sub.planId?.name || sub.planName || sub.name, sub.startDate))}
                      {isExpiringSoon && (
                        <span className="badge bg-warning text-dark ms-2">
                          {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                        </span>
                      )}
                    </p>
                    <p className="card-text text-muted">
                      <i className="fas fa-users me-1"></i>
                      Members: {sub.planId?.maxMembers || sub.members || 1}
                    </p>
                    <p className="card-text text-muted">
                      <i className="fas fa-rupee-sign me-1"></i>
                      Price: ₹{sub.planId?.price || sub.price ? Number(sub.planId?.price || sub.price).toFixed(2) : 'N/A'}
                    </p>
                  </div>
                  <div className="mt-3">
                    <span className={`badge ${getStatusBadgeClass(sub.status)} mb-3 d-block`}>
                      {sub.status ? sub.status.charAt(0).toUpperCase() + sub.status.slice(1) : 'Unknown'}
                    </span>

                    <div className="d-flex gap-2 flex-wrap">
                      {/* Pay Again button for pending plans */}
                      {isPending && (
                        <button
                          className="btn btn-success btn-sm flex-fill"
                          onClick={() => payAgain(sub)}
                          disabled={processingPayment === (sub.id || sub._id)}
                        >
                          {processingPayment === (sub.id || sub._id) ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-1"></span>
                              Processing...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-credit-card me-1"></i>Pay Again
                            </>
                          )}
                        </button>
                      )}
                      
                      {/* Renew button for expired/cancelled plans */}
                      {!isPending && (
                        <button
                          className="btn btn-outline-primary btn-sm flex-fill"
                          onClick={() => renew(sub)}
                          disabled={!isExpired || renewingPlan === (sub.id || sub._id)}
                          title={!isExpired ? 'Renewal is available after the end date' : ''}
                        >
                          {renewingPlan === (sub.id || sub._id) ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-1"></span>
                              Processing...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-sync-alt me-1"></i>Renew
                            </>
                          )}
                        </button>
                      )}
                      
                      {/* Cancel button for pending plans */}
                      {isPending && (
                        <button
                          className="btn btn-outline-danger btn-sm flex-fill"
                          onClick={() => cancel(sub)}
                          disabled={cancellingPlan === (sub.id || sub._id)}
                        >
                          {cancellingPlan === (sub.id || sub._id) ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-1"></span>
                              Cancelling...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-times me-1"></i>Cancel
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Card Plan Assignment Modal */}
      {showCardPlanModal && selectedCard && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-crown text-warning me-2"></i>
                  Assign Plan to Card
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowCardPlanModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <h6>Card: {selectedCard.cardNumber || `Card ${selectedCard._id?.slice(-4) || 'Unknown'}`}</h6>
                  <small className="text-muted">Balance: ₹{(selectedCard.balance || 0).toFixed(2)}</small>
                </div>
                <div className="mb-3">
                  <label className="form-label">Select Active Plan:</label>
                  {subscriptions.filter(sub => sub.status === 'active').length > 0 ? (
                    <div className="list-group">
                      {subscriptions.filter(sub => sub.status === 'active').map(sub => (
                        <button
                          key={sub._id || sub.id}
                          className="list-group-item list-group-item-action"
                          onClick={() => handleSetPlanForCard(selectedCard._id || selectedCard.id, sub._id || sub.id)}
                        >
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <h6 className="mb-1">{sub.planId?.name || sub.planName || sub.name || 'Unnamed Plan'}</h6>
                              <small className="text-muted">
                                Expires: {formatDate(sub.expiryDate || sub.endDate)}
                              </small>
                            </div>
                            <span className="badge bg-success">Active</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="alert alert-warning">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      No active plans available. Please purchase a plan first.
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowCardPlanModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyPlansPage