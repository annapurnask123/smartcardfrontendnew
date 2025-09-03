// src/pages/PaymentSuccessPage.jsx
import { useLocation, useNavigate } from "react-router-dom";

export default function PaymentSuccessPage() {
  const { state } = useLocation();
  const navigate = useNavigate();

  if (!state) return <div className="container mt-5">No payment data available</div>;

  const { paymentInfo, amount, method } = state;

  return (
    <div className="container mt-5 text-center">
      <div className="card p-4">
        <h2 className="text-success">Payment Successful!</h2>
        <p>Amount: ₹{amount}</p>
        <p>Payment Type: {paymentInfo.type}</p>
        <p>Payment Method: {method}</p>
        {paymentInfo.booking && (
          <>
            <p>From: {paymentInfo.booking.sourceName}</p>
            <p>To: {paymentInfo.booking.destinationName}</p>
            <p>Passengers: {paymentInfo.booking.passengerCount}</p>
          </>
        )}
        <button className="btn btn-primary mt-3" onClick={() => navigate("/")}>
          Go Home
        </button>
      </div>
    </div>
  );
}
