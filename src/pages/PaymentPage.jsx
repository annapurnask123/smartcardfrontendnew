import { useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useState, useEffect } from "react";

import { addTicket } from "../slices/ticketSlice";
import { addSubscription } from "../slices/subscriptionSlice";
import { fetchWallet, deductFare } from "../slices/walletSlice";
import { cardAPI } from "../api/api";

import { paymentAPI, ticketAPI, subscriptionAPI } from "../api/api";
import { openRazorpayCheckout } from "../utils/razorpay";

export default function PaymentPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const user = useSelector((s) => s.auth.user);
  const wallet = useSelector((s) => s.wallet);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const paymentInfo = state?.paymentInfo;

  useEffect(() => {
    if (!paymentInfo) setError("Payment info missing");
    if (!user) setError("User not logged in");
    if (user && paymentInfo) dispatch(fetchWallet(user.id));
  }, [paymentInfo, user, dispatch]);

  if (!paymentInfo) return <div className="container mt-5">Payment info missing</div>;
  if (!user) return <div className="container mt-5">User not logged in</div>;

  const goToResult = (success, message = "") => {
    const result = { success, method: paymentInfo.paymentMethod || "razorpay", message };
    localStorage.setItem("lastPaymentResult", JSON.stringify({ ...result, paymentInfo }));
    navigate("/payment-result");
  };

  // Wallet Payment
  async function payWithWallet() {
    setLoading(true);
    setError(null);

    try {
      if (wallet.balance < paymentInfo.amount) {
        return goToResult(false, "Insufficient wallet balance.");
      }

      await dispatch(deductFare({ userId: user.id, amount: paymentInfo.amount })).unwrap();

      if (paymentInfo.type === "ticket") {
        const ticketPayload = {
          userId: user.id,
          trip_id: '100', // Replace with real tripId if needed
          startStationId: paymentInfo.booking.sourceId,
          endStationId: paymentInfo.booking.destinationId,
          ticketType: paymentInfo.booking.journeyType,
          passengerCount: Number(paymentInfo.booking.passengerCount),
          amount: Number(paymentInfo.amount),
          paymentMethod: "wallet",
        };

        const { data: ticket } = await ticketAPI.bookTicket(ticketPayload);
        dispatch(addTicket({
          id: ticket.id || ticket._id || `TKT${Date.now()}`,
          source: paymentInfo.booking.sourceName,
          destination: paymentInfo.booking.destinationName,
          date: new Date().toLocaleDateString(),
          status: ticket.status || "active",
          amount: paymentInfo.amount,
        }));
      } else if (paymentInfo.type === "subscription") {
        const { data: subscription } = await subscriptionAPI.getSubscription(paymentInfo.id);
        dispatch(addSubscription(subscription));
                  } else if (paymentInfo.type === "card_recharge") {
              // Handle card recharge
              try {
                await cardAPI.rechargeCard(paymentInfo.cardId, { amount: paymentInfo.amount });
                // Navigate back to cards page with success message
                navigate('/cards', { 
                  state: { 
                    message: `Card recharged successfully with ₹${paymentInfo.amount}`,
                    type: 'success'
                  } 
                });
              } catch (error) {
                console.error('Card recharge failed:', error);
                navigate('/cards', { 
                  state: { 
                    message: 'Card recharge failed. Please try again.',
                    type: 'error'
                  } 
                });
              }
            }

      goToResult(true);
    } catch (err) {
      console.error("Wallet payment error:", err);
      goToResult(false, "Wallet payment failed.");
    } finally {
      setLoading(false);
    }
  }

  // Razorpay Payment
  async function pay() {
    setLoading(true);
    setError(null);

    try {
      const amountPaise = Math.round(Number(paymentInfo.amount) * 100);

      const payload = {
        amount: amountPaise,
        currency: "INR",
        purpose: paymentInfo.type,
        type: paymentInfo.type,
        id: paymentInfo.id,
        userId: user.id || user._id,
        meta: paymentInfo.booking
          ? {
              startStationId: paymentInfo.booking.sourceId,
              endStationId: paymentInfo.booking.destinationId,
              passengerCount: Number(paymentInfo.booking.passengerCount),
              ticketType: paymentInfo.booking.journeyType,
            }
          : {},
      };

      let order
      try {
        const res = await paymentAPI.createPaymentOrder(payload);
        order = res.data
      } catch (e) {
        // fallback to legacy endpoint path
        const res2 = await paymentAPI.createPaymentOrderLegacy(payload)
        order = res2.data
      }

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

            if (!verifyResult?.success) {
              console.error("Payment verification failed", verifyResult);
              return goToResult(false, "Payment verification failed.");
            }

            if (paymentInfo.type === "ticket") {
              const ticketPayload = {
                userId: user.id,
                trip_id: '100', // Replace with real tripId if needed
                startStationId: paymentInfo.booking.sourceId,
                endStationId: paymentInfo.booking.destinationId,
                ticketType: paymentInfo.booking.journeyType,
                passengerCount: Number(paymentInfo.booking.passengerCount),
                amount: Number(paymentInfo.amount),
                paymentMethod: "razorpay",
                paymentOrderId: order.order_id || order.id,
              };

              console.log("Booking payload:", ticketPayload); // Debug

              const { data: ticket } = await ticketAPI.bookTicket(ticketPayload);
              const ticketId = ticket.id || ticket._id;
              dispatch(addTicket({
                id: ticketId || `TKT${Date.now()}`,
                source: paymentInfo.booking.sourceName,
                destination: paymentInfo.booking.destinationName,
                date: new Date().toLocaleDateString(),
                status: ticket.status || "active",
                amount: paymentInfo.amount,
              }));
              // Navigate to Ticket Details page after successful ticket payment
              localStorage.setItem("lastPaymentResult", JSON.stringify({ success: true, method: "razorpay", paymentInfo }));
              return navigate(`/tickets/${encodeURIComponent(ticketId)}`);
            } else if (paymentInfo.type === "subscription") {
              const { data: subscription } = await subscriptionAPI.getSubscription(paymentInfo.id);
              dispatch(addSubscription(subscription));
            } else if (paymentInfo.type === "card_recharge") {
              // Handle card recharge
              try {
                await cardAPI.rechargeCard(paymentInfo.cardId, { amount: paymentInfo.amount });
                // Navigate back to cards page with success message
                navigate('/cards', { 
                  state: { 
                    message: `Card recharged successfully with ₹${paymentInfo.amount}`,
                    type: 'success'
                  } 
                });
              } catch (error) {
                console.error('Card recharge failed:', error);
                navigate('/cards', { 
                  state: { 
                    message: 'Card recharge failed. Please try again.',
                    type: 'error'
                  } 
                });
              }
            }

            goToResult(true);
          } catch (err) {
            console.error("Payment handler error:", err);
            goToResult(false, "Payment verification failed.");
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      });
    } catch (err) {
      console.error("Payment initiation error:", err);
      goToResult(false, "Payment initiation failed.");
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
                  <p>Wallet Balance: ₹{wallet.balance}</p>
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
}
