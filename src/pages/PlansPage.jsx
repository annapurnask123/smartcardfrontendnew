import { useSelector, useDispatch } from "react-redux";
import { useEffect } from "react";
import { fetchSubscriptionPlans } from "../slices/subscriptionplanSlice";
import { openRazorpayCheckout } from "../utils/razorpay";
import { paymentAPI, subscriptionAPI } from "../api/api";
import { useSelector as useReduxSelector } from 'react-redux'

function PlansPage() {
  const dispatch = useDispatch();
  const { plans = [], loading, error } = useSelector(state => state.subscriptionPlans);
  const q = useSelector(state => state.ui.query)

  useEffect(() => {
    dispatch(fetchSubscriptionPlans());
  }, [dispatch]);

  async function purchasePlan(plan) {
    try {
      const amountPaise = Math.round((plan.price || plan.amount || 0) * 100)
      let order
      try {
        const res = await paymentAPI.createPaymentOrder({ 
        amount: amountPaise, 
        currency: 'INR', 
        purpose: 'subscription', 
        meta: { planId: plan.id || plan._id } 
        })
        order = res.data
      } catch (e) {
        // fallback to legacy endpoint
        const res2 = await paymentAPI.createPaymentOrderLegacy({
          amount: amountPaise,
          currency: 'INR',
          purpose: 'subscription',
          meta: { planId: plan.id || plan._id }
        })
        order = res2.data
      }
      
      await openRazorpayCheckout({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_xxxxxxxxxxxxx',
        amount: order.amount,
        name: 'SmartMetroCard',
        description: `Purchase ${plan.name}`,
        orderId: order.id,
        handler: async (response) => {
          try {
            await paymentAPI.verifyPayment({
              orderId: order.id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            })
            await subscriptionAPI.createSubscription({ 
              planId: plan.id || plan._id, 
              paymentOrderId: order.id 
            })
            alert('Subscription purchased successfully!')
            // Navigate to My Plans page
            window.location.href = '/my-plans'
          } catch (error) {
            console.error('Payment verification failed:', error)
            alert('Payment verification failed. Please contact support.')
          }
        },
      })
    } catch (error) {
      console.error('Payment order creation failed:', error)
      alert('Failed to create payment order. Please try again.')
    }
  }

  return (
    <div className="container mt-5 pt-5">
      {/* ...existing code... */}
      <div className="row">
  {plans.filter(p => !q || (p.name||'').toLowerCase().includes(q.toLowerCase())).map((plan, idx) => (
    <div className="col-md-4 mb-4" key={plan.id || plan._id || idx}>
      <div className="card h-100">
        <div className="card-body d-flex flex-column">
          <h5 className="card-title">{plan.name}</h5>
          <p className="card-text">₹{plan.price || plan.amount} / {plan.duration || 'period'}</p>
         {Array.isArray(plan.features) && (
  <ul>
    {plan.features.map((f) => (
      <li key={f}>{f}</li>
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
    </div>
  );
}

export default PlansPage;