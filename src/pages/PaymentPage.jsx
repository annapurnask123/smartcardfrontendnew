import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useState, useEffect } from "react";
import { paymentAPI, walletAPI } from "../api/api";
import PaymentSuccessNotification from "../components/PaymentSuccessNotification";

const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingWallet, setLoadingWallet] = useState(false);

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

  // Main payment function
  const handlePayment = async (overrideInfo) => {
    const info = overrideInfo || paymentInfo;

    if (!info) {
      setError("No payment information available");
      return;
    }

    // Validate amount
    if (!info.amount || info.amount <= 0) {
      setError("Invalid payment amount. Please check the payment details.");
      return;
    }

    // Validate amount format
    if (typeof info.amount !== 'number' || isNaN(info.amount)) {
      setError("Invalid payment amount format. Please contact support.");
      return;
    }

    // Validate minimum amount
    if (info.amount < 1) {
      setError("Payment amount must be at least ₹1.");
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
      let backendType = info.type;
      if (info.type === "card_recharge" || info.type === "card_recharge_by_number") {
        backendType = "recharge";
      } else if (info.type === "renewal") {
        backendType = "subscription"; // Map renewal to subscription type
      } else if (info.type === "ticket_extend") {
        backendType = "ticket"; // Map ticket_extend to ticket type for backend
      }

      // Extract correct IDs with better validation
      let paymentId = info.id || info.ticketId || info.subscriptionId;
      let subscriptionId = info.subscriptionId;

      // For ticket payments, ensure we have valid ticket IDs
      if (backendType === "ticket" && info.ticketIds && info.ticketIds.length > 0) {
        paymentId = info.ticketIds[0]; // Use first ticket ID
      }

      // Validate ID format - accept both ObjectId (24 hex chars) and UUID formats
      const isValidObjectId = (id) => typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);
      const isValidUUID = (id) => typeof id === 'string' && /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/i.test(id);
      
      if ((backendType === 'ticket' || backendType === 'subscription') && !isValidObjectId(paymentId) && !isValidUUID(paymentId)) {
        console.error('Invalid ID format:', paymentId, 'Type:', typeof paymentId, 'Backend type:', backendType);
        setError('Invalid ID format. Please contact support.');
        setLoading(false);
        return;
      }

      console.log("Processing payment:", {
        type: backendType,
        originalType: info.type,
        paymentId,
        subscriptionId,
        userId,
        amount: info.amount,
        paymentInfo: info
      });

      // Wallet payment
      if (info.type === "wallet_payment") {
        // Check wallet balance before proceeding
        if (walletBalance < info.amount) {
          setError(`Insufficient wallet balance. Available: ₹${walletBalance.toFixed(2)}, Required: ₹${info.amount.toFixed(2)}`);
          return;
        }

        try {
          const walletResponse = await paymentAPI.createPaymentOrder({
            type: info.originalType || backendType,
            id: paymentId,
            ticketId: info.ticketId,
            subscriptionId,
            userId,
            amount: info.amount,
            paymentMethod: "wallet",
          });

          if (walletResponse.data.success) {
            const successMessage = backendType === "subscription" 
              ? "Subscription renewed successfully!" 
              : backendType === "ticket" 
              ? info.type === "ticket_extend" 
                ? "Journey extended successfully!"
                : "Ticket booked successfully!"
              : backendType === "recharge" 
              ? "Card recharged successfully!" 
              : "Payment completed successfully!";
            
            setSuccessMessage(successMessage);
            setShowSuccess(true);

            // Update wallet balance
            setWalletBalance(walletBalance - info.amount);

            // Redirect after success
            setTimeout(() => {
              if (backendType === "subscription") {
                navigate("/my-plans?activated=1", { state: { message: successMessage } });
              } else if (backendType === "ticket") {
                if (info.type === "ticket_extend") {
                  // Redirect back to ticket detail with extend success
                  navigate(`/ticket-details/${info.ticketId}?extend_success=true&newEndStationId=${info.newEndStationId}&newEndStationName=${info.newEndStationName}`, 
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
            return;
          } else {
            throw new Error(walletResponse.data.error || "Wallet payment failed");
          }
        } catch (walletError) {
          console.error("Wallet payment failed:", walletError);
          let walletErrorMessage = "Wallet payment failed";
          
          if (walletError.response?.data?.error) {
            walletErrorMessage = walletError.response.data.error;
          } else if (walletError.message) {
            walletErrorMessage = walletError.message;
          }
          
          setError(walletErrorMessage);
          setLoading(false);
          return;
        }
      }

      // Build payment payload
      let paymentPayload;
      if (backendType === "subscription") {
        paymentPayload = {
          type: "subscription",
          id: subscriptionId, // use correct subscriptionId
          userId,
          paymentMethod: info.paymentMethod || "card",
          amount: info.amount, // Use actual amount from paymentInfo
        };
      } else {
        paymentPayload = {
          type: backendType,
          id: paymentId,
          userId,
          amount: info.amount, // Use actual amount from paymentInfo
          paymentMethod: info.paymentMethod || "upi",
        };
      }

      console.log("Payment payload:", paymentPayload);
      const response = await paymentAPI.createPaymentOrder(paymentPayload);

      const order = response.data;
      console.log("Payment order created:", order);

      // Use the amount from the order response (which is in paise) for Razorpay
      const razorpayAmount = order.amount; // This is already in paise from backend
      
      // For verification, use the amount from paymentInfo (in rupees)
      const verificationAmount = info.amount;

      console.log("Amount details:", {
        originalAmount: info.amount,
        orderAmount: order.amount,
        razorpayAmount,
        verificationAmount
      });

      // Razorpay options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_demo",
        amount: razorpayAmount, // Use amount from order response (in paise)
        currency: "INR",
        name: "SmartMetroCard",
        description: info.description || `Payment for ${info.type}`,
        order_id: order.order_id || order.id,
        prefill: {
          name: currentUser?.name || "",
          email: currentUser?.email || "",
          contact: currentUser?.phone || "",
        },
        handler: async function (response) {
          try {
            console.log("Payment successful:", response);

            // Verify payment with backend
            const verifyResponse = await paymentAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyResponse.data.success) {
              const successMessage = backendType === "subscription" 
                ? "Subscription renewed successfully!" 
                : backendType === "ticket" 
                ? info.type === "ticket_extend" 
                  ? "Journey extended successfully!"
                  : "Ticket booked successfully!"
                : backendType === "recharge" 
                ? "Card recharged successfully!" 
                : "Payment completed successfully!";
              
              setSuccessMessage(successMessage);
              setShowSuccess(true);
              
              // Log success for debugging
              console.log("Payment verification successful:", verifyResponse.data);
              
              setTimeout(() => {
                if (backendType === "subscription") {
                  navigate("/my-plans?activated=1", {
                    state: { message: successMessage },
                  });
                } else if (backendType === "ticket") {
                  if (info.type === "ticket_extend") {
                    // Redirect back to ticket details route used in app
                    navigate(`/tickets/${info.ticketId}?payment_success=true&payment_type=extend&ticket_id=${info.ticketId}`, { state: { message: successMessage } });
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
              // Do not show a blocking verification failed message after success
              // Instead, redirect with a soft error note
              const softMessage = "Payment processed, verification pending. Your changes will reflect shortly.";
              setSuccessMessage(softMessage);
              setShowSuccess(true);
              setTimeout(() => {
                if (backendType === "ticket" && info.type === "ticket_extend") {
                  navigate(`/tickets/${info.ticketId}`, { state: { message: softMessage } });
                } else {
                  navigate(-1);
                }
              }, 1500);
            }
          } catch (verifyError) {
            console.error("Payment verification failed:", verifyError);
            // For extend payments, avoid blocking UX; navigate back with toast
            if (info.type === "ticket_extend") {
              const softMessage = "Payment received. Verification will complete shortly.";
              setSuccessMessage(softMessage);
              setShowSuccess(true);
              setTimeout(() => {
                navigate(`/tickets/${info.ticketId}`);
              }, 1200);
            } else {
              let verifyErrorMessage = "Payment verification failed. Please contact support.";
              if (verifyError.response?.data?.error) {
                verifyErrorMessage = verifyError.response.data.error;
              } else if (verifyError.message) {
                verifyErrorMessage = verifyError.message;
              }
              setError(verifyErrorMessage);
              setLoading(false);
            }
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      // Open Razorpay or simulate if unavailable
      if (typeof window.Razorpay === "undefined") {
        console.log("Razorpay not available, simulating payment...");
        setTimeout(() => {
          const successMessage = backendType === "subscription" 
            ? "Subscription renewed successfully! (Simulated)" 
            : backendType === "ticket" 
            ? info.type === "ticket_extend" 
              ? "Journey extended successfully! (Simulated)"
              : "Ticket booked successfully! (Simulated)"
            : backendType === "recharge" 
            ? "Card recharged successfully! (Simulated)" 
            : "Payment completed successfully! (Simulated)";
          
          setSuccessMessage(successMessage);
          setShowSuccess(true);

          // Redirect after success
          setTimeout(() => {
            if (backendType === "subscription") {
              navigate("/my-plans", { state: { message: successMessage } });
            } else if (backendType === "ticket") {
              if (info.type === "ticket_extend") {
                // Redirect back to ticket detail with extend success
                navigate(`/ticket-details/${info.ticketId}?extend_success=true&newEndStationId=${info.newEndStationId}&newEndStationName=${info.newEndStationName}`, 
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
      
      // Handle specific error types
      if (errorMessage.includes('amount') || errorMessage.includes('Amount')) {
        errorMessage = "Invalid payment amount. Please check the payment details.";
      } else if (errorMessage.includes('subscription') || errorMessage.includes('Subscription')) {
        errorMessage = "Subscription error. Please try again or contact support.";
      } else if (errorMessage.includes('payment') || errorMessage.includes('Payment')) {
        errorMessage = "Payment processing error. Please try again.";
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
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={() => handlePayment()}
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
                            Pay ₹{Number(paymentInfo.amount).toFixed(2)}
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

                  {(paymentInfo.type === 'ticket' || paymentInfo.type === 'ticket_extend') && walletBalance >= (paymentInfo.amount || 0) && (
                    <button
                      className="btn btn-success btn-lg"
                      onClick={() => {
                        const walletPaymentInfo = {
                          ...paymentInfo,
                          type: "wallet_payment",
                          originalType: paymentInfo.type,
                        };
                        handlePayment(walletPaymentInfo);
                      }}
                      disabled={loading || !paymentInfo.amount}
                    >
                      <i className="fas fa-wallet me-2"></i>
                      Pay ₹{Number(paymentInfo.amount || 0).toFixed(2)} with Wallet
                    </button>
                  )}

                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => navigate(-1)}
                    disabled={loading}
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