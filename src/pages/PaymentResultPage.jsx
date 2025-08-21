import { useEffect, useState } from "react";

export default function PaymentResultPage() {
  const [result, setResult] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("lastPaymentResult");
    if (stored) {
      setResult(JSON.parse(stored));
    }
  }, []);

  if (!result) return <div className="container mt-5">No payment info found</div>;

  return (
    <div className="container mt-5 text-center">
      <div className={`alert ${result.success ? "alert-success" : "alert-danger"}`}>
        <h4>{result.success ? "Payment Successful!" : "Payment Failed!"}</h4>
        <p>{result.message}</p>
      </div>

      <div className="card p-3 mb-3">
        <p>Payment Type: {result.paymentInfo.type}</p>
        <p>Amount: ₹{result.paymentInfo.amount}</p>
        {result.paymentInfo.booking && (
          <>
            <p>From: {result.paymentInfo.booking.sourceName}</p>
            <p>To: {result.paymentInfo.booking.destinationName}</p>
            <p>Passengers: {result.paymentInfo.booking.passengerCount}</p>
            <p>Journey Type: {result.paymentInfo.booking.journeyType}</p>
          </>
        )}
      </div>
    </div>
  );
}
