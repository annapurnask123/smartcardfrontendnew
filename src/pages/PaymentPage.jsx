import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useState, useEffect } from 'react';
import { paymentAPI } from '../api/api';
import PaymentSuccessNotification from '../components/PaymentSuccessNotification';

const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Get payment info from navigation state
  const paymentInfo = location.state?.paymentInfo;
  
  // Get user from Redux or localStorage
  const currentUser = user || JSON.parse(localStorage.getItem('user') || 'null');
  
  useEffect(() => {
    if (!paymentInfo) {
      setError("Payment information is missing. Please go back and try again.");
    }
  }, [paymentInfo]);

  // Simple payment function
  const handlePayment = async () => {
    if (!paymentInfo) {
      setError("No payment information available");
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
      if (paymentInfo.type === 'card_recharge' || paymentInfo.type === 'card_recharge_by_number') {
        backendType = 'recharge';
      }

      // Get payment ID and subscriptionId directly from paymentInfo
      let paymentId = paymentInfo.id;
      let subscriptionId = paymentInfo.subscriptionId;

      // Validate presence for subscriptions - only subscriptionId is required
      if (backendType === 'subscription' && !subscriptionId) {
        setError('Subscription ID missing. Please try again or contact support.');
        setLoading(false);
        return;
      }

      console.log('Processing payment:', {
        type: backendType,
        id: paymentId,
        userId: userId,
        amount: paymentInfo.amount
      });

      // Check if it's wallet payment
      if (paymentInfo.type === 'wallet_payment') {
        try {
          // Process wallet payment through backend
          const walletResponse = await paymentAPI.createPaymentOrder({
            type: paymentInfo.originalType || backendType,
            id: paymentId,
            userId: userId,
            amount: paymentInfo.amount,
            paymentMethod: "wallet"
          });
          
          if (walletResponse.data.success) {
            setSuccessMessage('Payment completed successfully!');
            setShowSuccess(true);
            
            // Navigate based on payment type
            setTimeout(() => {
              if (backendType === 'subscription') {
                navigate('/my-plans?activated=1');
              } else if (backendType === 'ticket') {
                navigate('/tickets');
              } else if (backendType === 'recharge') {
                navigate('/cards');
              } else {
                navigate('/dashboard');
              }
            }, 2000);
            return;
          } else {
            throw new Error(walletResponse.data.error || 'Wallet payment failed');
          }
        } catch (walletError) {
          console.error('Wallet payment failed:', walletError);
          setError(walletError.response?.data?.error || 'Wallet payment failed');
          return;
        }
      }

      // Create payment payload and log it for debugging
      const paymentPayload = {
        type: backendType,
        id: paymentId,
        userId: userId,
        amount: paymentInfo.amount || 100,
        paymentMethod: "upi"
      };

      // Add subscription-specific fields for subscription payments
      if (backendType === 'subscription' && subscriptionId) {
        paymentPayload.subscriptionId = subscriptionId;
        paymentPayload.id = subscriptionId; // Use subscriptionId as the main ID for subscription payments
      }

      console.log('Payment payload:', paymentPayload);
      const response = await paymentAPI.createPaymentOrder(paymentPayload);

      const order = response.data;
      console.log('Payment order created:', order);

      // Initialize Razorpay
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_demo',
        amount: order.amount || paymentInfo.amount * 100, // Razorpay expects amount in paise
        currency: "INR",
        name: "SmartMetroCard",
        description: paymentInfo.description || `Payment for ${paymentInfo.type}`,
        order_id: order.order_id || order.id,
        prefill: {
          name: currentUser?.name || '',
          email: currentUser?.email || '',
          contact: currentUser?.phone || '',
        },
        handler: async function (response) {
          try {
            console.log('Payment successful:', response);
            
            // Verify payment with backend
            const verifyResponse = await paymentAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              type: backendType,
              subscriptionId: backendType === 'subscription' ? subscriptionId : undefined,
            });
            
            if (verifyResponse.data.success) {
              setSuccessMessage('Payment completed successfully!');
              setShowSuccess(true);
              // Navigate based on payment type
              setTimeout(() => {
                if (backendType === 'subscription') {
                  navigate('/my-plans?activated=1', { state: { message: 'Subscription activated!' } });
                } else if (backendType === 'ticket') {
                  navigate('/tickets', { state: { message: 'Ticket booked successfully!' } });
                } else if (backendType === 'recharge') {
                  navigate('/cards', { state: { message: 'Card recharged successfully!' } });
                } else {
                  navigate('/dashboard', { state: { message: 'Payment completed!' } });
                }
              }, 2000);
            } else {
              throw new Error(verifyResponse.data.error || 'Payment verification failed');
            }
          } catch (verifyError) {
            console.error('Payment verification failed:', verifyError);
            setError('Payment verification failed. Please contact support.');
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      // Check if Razorpay is available
      if (typeof window.Razorpay === 'undefined') {
        // Fallback to simulation if Razorpay is not loaded
        console.log('Razorpay not available, simulating payment...');
        setTimeout(() => {
          setSuccessMessage('Payment processed successfully! (Simulated)');
          setShowSuccess(true);
          if (paymentInfo.type === 'subscription') {
            navigate('/my-plans', { state: { message: 'Subscription activated!' } });
          } else if (paymentInfo.type === 'ticket') {
            navigate('/tickets', { state: { message: 'Ticket booked successfully!' } });
          } else if (paymentInfo.type === 'card_recharge') {
            navigate('/cards', { state: { message: 'Card recharged successfully!' } });
          } else {
            navigate('/dashboard', { state: { message: 'Payment completed!' } });
          }
        }, 2000);
      } else {
        const razorpay = new window.Razorpay(options);
        razorpay.open();
      }

    } catch (error) {
      console.error('Payment error:', error);
      setError(error.response?.data?.error || error.message || 'Payment failed');
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
                        <strong>Amount:</strong> ₹{paymentInfo.amount || 100}
                      </div>
                      <div className="mb-3">
                        <strong>Description:</strong> {paymentInfo.description || 'Payment'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card">
                    <div className="card-header bg-light">
                      <h6>User Info</h6>
                    </div>
                    <div className="card-body">
                      <p><strong>User ID:</strong> {currentUser?.id ? '***' + currentUser.id.slice(-4) : currentUser?._id ? '***' + currentUser._id.slice(-4) : 'Not available'}</p>
                      <p><strong>Name:</strong> {currentUser?.name || 'Not available'}</p>
                      <p><strong>Email:</strong> {currentUser?.email || 'Not available'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="d-grid gap-3">
                  <button 
                    className="btn btn-primary btn-lg"
                    onClick={handlePayment}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Processing Payment...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-credit-card me-2"></i>
                        Pay ₹{paymentInfo.amount || 100}
                      </>
                    )}
                  </button>
                  
                  <button 
                    className="btn btn-success btn-lg"
                    onClick={() => {
                      const walletPaymentInfo = {
                        ...paymentInfo,
                        type: 'wallet_payment',
                        originalType: paymentInfo.type
                      };
                      handlePayment(walletPaymentInfo);
                    }}
                    disabled={loading}
                  >
                    <i className="fas fa-wallet me-2"></i>
                    Pay with Wallet
                  </button>
                  
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
