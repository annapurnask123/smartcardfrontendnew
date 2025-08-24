import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cardAPI } from '../api/api';

function RechargeByCardNumber({ show, onClose }) {
  const navigate = useNavigate();
  const [cardNumber, setCardNumber] = useState('');
  const [amount, setAmount] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRecharge = async () => {
    if (!cardNumber.trim()) {
      setError('Please enter a card number');
      return;
    }
    if (amount < 10) {
      setError('Minimum recharge amount is ₹10');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // First validate the card exists before proceeding to payment
      const cleanCardNumber = cardNumber.trim().toUpperCase();
      
      // Check card format
      if (!cleanCardNumber.startsWith('VM-')) {
        setError('Invalid card number format. Card number should start with "VM-"');
        setLoading(false);
        return;
      }

      // Validate card exists by checking with backend
      try {
        const response = await cardAPI.getCardByNumber(cleanCardNumber);
        if (!response.data) {
          setError(`Card not found: ${cleanCardNumber}. Please check the card number.`);
          setLoading(false);
          return;
        }
      } catch (cardError) {
        if (cardError.response?.status === 404) {
          setError(`Card not found: ${cleanCardNumber}. Please check the card number.`);
        } else {
          setError('Unable to validate card. Please try again.');
        }
        setLoading(false);
        return;
      }

      // Navigate to payment page with recharge details
      navigate('/payment', {
        state: {
          paymentInfo: {
            type: 'recharge',
            id: cleanCardNumber,
            amount: amount,
            description: `Card Recharge - ${cleanCardNumber} - ₹${amount}`
          }
        }
      });
      onClose();
    } catch (err) {
      console.error('Recharge failed:', err);
      setError(err.response?.data?.error || 'Failed to initiate recharge');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="fas fa-credit-card text-primary me-2"></i>
              Recharge Any Card
            </h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onClose}
            ></button>
          </div>
          <div className="modal-body">
            {error && (
              <div className="alert alert-danger">
                <i className="fas fa-exclamation-triangle me-2"></i>
                {error}
              </div>
            )}
            
            <div className="mb-3">
              <label className="form-label">Card Number</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter card number (e.g., VM-ABC123DEF)"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                disabled={loading}
              />
              <div className="form-text">
                Enter the complete card number including the VM- prefix
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Recharge Amount (₹)</label>
              <input
                type="number"
                className="form-control form-control-lg"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                min="10"
                step="10"
                disabled={loading}
              />
            </div>

            <div className="alert alert-info">
              <i className="fas fa-info-circle me-2"></i>
              You can recharge any card by entering its card number. Minimum amount is ₹10.
            </div>

            <div className="row">
              <div className="col-6">
                <button 
                  className="btn btn-outline-secondary w-100" 
                  onClick={() => setAmount(50)}
                  disabled={loading}
                >
                  ₹50
                </button>
              </div>
              <div className="col-6">
                <button 
                  className="btn btn-outline-secondary w-100" 
                  onClick={() => setAmount(100)}
                  disabled={loading}
                >
                  ₹100
                </button>
              </div>
            </div>
            <div className="row mt-2">
              <div className="col-6">
                <button 
                  className="btn btn-outline-secondary w-100" 
                  onClick={() => setAmount(200)}
                  disabled={loading}
                >
                  ₹200
                </button>
              </div>
              <div className="col-6">
                <button 
                  className="btn btn-outline-secondary w-100" 
                  onClick={() => setAmount(500)}
                  disabled={loading}
                >
                  ₹500
                </button>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleRecharge}
              disabled={loading || !cardNumber.trim() || amount < 10}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Processing...
                </>
              ) : (
                <>
                  <i className="fas fa-credit-card me-2"></i>
                  Proceed to Payment
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RechargeByCardNumber;
