import { useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useState, useEffect } from "react";
import { paymentAPI, walletAPI, cardAPI } from "../api/api";
import PaymentSuccessNotification from "../components/PaymentSuccessNotification";
import { updateTicket, fetchTickets } from "../slices/ticketSlice";
import { fetchWallet } from "../slices/walletSlice";

const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("razorpay");
  const [showWalletOption, setShowWalletOption] = useState(false);

  // Get payment info from navigation state
  const paymentInfo = location.state?.paymentInfo;

  // Get user from Redux or localStorage
  const currentUser =
    user || JSON.parse(localStorage.getItem("user") || "null");

  useEffect(() => {
    if (!paymentInfo) {
      setError("Payment information is missing. Please go back and try again.");
    }
  }, [paymentInfo]);

  useEffect(() => {
    // Fetch wallet balance when component mounts
    if (currentUser?.id || currentUser?._id) {
      fetchWalletBalance();
    }
  }, [currentUser]);

  useEffect(() => {
    // Check if wallet payment is available based on balance and payment type
    if (paymentInfo && walletBalance > 0) {
      const amount = paymentInfo.amount || 0;
      const canUseWallet = walletBalance >= amount && 
                          (paymentInfo.type === 'ticket' || 
                           paymentInfo.type === 'ticket_extend' || 
                           paymentInfo.type === 'subscription');
      setShowWalletOption(canUseWallet);
      
      // Auto-select wallet if sufficient balance
      if (canUseWallet && amount <= walletBalance) {
        setSelectedPaymentMethod("wallet");
      }
    }
  }, [walletBalance, paymentInfo]);

  const fetchWalletBalance = async () => {
    try {
      setLoadingWallet(true);
      const response = await walletAPI.getBalance(currentUser?.id || currentUser?._id);
      setWalletBalance(response.data.wallet?.balance || 0);
    } catch (error) {
      console.error("Failed to fetch wallet balance:", error);
      // Don't show error for wallet balance fetch failure
    } finally {
      setLoadingWallet(false);
    }
  };


// Process wallet payment directly
const handleWalletPayment = async () => {
  if (!paymentInfo) {
    setError("No payment information available");
    return;
  }

  // Validate amount
  if (!paymentInfo.amount || paymentInfo.amount <= 0) {
    setError("Invalid payment amount. Please check the payment details.");
    return;
  }

  // Check if user has sufficient balance
  if (walletBalance < paymentInfo.amount) {
    setError(`Insufficient wallet balance. Available: ₹${walletBalance.toFixed(2)}, Required: ₹${paymentInfo.amount.toFixed(2)}`);
    return;
  }

  setWalletLoading(true);
  setError(null);

  try {
    const userId = currentUser?.id || currentUser?._id;
    if (!userId) {
      throw new Error("User authentication required. Please login again.");
    }

    // Determine backend payment type
    let backendType = paymentInfo.type;
    if (paymentInfo.type === "card_recharge" || paymentInfo.type === "card_recharge_by_number") {
      backendType = "recharge";
    } else if (paymentInfo.type === "renewal") {
      backendType = "subscription";
    } else if (paymentInfo.type === "ticket_extend") {
      backendType = "ticket";
    }

    // Extract correct ID
    let paymentId;
    if (paymentInfo.ticketId) {
      paymentId = paymentInfo.ticketId;
    } else if (paymentInfo.id && paymentInfo.id.startsWith("multi-ticket-")) {
      paymentId = paymentInfo.id;
    } else {
      paymentId = paymentInfo.id || paymentInfo.subscriptionId;
    }
    let subscriptionId = paymentInfo.subscriptionId;

    // Resolve card number to ObjectId for recharge
    if (backendType === "recharge" && paymentId && typeof paymentId === "string" && paymentId.startsWith("VM-")) {
      try {
        const res = await cardAPI.getCardByNumber(paymentId);
        const resolvedId = res.data?._id || res.data?.id || res.data?.card?._id || res.data?.card?.id;
        if (!resolvedId) throw new Error("Card not found for recharge");
        paymentId = String(resolvedId);
      } catch (e) {
        console.error("Failed to resolve card number to ID:", e);
        setError("Card not found. Please check the card number.");
        setWalletLoading(false);
        return;
      }
    }

    // If extending a ticket, persist extension first to compute additional fare
    let amountToPay = paymentInfo.amount;
    if (paymentInfo.type === "ticket_extend") {
      try {
        const extendRes = await (await import("../api/api")).ticketAPI.extendJourney({
          ticketId: paymentInfo.ticketId,
          userId,
          newEndStationId: paymentInfo.newEndStationId,
          additionalFare: paymentInfo.amount
        });
        amountToPay = extendRes.data?.amountToPay || paymentInfo.amount;
      } catch (e) {
        console.warn("Extension pre-processing failed, proceeding with provided amount", e);
      }
    }

    // Create wallet payment - this should handle both payment processing AND status update
    const walletResponse = await paymentAPI.createPaymentOrder({
      type: backendType,
      id: paymentId,
      ticketId: paymentInfo.ticketId,
      subscriptionId,
      userId,
      amount: amountToPay,
      paymentMethod: "wallet"
    });

    if (walletResponse.data.success) {
      // Generate success message based on payment type
      const successMessage = backendType === "subscription" 
        ? "Subscription activated successfully!" 
        : backendType === "ticket" 
        ? paymentInfo.type === "ticket_extend" 
          ? "Journey extended successfully!"
          : "Ticket booked successfully!"
        : backendType === "recharge" 
        ? "Card recharged successfully!" 
        : "Payment completed successfully!";
      
      setSuccessMessage(successMessage);
      setShowSuccess(true);

      // Immediately update local wallet balance by deducting the amount
      const newBalance = walletBalance - paymentInfo.amount;
      setWalletBalance(newBalance);
      
      // Also update wallet in localStorage for immediate consistency
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      if (userData.wallet) {
        userData.wallet.balance = newBalance;
        localStorage.setItem("user", JSON.stringify(userData));
      }

      // Refresh wallet balance from backend to ensure accuracy
      if (userId) {
        dispatch(fetchWallet(userId));
      }

      // Refresh tickets list to get updated status
      dispatch(fetchTickets());

      // For subscriptions, refresh subscription data too
      if (backendType === "subscription") {
        // You might need to import and dispatch a fetchSubscriptions action here
      }

      // Redirect after success
      setTimeout(() => {
        if (backendType === "subscription") {
          navigate("/my-plans?activated=1", { 
            state: { 
              message: successMessage,
              updatedSubscription: walletResponse.data.subscription 
            } 
          });
        } else if (backendType === "ticket") {
          if (paymentInfo.type === "ticket_extend") {
            navigate(`/tickets/${paymentInfo.ticketId}?extend_success=true&newEndStationId=${paymentInfo.newEndStationId}&newEndStationName=${paymentInfo.newEndStationName}`, 
              { 
                state: { 
                  message: successMessage,
                  updatedTicket: walletResponse.data.ticket 
                } 
              });
          } else {
            navigate("/tickets", { 
              state: { 
                message: successMessage,
                newTicket: walletResponse.data.ticket 
              } 
            });
          }
        } else if (backendType === "recharge") {
          navigate("/cards", { 
            state: { 
              message: successMessage,
              updatedCard: walletResponse.data.card 
            } 
          });
        } else {
          navigate("/dashboard", { 
            state: { 
              message: successMessage,
              transactionId: walletResponse.data.transactionId 
            } 
          });
        }
      }, 2000);
    } else {
      throw new Error(walletResponse.data.error || "Wallet payment failed");
    }
  } catch (error) {
    console.error("Wallet payment failed:", error);
    let errorMessage = "Wallet payment failed";
    
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    setError(errorMessage);
  } finally {
    setWalletLoading(false);
  }
};

  // Main payment function (for Razorpay)
  const handlePayment = async () => {
    if (!paymentInfo) {
      setError("No payment information available");
      return;
    }

    // Validate amount
    if (!paymentInfo.amount || paymentInfo.amount <= 0) {
      setError("Invalid payment amount. Please check the payment details.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get user ID
      const userId = currentUser?.id || currentUser?._id;
      if (!userId) {
        throw new Error("User authentication required. Please login again.");
      }

      // Map payment type
      let backendType = paymentInfo.type;
      if (paymentInfo.type === "card_recharge" || paymentInfo.type === "card_recharge_by_number") {
        backendType = "recharge";
      } else if (paymentInfo.type === "renewal") {
        backendType = "subscription";
      } else if (paymentInfo.type === "ticket_extend") {
        backendType = "ticket";
      }

      // Extract correct IDs
      let paymentId = paymentInfo.id || paymentInfo.subscriptionId;
      let subscriptionId = paymentInfo.subscriptionId;

      // Resolve card number to ObjectId for recharge
      if (backendType === "recharge" && paymentId && typeof paymentId === "string" && paymentId.startsWith("VM-")) {
        try {
          const res = await cardAPI.getCardByNumber(paymentId);
          const resolvedId = res.data?._id || res.data?.id || res.data?.card?._id || res.data?.card?.id;
          if (!resolvedId) throw new Error("Card not found for recharge");
          paymentId = String(resolvedId);
        } catch (e) {
          console.error("Failed to resolve card number to ID:", e);
          setError("Card not found. Please check the card number.");
          setLoading(false);
          return;
        }
      }

      // Build payment payload
      let paymentPayload;
      if (backendType === "subscription") {
        paymentPayload = {
          type: "subscription",
          id: subscriptionId,
          userId,
          paymentMethod: "card",
          amount: paymentInfo.amount,
        };
      } else {
        paymentPayload = {
          type: backendType,
          id: paymentId,
          userId,
          amount: paymentInfo.amount,
          paymentMethod: "razorpay",
        };
      }

      const response = await paymentAPI.createPaymentOrder(paymentPayload);
      const order = response.data;

      // Razorpay options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_demo",
        amount: order.amount,
        currency: "INR",
        name: "SmartMetroCard",
        description: paymentInfo.description || `Payment for ${paymentInfo.type}`,
        order_id: order.order_id || order.id,
        prefill: {
          name: currentUser?.name || "",
          email: currentUser?.email || "",
          contact: currentUser?.phone || "",
        },
        handler: async function (response) {
          try {
            // Verify payment with backend
            const verifyResponse = await paymentAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              // Provide context so backend can finalize business logic
              type: backendType,
              id: paymentId,
              userId,
              amount: paymentInfo.amount,
              description: paymentInfo.description,
              paymentMethod: 'razorpay',
              expected_order_id: order.order_id || order.id
            });

            if (verifyResponse.data.success) {
              const successMessage = backendType === "subscription" 
                ? "Subscription renewed successfully!" 
                : backendType === "ticket" 
                ? paymentInfo.type === "ticket_extend" 
                  ? "Journey extended successfully!"
                  : "Ticket booked successfully!"
                : backendType === "recharge" 
                ? "Card recharged successfully!" 
                : "Payment completed successfully!";
              
              setSuccessMessage(successMessage);
              setShowSuccess(true);
              
              setTimeout(() => {
                if (backendType === "subscription") {
                  navigate("/my-plans?activated=1", {
                    state: { message: successMessage },
                  });
                } else if (backendType === "ticket") {
                  if (paymentInfo.type === "ticket_extend") {
                    navigate(`/tickets/${paymentInfo.ticketId}?payment_success=true&payment_type=extend&ticket_id=${paymentInfo.ticketId}`, { state: { message: successMessage } });
                  } else {
                    navigate("/tickets", {
                      state: { message: successMessage },
                    });
                  }
                } else if (backendType === "recharge") {
                  navigate("/cards", {
                    state: { message: successMessage },
                  });
                } else {
                  navigate("/dashboard", { state: { message: successMessage } });
                }
              }, 2000);
            } else {
              const softMessage = "Payment processed, verification pending. Your changes will reflect shortly.";
              setSuccessMessage(softMessage);
              setShowSuccess(true);
              setTimeout(() => {
                navigate(-1);
              }, 1500);
            }
          } catch (verifyError) {
            console.error("Payment verification failed:", verifyError);
            let verifyErrorMessage = "Payment verification failed. Please contact support.";
            if (verifyError.response?.data?.error) {
              verifyErrorMessage = verifyError.response.data.error;
            } else if (verifyError.message) {
              verifyErrorMessage = verifyError.message;
            }
            setError(verifyErrorMessage);
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      // Open Razorpay
      if (typeof window.Razorpay === "undefined") {
        console.log("Razorpay not available, simulating payment...");
        setTimeout(() => {
          const successMessage = backendType === "subscription" 
            ? "Subscription renewed successfully! (Simulated)" 
            : backendType === "ticket" 
            ? paymentInfo.type === "ticket_extend" 
              ? "Journey extended successfully! (Simulated)"
              : "Ticket booked successfully! (Simulated)"
            : backendType === "recharge" 
            ? "Card recharged successfully! (Simulated)" 
            : "Payment completed successfully! (Simulated)";
          
          setSuccessMessage(successMessage);
          setShowSuccess(true);

          setTimeout(() => {
            if (backendType === "subscription") {
              navigate("/my-plans", { state: { message: successMessage } });
            } else if (backendType === "ticket") {
              if (paymentInfo.type === "ticket_extend") {
                navigate(`/ticket-details/${paymentInfo.ticketId}?extend_success=true&newEndStationId=${paymentInfo.newEndStationId}&newEndStationName=${paymentInfo.newEndStationName}`, 
                  { state: { message: successMessage } });
              } else {
                navigate("/tickets", { state: { message: successMessage } });
              }
            } else if (backendType === "recharge") {
              navigate("/cards", { state: { message: successMessage } });
            } else {
              navigate("/dashboard", { state: { message: successMessage } });
            }
          }, 2000);
        }, 2000);
      } else {
        const razorpay = new window.Razorpay(options);
        razorpay.open();
      }
    } catch (error) {
      console.error("Payment error:", error);
      let errorMessage = "Payment failed";
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!paymentInfo) {
    return (
      <div className="container mt-5 pt-5">
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle me-2"></i>
          Payment information is missing. Please go back and try again.
        </div>
        <button className="btn btn-primary" onClick={() => navigate(-1)}>
          <i className="fas fa-arrow-left me-2"></i>Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="container mt-5 pt-5">
      {showSuccess && (
        <PaymentSuccessNotification
          message={successMessage}
          type="success"
          onClose={() => setShowSuccess(false)}
        />
      )}
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card border-0 shadow">
            <div className="card-header bg-primary text-white">
              <h4 className="mb-0">
                <i className="fas fa-credit-card me-2"></i>
                Complete Payment
              </h4>
            </div>

            <div className="card-body p-4">
              {error && (
                <div className="alert alert-danger">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  {error}
                </div>
              )}

              <div className="row">
                <div className="col-md-6">
                  <div className="card">
                    <div className="card-body">
                      <h5 className="card-title">
                        <i className="fas fa-credit-card text-primary me-2"></i>
                        Payment Details
                      </h5>
                      <div className="mb-3">
                        <strong>Type:</strong> {paymentInfo.type}
                      </div>
                      <div className="mb-3">
                        <strong>Amount:</strong> 
                        {paymentInfo.amount ? (
                          <span className="text-success fw-bold">₹{Number(paymentInfo.amount).toFixed(2)}</span>
                        ) : (
                          <span className="text-danger">Amount not available</span>
                        )}
                      </div>
                      <div className="mb-3">
                        <strong>Description:</strong>{" "}
                        {paymentInfo.description || "Payment"}
                      </div>
                      {paymentInfo.planDetails && (
                        <div className="mb-3">
                          <strong>Plan:</strong> {paymentInfo.planDetails.name || paymentInfo.planDetails.planName || 'N/A'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="col-md-6">
                  <div className="card">
                    <div className="card-body">
                      <h5 className="card-title">
                        <i className="fas fa-wallet text-success me-2"></i>
                        Wallet Balance
                      </h5>
                      {loadingWallet ? (
                        <div className="text-center">
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Loading...
                        </div>
                      ) : (
                        <div className="mb-3">
                          <span className="h4 text-success">₹{walletBalance.toFixed(2)}</span>
                          <div className="text-muted small">Available in wallet</div>
                          {walletBalance >= (paymentInfo.amount || 0) ? (
                            <div className="text-success small">
                              <i className="fas fa-check-circle me-1"></i>
                              Sufficient balance for this payment
                            </div>
                          ) : (
                            <div className="text-warning small">
                              <i className="fas fa-exclamation-triangle me-1"></i>
                              Insufficient balance (₹{((paymentInfo.amount || 0) - walletBalance).toFixed(2)} short)
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="d-grid gap-3">
                  {/* Wallet Payment Button - Show only if sufficient balance */}
                  {showWalletOption && (
                    <button
                      className="btn btn-success btn-lg"
                      onClick={handleWalletPayment}
                      disabled={walletLoading || !paymentInfo.amount}
                    >
                      {walletLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Processing Wallet Payment...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-wallet me-2"></i>
                          Pay ₹{Number(paymentInfo.amount || 0).toFixed(2)} with Wallet
                        </>
                      )}
                    </button>
                  )}

                  {/* Regular Payment Button */}
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handlePayment}
                    disabled={loading || !paymentInfo.amount}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Processing Payment...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-credit-card me-2"></i>
                        {paymentInfo.amount ? (
                          <>
                            Pay with Card/UPI ₹{Number(paymentInfo.amount).toFixed(2)}
                          </>
                        ) : (
                          <>
                            <i className="fas fa-exclamation-triangle me-2"></i>
                            Amount not available
                          </>
                        )}
                      </>
                    )}
                  </button>

                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => navigate(-1)}
                    disabled={loading || walletLoading}
                  >
                    <i className="fas fa-arrow-left me-2"></i>
                    Go Back
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;