import { useSelector, useDispatch } from "react-redux";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchSubscriptionPlans } from "../slices/subscriptionplanSlice";
import { openRazorpayCheckout } from "../utils/razorpay";
import { paymentAPI, subscriptionAPI } from "../api/api";
import { useSelector as useReduxSelector } from 'react-redux'

function PlansPage() {
  const dispatch = useDispatch();
  const { plans = [], loading, error } = useSelector(state => state.subscriptionPlans);
  const q = useSelector(state => state.ui.query)
  const navigate = useNavigate();

  useEffect(() => {
    console.log('=== PLANS PAGE DEBUG START ===');
    console.log('Dispatching fetchSubscriptionPlans...');
    dispatch(fetchSubscriptionPlans());
  }, [dispatch]);

  // Debug plans data whenever it changes
  useEffect(() => {
    console.log('=== PLANS DATA UPDATE ===');
    console.log('Plans state:', plans);
    console.log('Plans count:', plans.length);
    console.log('Loading:', loading);
    console.log('Error:', error);
    if (plans.length > 0) {
      console.log('First plan sample:', plans[0]);
    }
    console.log('=== PLANS DATA UPDATE END ===');
  }, [plans, loading, error]);

  async function purchasePlan(plan) {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      // First create subscription record
      const subscriptionResponse = await subscriptionAPI.createSubscription({
        planId: String(plan.id || plan._id),
        userId: String(user.id || user._id),
        planType: plan.planType || plan.type || 'monthly'
      });
      
      const subscription = subscriptionResponse.data;
      
      // Navigate to payment page with subscription details
      navigate('/payment', {
        state: {
          paymentInfo: {
            type: 'subscription',
            id: subscription.id || subscription._id,
            subscriptionId: subscription.id || subscription._id,
            amount: plan.price || plan.amount || 0,
            description: `Subscription - ${plan.name}`,
            planDetails: plan
          }
        }
      });
    } catch (error) {
      console.error('Failed to create subscription:', error);
      alert('Failed to initiate subscription. Please try again.');
    }
  }

  return (
    <div className="container mt-5 pt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="fas fa-credit-card me-2"></i>Subscription Plans</h2>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <div className="text-center"><div className="spinner-border" role="status"></div></div>}
      
      <div className="row">
        {plans.filter(p => !q || (p.name||'').toLowerCase().includes(q.toLowerCase())).map((plan, idx) => (
          <div className="col-md-4 mb-4" key={plan.id || plan._id || idx}>
            <div className="card h-100">
              <div className="card-body d-flex flex-column">
                <h5 className="card-title">{plan.name}</h5>
                <p className="card-text">₹{plan.price || plan.amount} / {plan.duration || 'period'}</p>
                {Array.isArray(plan.features) && (
                  <ul>
                    {plan.features.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                )}
                <div className="mt-auto d-grid">
                  <button className="btn btn-primary" onClick={() => purchasePlan(plan)}>
                    <i className="fas fa-check me-2"></i>Purchase
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {plans.length === 0 && !loading && (
        <div className="text-center text-muted mt-4">
          <p>No subscription plans available at the moment.</p>
        </div>
      )}
    </div>
  );
}

export default PlansPage;