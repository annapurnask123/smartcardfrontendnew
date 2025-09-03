import { useSelector, useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchSubscriptionPlans } from "../slices/subscriptionplanSlice";
import { subscriptionAPI } from "../api/api";

function PlansPage() {
  const dispatch = useDispatch();
  const { plans = [], loading, error } = useSelector(
    (state) => state.subscriptionPlans
  );
  const q = useSelector((state) => state.ui.query);
  const navigate = useNavigate();
  const [userSubscriptions, setUserSubscriptions] = useState([]);
  const [checkingSubscriptions, setCheckingSubscriptions] = useState(true);
  const [subscriptionError, setSubscriptionError] = useState(null);

  useEffect(() => {
    dispatch(fetchSubscriptionPlans());
    checkExistingSubscriptions();
  }, [dispatch]);

  const checkExistingSubscriptions = async () => {
    try {
      setCheckingSubscriptions(true);
      setSubscriptionError(null);
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      
      if (user.id || user._id) {
        // First, check if the API method exists and is a function
        if (typeof subscriptionAPI.getUserSubscriptions !== 'function') {
          console.warn('getUserSubscriptions API method is not available');
          setSubscriptionError('Subscription verification is temporarily unavailable. You can still purchase plans.');
          return;
        }
        
        // Try to call the API
        const response = await subscriptionAPI.getUserSubscriptions(user.id || user._id);
        
        // Check if response has expected data structure
        if (response && response.data) {
          const allSubscriptions = response.data || [];
          setUserSubscriptions(allSubscriptions);
        } else {
          console.warn('Unexpected API response structure:', response);
          setSubscriptionError('Could not verify your existing subscriptions. You can still purchase plans.');
        }
      }
    } catch (error) {
      console.error('Failed to check existing subscriptions:', error);
      setSubscriptionError('Failed to load your subscription information. You can still purchase plans, but please check "My Plans" to manage your subscriptions.');
    } finally {
      setCheckingSubscriptions(false);
    }
  };

  async function purchasePlan(plan) {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      // 1. Create subscription record in backend
      const subscriptionResponse = await subscriptionAPI.createSubscription({
        planId: String(plan.id || plan._id),
        userId: String(user.id || user._id),
        planName: plan.name || plan.planName || "",
        planType: plan.planType || plan.type || "monthly",
        amount: plan.price || plan.amount
      });

      const subscription =
        subscriptionResponse.data.subscription || subscriptionResponse.data;
      const subscriptionId = subscription.id || subscription._id;

      if (!subscriptionId) {
        alert("Subscription creation failed: No ID returned from backend.");
        return;
      }

      // 2. Navigate to Payment Page
      navigate("/payment", {
        state: {
          paymentInfo: {
            type: "subscription",
            subscriptionId,
            userId: user.id || user._id,
            paymentMethod: "card",
            description: `Subscription - ${plan.name}`,
            amount: plan.price || plan.amount,
            planDetails: plan,
          },
        },
      });
    } catch (error) {
      console.error("Failed to create subscription:", error);
      alert("Failed to initiate subscription. Please try again.");
    }
  }

  // Function to get plan status for a specific plan
  const getPlanStatus = (plan) => {
    const userPlanSubscriptions = userSubscriptions.filter(sub => 
      (sub.planId && sub.planId === (plan.id || plan._id)) || 
      (sub.planName && sub.planName === plan.name)
    );
    
    if (userPlanSubscriptions.length === 0) {
      return 'available'; // User doesn't have this plan
    }
    
    // Check for active status first
    const activeSubscription = userPlanSubscriptions.find(sub => sub.status === 'active');
    if (activeSubscription) return 'active';
    
    // Then check for pending status
    const pendingSubscription = userPlanSubscriptions.find(sub => sub.status === 'pending');
    if (pendingSubscription) return 'pending';
    
    // Then check for other statuses
    const cancelledSubscription = userPlanSubscriptions.find(sub => 
      sub.status === 'cancelled' || sub.status === 'canceled'
    );
    if (cancelledSubscription) return 'cancelled';
    
    const expiredSubscription = userPlanSubscriptions.find(sub => sub.status === 'expired');
    if (expiredSubscription) return 'expired';
    
    // Default to inactive if status is unknown
    return 'inactive';
  };

  // Function to get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active': return 'bg-success';
      case 'pending': return 'bg-warning text-dark';
      case 'cancelled': return 'bg-secondary';
      case 'expired': return 'bg-danger';
      case 'inactive': return 'bg-light text-dark';
      default: return 'bg-info';
    }
  };

  // Function to get status text
  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Active';
      case 'pending': return 'Pending Payment';
      case 'cancelled': return 'Cancelled';
      case 'expired': return 'Expired';
      case 'inactive': return 'Inactive';
      default: return 'Available';
    }
  };

  // Function to check if a plan can be purchased
  const canPurchasePlan = (plan) => {
    const status = getPlanStatus(plan);
    return status === 'available' || status === 'expired' || status === 'cancelled' || status === 'inactive';
  };

  return (
    <div className="container mt-5 pt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="fas fa-credit-card me-2"></i>Subscription Plans
        </h2>
        <button 
          className="btn btn-outline-primary"
          onClick={() => navigate('/my-plans')}
        >
          <i className="fas fa-crown me-2"></i>My Plans
        </button>
      </div>

      {/* Show warning if we couldn't load subscriptions */}
      {subscriptionError && (
        <div className="alert alert-warning">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {subscriptionError}
          <button 
            className="btn btn-sm btn-outline-warning ms-2"
            onClick={checkExistingSubscriptions}
          >
            <i className="fas fa-refresh me-1"></i>Retry
          </button>
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}
      
      {(loading || checkingSubscriptions) && (
        <div className="text-center">
          <div className="spinner-border" role="status"></div>
          <p className="mt-2">Loading plans...</p>
        </div>
      )}

      <div className="row">
        {plans
          .filter(
            (p) =>
              !q || (p.name || "").toLowerCase().includes(q.toLowerCase())
          )
          .map((plan, idx) => {
            const planStatus = getPlanStatus(plan);
            const canPurchase = canPurchasePlan(plan);
            
            return (
              <div className="col-md-4 mb-4" key={plan.id || plan._id || idx}>
                <div className={`card h-100 ${!canPurchase ? 'opacity-75' : ''}`}>
                  <div className="card-body d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <h5 className="card-title">{plan.name}</h5>
                      <span className={`badge ${getStatusBadgeClass(planStatus)}`}>
                        {getStatusText(planStatus)}
                      </span>
                    </div>
                    
                    <p className="card-text fs-4 fw-bold text-primary">
                      ₹{plan.price || plan.amount} 
                      <small className="text-muted fs-6 ms-1">/ {plan.duration || "period"}</small>
                    </p>
                    
                    {Array.isArray(plan.features) && plan.features.length > 0 && (
                      <div className="mb-3">
                        <h6 className="text-muted">Features:</h6>
                        <ul className="list-unstyled">
                          {plan.features.map((f, i) => (
                            <li key={i} className="mb-1">
                              <i className="fas fa-check text-success me-2"></i>
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="mt-auto d-grid">
                      <button
                        className={`btn ${canPurchase ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => purchasePlan(plan)}
                        disabled={!canPurchase}
                        title={!canPurchase ? `You already have an ${planStatus} subscription for this plan` : 'Purchase this plan'}
                      >
                        <i className={`fas ${canPurchase ? 'fa-shopping-cart' : 'fa-check'} me-2`}></i>
                        {canPurchase ? 'Purchase Now' : 'Already Have Plan'}
                      </button>
                    </div>
                    
                    {/* Additional information for existing plans */}
                    {!canPurchase && planStatus !== 'available' && (
                      <div className="mt-2 text-center">
                        <small className="text-muted">
                          {planStatus === 'active' && 'Active subscription - Manage in My Plans'}
                          {planStatus === 'pending' && 'Pending payment - Complete payment in My Plans'}
                          {planStatus === 'cancelled' && 'Cancelled subscription - Can be repurchased'}
                          {planStatus === 'expired' && 'Expired subscription - Can be renewed'}
                        </small>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {plans.length === 0 && !loading && !checkingSubscriptions && (
        <div className="text-center text-muted mt-4">
          <p>No subscription plans available at the moment.</p>
        </div>
      )}
    </div>
  );
}

export default PlansPage;