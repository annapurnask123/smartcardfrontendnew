import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import QRCode from "react-qr-code";
import { ticketAPI } from "../api/api";
import { fetchStations } from "../slices/stationSlice";

function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const stations = useSelector((state) => state.stations.stations || []);

  // Fetch ticket + stations
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await ticketAPI.getTicketById(id);
        setTicket(res.data);
        dispatch(fetchStations());
      } catch (err) {
        setError("Failed to load ticket details.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, dispatch]);

  if (loading) return <p>Loading ticket details...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!ticket) return <p>No ticket found.</p>;

  const fromStation =
    stations.find((s) => s.id === ticket.fromStationId)?.name || "Unknown";
  const toStation =
    stations.find((s) => s.id === ticket.toStationId)?.name || "Unknown";

  // ===== Ticket Actions =====
  const handleCancel = async () => {
    try {
      await ticketAPI.cancelTicket(ticket._id);
      alert("Ticket cancelled successfully");
      navigate("/tickets");
    } catch {
      alert("Failed to cancel ticket.");
    }
  };

  const handleExtend = async () => {
    try {
      const res = await ticketAPI.extendJourney(ticket._id);
      const order = res.data.order;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY,
        amount: order.amount,
        currency: order.currency,
        name: "Metro Ticket Extension",
        order_id: order.id,
        handler: async function (response) {
          await ticketAPI.verifyExtension(ticket._id, response);
          alert("Journey extended successfully!");
          navigate(0);
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch {
      alert("Failed to extend journey.");
    }
  };

  const handleTapIn = async () => {
    try {
      await ticketAPI.tapIn(ticket._id);
      alert("Tap In successful!");
      navigate(0);
    } catch {
      alert("Failed to Tap In.");
    }
  };

  const handleTapOut = async () => {
    try {
      await ticketAPI.tapOut(ticket._id);
      alert("Tap Out successful!");
      navigate(0);
    } catch {
      alert("Failed to Tap Out.");
    }
  };

  const handleEarlyDrop = async () => {
    try {
      await ticketAPI.earlyDrop(ticket._id);
      alert("Early Drop successful!");
      navigate(0);
    } catch {
      alert("Failed to Early Drop.");
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white shadow-lg rounded-xl mt-6">
      <h2 className="text-2xl font-bold mb-4 text-center">Ticket Details</h2>

      <div className="space-y-2 text-gray-700">
        <p>
          <strong>From:</strong> {fromStation}
        </p>
        <p>
          <strong>To:</strong> {toStation}
        </p>
        <p>
          <strong>Price:</strong> ₹{ticket.price}
        </p>
        <p>
          <strong>Status:</strong>{" "}
          <span
            className={`px-2 py-1 rounded text-white ${
              ticket.status === "Active"
                ? "bg-green-500"
                : ticket.status === "Cancelled"
                ? "bg-red-500"
                : "bg-yellow-500"
            }`}
          >
            {ticket.status}
          </span>
        </p>
        <p>
          <strong>Created At:</strong>{" "}
          {new Date(ticket.createdAt).toLocaleString()}
        </p>
      </div>

      {/* QR Code */}
      {(ticket.status === "Active" || ticket.status === "InProgress") && (
        <div className="mt-6 flex justify-center">
          <QRCode value={ticket._id} size={180} />
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 space-y-3">
        {ticket.status === "Active" && (
          <>
            <button
              onClick={handleTapIn}
              className="w-full bg-blue-600 text-white py-2 rounded-lg"
            >
              Tap In
            </button>
            <button
              onClick={handleCancel}
              className="w-full bg-red-600 text-white py-2 rounded-lg"
            >
              Cancel Ticket
            </button>
            <button
              onClick={handleExtend}
              className="w-full bg-purple-600 text-white py-2 rounded-lg"
            >
              Extend Journey
            </button>
          </>
        )}

        {ticket.status === "InProgress" && (
          <>
            <button
              onClick={handleTapOut}
              className="w-full bg-green-600 text-white py-2 rounded-lg"
            >
              Tap Out
            </button>
            <button
              onClick={handleEarlyDrop}
              className="w-full bg-orange-500 text-white py-2 rounded-lg"
            >
              Early Drop
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default TicketDetailPage;
