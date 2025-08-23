import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchSubscriptionPlans } from "../slices/subscriptionplanSlice";
import { subscriptionAPI } from "../api/api";

function SubscriptionPlansPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { plans = [], loading, error } = useSelector(state => state.subscriptionplan);
  const user = useSelector(state => state.auth.user);
  const [processingPlan, setProcessingPlan] = useState(null);

  useEffect(() => {
    dispatch(fetchSubscriptionPlans());
  }, [dispatch]);

  const handleTakePlan = async (plan) => {
    if (!user?.id && !user?._id) {
      alert("Please login to subscribe to a plan");
      navigate('/login');
      return;
    }
  
    setProcessingPlan(plan.id || plan._id);
  
    try {
      // Create subscription via API
      const subscriptionResponse = await subscriptionAPI.createSubscription({
        userId: user.id || user._id,
        planId: plan.id || plan._id,
        planName: plan.name,
        planType: plan.planType || 'monthly'
      });
  
      // Safer access to subscription object
      const subscription = subscriptionResponse.data.subscription || subscriptionResponse.data;
  
      if (!subscription || (!subscription.id && !subscription._id)) {
        throw new Error('Invalid subscription data returned from server');
      }
  
      // Debugging to verify data
      console.log('Created subscription:', subscription);
  
      navigate('/payment', {
        state: {
          paymentInfo: {
            type: 'subscription',
            id: subscription._id || subscription.id,
            amount: plan.price,
            description: `Subscription - ${plan.name} - ₹${plan.price}`,
            plan: plan
          }
        }
      });
  
    } catch (error) {
      console.error('Failed to create subscription:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to create subscription';
      alert(`Subscription creation failed: ${errorMsg}`);
    } finally {
      setProcessingPlan(null);
    }
  };
  

  return (
    <div className="container mt-5 pt-5">
      <h2><i className="fas fa-list-alt me-2"></i>Subscription Plans</h2>
      {loading && <p>Loading...</p>}
      {error && <p className="text-danger">{error}</p>}
      <div className="row">
        {plans.length === 0 && !loading && !error && (
          <div className="col-12 text-center text-muted">No plans found.</div>
        )}
        {plans.map(plan => (
          <div className="col-md-4 mb-4" key={plan.id || plan._id}>
            <div className="card h-100">
              <div className="card-body text-center d-flex flex-column">
                <h5 className="card-title">{plan.name}</h5>
                <h2 className="text-primary">
                  ₹{plan.price}
                  <small className="text-muted">/{plan.duration}</small>
                </h2>
                <ul className="list-unstyled mt-3 flex-grow-1">
                  {(plan.features || []).map((f, i) => (
                    <li key={i} className="mb-2">
                      <i className="fas fa-check text-success me-2"></i>
                      {f}
                    </li>
                  ))}
                </ul>
                <button 
                  className="btn btn-primary w-100 mt-auto"
                  onClick={() => handleTakePlan(plan)}
                  disabled={processingPlan === (plan.id || plan._id)}
                >
                  {processingPlan === (plan.id || plan._id) ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-credit-card me-2"></i>
                      Take Plan
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SubscriptionPlansPage;