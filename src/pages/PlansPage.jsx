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

  useEffect(() => {
    dispatch(fetchSubscriptionPlans());
    checkExistingSubscriptions();
  }, [dispatch]);

  const checkExistingSubscriptions = async () => {
    try {
      setCheckingSubscriptions(true);
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user.id || user._id) {
        const response = await subscriptionAPI.getUserSubscriptions(user.id || user._id);
        const activeSubscriptions = (response.data || []).filter(sub => 
          sub.status === 'active' || sub.status === 'pending'
        );
        setUserSubscriptions(activeSubscriptions);
      }
    } catch (error) {
      console.error('Failed to check existing subscriptions:', error);
    } finally {
      setCheckingSubscriptions(false);
    }
  };

  async function purchasePlan(plan) {
    // Check for existing active subscriptions
    if (userSubscriptions.length > 0) {
      const activeSubscription = userSubscriptions.find(sub => sub.status === 'active');
      if (activeSubscription) {
        alert(`You already have an active subscription: ${activeSubscription.planName || 'Unknown Plan'}. Please go to My Plans to manage your subscription.`);
        return;
      }
      
      const pendingSubscription = userSubscriptions.find(sub => sub.status === 'pending');
      if (pendingSubscription) {
        alert(`You have a pending subscription payment. Please complete the payment or cancel it before purchasing a new plan.`);
        return;
      }
    }

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      // 1. Create subscription record in backend
      const subscriptionResponse = await subscriptionAPI.createSubscription({
        planId: String(plan.id || plan._id),
        userId: String(user.id || user._id),
        planName: plan.name || plan.planName || "",
        planType: plan.planType || plan.type || "monthly",
        amount: plan.price || plan.amount // Send actual amount
      });

      const subscription =
        subscriptionResponse.data.subscription || subscriptionResponse.data;
      const subscriptionId = subscription.id || subscription._id;

      if (!subscriptionId) {
        alert("Subscription creation failed: No ID returned from backend.");
        return;
      }

      // 2. Navigate to Payment Page with correct subscriptionId and amount
      navigate("/payment", {
        state: {
          paymentInfo: {
            type: "subscription",
            subscriptionId,
            userId: user.id || user._id,
            paymentMethod: "card",
            description: `Subscription - ${plan.name}`,
            amount: plan.price || plan.amount, // Use actual amount
            planDetails: plan,
          },
        },
      });
    } catch (error) {
      console.error("Failed to create subscription:", error);
      alert("Failed to initiate subscription. Please try again.");
    }
  }

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

      {/* Show warning if user has active subscriptions */}
      {userSubscriptions.length > 0 && (
        <div className="alert alert-warning">
          <i className="fas fa-exclamation-triangle me-2"></i>
          You already have {userSubscriptions.length} subscription(s). 
          <a href="/my-plans" className="alert-link ms-1">Manage your existing subscriptions</a>
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
            const hasActiveSubscription = userSubscriptions.some(sub => sub.status === 'active');
            const hasPendingSubscription = userSubscriptions.some(sub => sub.status === 'pending');
            
            return (
              <div className="col-md-4 mb-4" key={plan.id || plan._id || idx}>
                <div className="card h-100">
                  <div className="card-body d-flex flex-column">
                    <h5 className="card-title">{plan.name}</h5>
                    <p className="card-text">
                      ₹{plan.price || plan.amount} / {plan.duration || "period"}
                    </p>
                    {Array.isArray(plan.features) && (
                      <ul>
                        {plan.features.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-auto d-grid">
                      <button
                        className={`btn ${hasActiveSubscription || hasPendingSubscription ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={() => purchasePlan(plan)}
                        disabled={hasActiveSubscription || hasPendingSubscription}
                        title={hasActiveSubscription ? 'You already have an active subscription' : 
                               hasPendingSubscription ? 'You have a pending subscription payment' : ''}
                      >
                        <i className="fas fa-check me-2"></i>
                        {hasActiveSubscription ? 'Already Subscribed' : 
                         hasPendingSubscription ? 'Payment Pending' : 'Purchase'}
                      </button>
                    </div>
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