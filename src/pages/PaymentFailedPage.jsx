// src/pages/PaymentFailedPage.jsx
import { useLocation, useNavigate } from "react-router-dom";

export default function PaymentFailedPage() {
  const { state } = useLocation();
  const navigate = useNavigate();

  if (!state) return <div className="container mt-5">No payment data available</div>;

  const { paymentInfo, amount, method } = state;

  return (
    <div className="container mt-5 text-center">
      <div className="card p-4">
        <h2 className="text-danger">Payment Failed!</h2>
        <p>Amount: ₹{amount}</p>
        <p>Payment Type: {paymentInfo.type}</p>
        <p>Payment Method: {method}</p>
        <button className="btn btn-success mt-3" onClick={() => navigate(-1)}>
          Try Again
        </button>
        <button className="btn btn-secondary mt-3 ms-2" onClick={() => navigate("/")}>
          Cancel
        </button>
      </div>
    </div>
  );
}
