import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useState, useEffect } from 'react';
import { addTicket } from "../slices/ticketSlice";
import { addSubscription } from "../slices/subscriptionSlice";
import { fetchWallet, deductFare } from "../slices/walletSlice";
import { paymentAPI, ticketAPI, subscriptionAPI, cardAPI } from '../api/api';
import { openRazorpayCheckout } from '../utils/razorpay';

const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const wallet = useSelector((state) => state.wallet);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Get payment info from navigation state
  const paymentInfo = location.state?.paymentInfo;
  
  useEffect(() => {
    if (!paymentInfo) {
      navigate('/dashboard');
    }
  }, [paymentInfo, navigate]);

  if (!paymentInfo) {
    return <div>Loading...</div>;
  }

  // Wallet Payment (for testing)
  async function payWithWallet() {
    setLoading(true);
    setError(null);

    try {
      // Simulate wallet payment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Handle different payment types
      if (paymentInfo.type === 'subscription') {
        navigate('/my-plans');
      } else if (paymentInfo.type === 'ticket') {
        navigate('/tickets');
      } else if (paymentInfo.type === 'card_recharge' || paymentInfo.type === 'card_recharge_by_number') {
        navigate('/cards', {
          state: { 
            message: `Card recharged successfully with ₹${paymentInfo.amount}`,
            type: 'success'
          } 
        });
      }
    } catch (error) {
      console.error('Wallet payment error:', error);
      setError('Wallet payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Razorpay Payment
  async function pay() {
    setLoading(true);
    setError(null);

    try {
      // Map frontend payment types to backend types
      let backendType = paymentInfo.type;
      if (paymentInfo.type === 'card_recharge' || paymentInfo.type === 'card_recharge_by_number') {
        backendType = 'recharge';
      }
      
      const response = await paymentAPI.createPaymentOrder({
        type: backendType,
        id: paymentInfo.id || paymentInfo.cardId,
        userId: user.id || user._id,
        amount: paymentInfo.amount,
        paymentMethod: "upi"
      });

      let order = response.data;

      if (!order?.order_id && !order?.id) {
        throw new Error("Invalid payment order returned");
      }

      await openRazorpayCheckout({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: "INR",
        name: "SmartMetroCard",
        description: `Payment for ${paymentInfo.type}`,
        orderId: order.order_id || order.id,
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phone,
        },
        handler: async (response) => {
          try {
            const { data: verifyResult } = await paymentAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyResult.success) {
              // Handle different payment types
              if (paymentInfo.type === 'subscription') {
                navigate('/my-plans', { 
                  state: { 
                    message: 'Subscription activated successfully!',
                    type: 'success'
                  } 
                });
              } else if (paymentInfo.type === 'ticket') {
                navigate('/tickets', { 
                  state: { 
                    message: 'Ticket booked successfully!',
                    type: 'success'
                  } 
                });
              } else if (paymentInfo.type === 'recharge') {
                navigate('/cards', { 
                  state: { 
                    message: `Card recharged successfully with ₹${paymentInfo.amount}`,
                    type: 'success'
                  } 
                });
              }
            }
          } catch (verifyError) {
            console.error("Payment verification failed:", verifyError);
            alert("Payment verification failed. Please contact support.");
          }
        },
      });
    } catch (error) {
      console.error("Payment error:", error);
      try {
        // Fallback to legacy endpoint
        const fallbackResponse = await paymentAPI.createPaymentOrderLegacy({
          type: paymentInfo.type,
          id: paymentInfo.id,
          userId: user.id || user._id,
          amount: paymentInfo.amount,
          paymentMethod: "upi",
          receipt: `rcpt_${Date.now()}`
        });
        
        const order = fallbackResponse.data;
        if (!order?.order_id && !order?.id) {
          throw new Error("Invalid payment order returned from fallback");
        }

        await openRazorpayCheckout({
          key: import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: order.amount,
          currency: "INR",
          name: "SmartMetroCard",
          description: `Payment for ${paymentInfo.type}`,
          orderId: order.order_id || order.id,
          prefill: {
            name: user.name,
            email: user.email,
            contact: user.phone,
          },
          handler: async (response) => {
            try {
              await paymentAPI.verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              alert("Payment successful!");
              navigate("/dashboard");
            } catch (verifyError) {
              console.error("Payment verification failed:", verifyError);
              alert("Payment verification failed. Please contact support.");
            }
          },
        });
      } catch (fallbackError) {
        console.error("Fallback payment error:", fallbackError);
        setError(fallbackError.message || "Payment failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mt-5 pt-5">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card">
            <div className="card-header bg-success text-white">
              <h5><i className="fas fa-credit-card me-2"></i>Payment</h5>
            </div>
            <div className="card-body">
              {error && <div className="alert alert-danger">{error}</div>}
              <div className="mb-4">
                <h6>Payment Summary</h6>
                <div className="card bg-light p-3">
                  <p>Type: {paymentInfo.type}</p>
                  <p>Amount: {paymentInfo.amount} INR</p>
                  {paymentInfo.booking && <>
                    <p>From: <strong>{paymentInfo.booking.sourceName}</strong></p>
                    <p>To: <strong>{paymentInfo.booking.destinationName}</strong></p>
                    <p>Passengers: {paymentInfo.booking.passengerCount}</p>
                    <p>Journey Type: {paymentInfo.booking.journeyType}</p>
                  </>}
                  {paymentInfo.type === "card_recharge" && (
                    <>
                      <p>Card ID: {paymentInfo.cardId}</p>
                      <p>Recharge Amount: ₹{paymentInfo.amount}</p>
                    </>
                  )}
                  {paymentInfo.type === "card_recharge_by_number" && (
                    <>
                      <p>Card Number: {paymentInfo.cardNumber}</p>
                      <p>Recharge Amount: ₹{paymentInfo.amount}</p>
                    </>
                  )}
                  <p>Wallet Balance: ₹{wallet?.balance || 0}</p>
                </div>
              </div>
              <div className="d-grid gap-2">
                <button className="btn btn-success" onClick={pay} disabled={loading}>
                  {loading ? "Processing..." : "Pay with Card/UPI"}
                </button>
                <button className="btn btn-outline-primary" onClick={payWithWallet} disabled={loading}>
                  Pay with Wallet
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
