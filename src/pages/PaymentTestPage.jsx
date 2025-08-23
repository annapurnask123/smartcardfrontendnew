import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

function PaymentTestPage() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [testType, setTestType] = useState('subscription');

  const testPayment = () => {
    const paymentInfo = {
      type: testType,
      id: 'test-id-123',
      amount: 100,
      description: `Test ${testType} payment`
    };

    console.log('Testing payment with:', paymentInfo);
    console.log('Current user:', user);

    navigate('/payment', {
      state: { paymentInfo }
    });
  };

  return (
    <div className="container mt-5 pt-5">
      <h2>Payment Test Page</h2>
      
      <div className="card">
        <div className="card-body">
          <h5>Current User Info:</h5>
          <pre>{JSON.stringify(user, null, 2)}</pre>
          
          <hr />
          
          <h5>Test Payment:</h5>
          <div className="mb-3">
            <label className="form-label">Payment Type:</label>
            <select 
              className="form-select" 
              value={testType} 
              onChange={(e) => setTestType(e.target.value)}
            >
              <option value="subscription">Subscription</option>
              <option value="ticket">Ticket</option>
              <option value="card_recharge">Card Recharge</option>
            </select>
          </div>
          
          <button 
            className="btn btn-primary"
            onClick={testPayment}
          >
            Test Payment
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentTestPage;
