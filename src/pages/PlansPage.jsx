import { useSelector, useDispatch } from "react-redux";
import { useEffect } from "react";
import { fetchSubscriptionPlans } from "../slices/subscriptionplanSlice";
import { openRazorpayCheckout } from "../utils/razorpay";
import { paymentAPI, subscriptionAPI } from "../api/api";

function PlansPage() {
  const dispatch = useDispatch();
  const { plans = [], loading, error } = useSelector(state => state.subscriptionplan);

  useEffect(() => {
    dispatch(fetchSubscriptionPlans());
  }, [dispatch]);

  async function purchasePlan(plan) {
    try {
      const amountPaise = Math.round((plan.price || plan.amount || 0) * 100)
      const { data: order } = await paymentAPI.createPaymentOrder({ amount: amountPaise, currency: 'INR', purpose: 'subscription', meta: { planId: plan.id || plan._id } })
      await openRazorpayCheckout({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_xxxxxxxxxxxxx',
        amount: order.amount,
        name: 'SmartMetroCard',
        description: `Purchase ${plan.name}`,
        orderId: order.id,
        handler: async (response) => {
          await paymentAPI.verifyPayment({
            orderId: order.id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            razorpaySignature: response.razorpay_signature,
          })
          await subscriptionAPI.createSubscription({ planId: plan.id || plan._id, paymentOrderId: order.id })
          // Optionally navigate to My Plans or show toast
        },
      })
    } catch {}
  }

  return (
    <div className="container mt-5 pt-5">
      {/* ...existing code... */}
      <div className="row">
  {plans.map((plan, idx) => (
    <div className="col-md-4 mb-4" key={plan.id || plan._id || idx}>
      <div className="card h-100">
        <div className="card-body d-flex flex-column">
          <h5 className="card-title">{plan.name}</h5>
          <p className="card-text">₹{plan.price || plan.amount} / {plan.duration || 'period'}</p>
          {Array.isArray(plan.features) && (
            <ul>
              {plan.features.map((f, i) => <li key={i}>{f}</li>)}
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
    </div>
  );
}

export default PlansPage;