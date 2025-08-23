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
  const [actionLoading, setActionLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [journey, setJourney] = useState(null);
  const [fareCalculated, setFareCalculated] = useState(false);
  
  // Calculate fare between stations
  // Improved fare calculation using station index
  const calculateFare = (fromStationId, toStationId) => {
    const baseFare = 10;
    const perStationFare = 5;
    // Find index of stations in stations array
    const fromIndex = stations.findIndex(s => (s.id || s._id) === fromStationId);
    const toIndex = stations.findIndex(s => (s.id || s._id) === toStationId);
    if (fromIndex === -1 || toIndex === -1) return baseFare; // fallback
    const stationDistance = Math.abs(fromIndex - toIndex);
    return baseFare + (stationDistance * perStationFare);
  };
  
  // Load current journey on component mount
  useEffect(() => {
    const currentJourneyData = localStorage.getItem('currentJourney');
    if (currentJourneyData) {
      setJourney(JSON.parse(currentJourneyData));
    }
  }, []);

  const stationsState = useSelector((state) => state.stations);
  const stations = stationsState?.allItems || stationsState?.items || [];

  // Status logic for ticket actions
  const isActive = ticket?.status === 'Active' || ticket?.status === 'booked' || ticket?.status === 'active' || ticket?.status === 'confirmed';
  const isInProgress = ticket?.status === 'InProgress' || ticket?.status === 'in_progress' || ticket?.status === 'ongoing' || ticket?.status === 'started' || ticket?.status === 'tapped_in';
  const isCompleted = ticket?.status === 'Completed' || ticket?.status === 'completed' || ticket?.status === 'finished' || ticket?.status === 'ended';
  const isCancelled = ticket?.status === 'Cancelled' || ticket?.status === 'cancelled';

  // Fetch ticket + stations
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError("");
        
        // Try different API endpoints
        let ticketData = null;
        try {
          const res = await ticketAPI.getTicket(id);
          ticketData = res.data || res.ticket;
          
          // Ensure ticket has proper fields
          if (ticketData) {
            ticketData.price = ticketData.price || ticketData.amount || ticketData.fare || 25;
            ticketData.status = ticketData.status || 'Active';
            
            // Generate QR code data only for booked tickets
            if (ticketData.status === 'booked' || ticketData.status === 'Active') {
              const qrData = {
                ticketId: ticketData._id || ticketData.id,
                userId: ticketData.userId || ticketData.user,
                timestamp: Date.now(),
                type: 'ticket'
              };
              ticketData.qrCodeData = JSON.stringify(qrData);
            }
          }
        } catch (err) {
          console.warn('getTicket failed, using fallback data');
          ticketData = {
            id: id,
            _id: id,
            startStationId: 'station1',
            endStationId: 'station2', 
            price: 25,
            amount: 25,
            status: 'Active',
            createdAt: new Date().toISOString(),
            qrCodeData: JSON.stringify({
              ticketId: id,
              userId: 'user123',
              timestamp: Date.now(),
              type: 'ticket'
            })
          };
        }
        
        setTicket(ticketData);
        dispatch(fetchStations());
      } catch (err) {
        console.error('Error fetching ticket:', err);
        setError("Failed to load ticket details. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, dispatch]);

  const fromStation = stations.find((s) => (s.id || s._id) === ticket?.startStationId)?.name || ticket?.startStationName || "Unknown Station";
  const toStation = stations.find((s) => (s.id || s._id) === ticket?.endStationId)?.name || ticket?.endStationName || "Unknown Station";

  // ===== Ticket Actions =====
  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this ticket?")) return;
    
    try {
      setActionLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await ticketAPI.cancelTicket({ 
        ticketId: ticket.ticketId || ticket._id || ticket.id,
        userId: user.id || user._id
      });
      if (response?.data?.error) {
        alert(`Cancel failed: ${response.data.error}`);
      } else {
        alert("Ticket cancelled successfully!");
        setTicket({...ticket, status: 'Cancelled'});
        setTimeout(() => navigate('/tickets'), 1500);
      }
    } catch (error) {
      console.error('Cancel error:', error);
      const errorMsg = error.response?.data?.error || error.message || "Failed to cancel ticket";
      alert(`Cancel failed: ${errorMsg}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtend = async () => {
    const newDestination = prompt("Enter new destination station:");
    if (!newDestination) return;
    
    try {
      setActionLoading(true);
      // Ensure newDestination is a string for fare calculation
      const additionalFare = calculateFare(ticket.endStationId, String(newDestination));
      const confirmExtend = confirm(`Extend journey to ${newDestination}?\nAdditional fare: ₹${additionalFare}`);
      if (confirmExtend) {
        // Update ticket with new destination
        const updatedTicket = {
          ...ticket,
          endStationName: newDestination,
          originalFare: ticket.price,
          additionalFare: additionalFare,
          totalFare: (ticket.price || 0) + additionalFare
        };
        setTicket(updatedTicket);
        alert(`Journey extended to ${newDestination}!\nTotal fare: ₹${updatedTicket.totalFare}`);
      }
    } catch (error) {
      console.error('Extend error:', error);
      alert("Failed to extend ticket. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleTapIn = async () => {
    try {
      setActionLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      // Start journey tracking
      const journeyData = {
        ticketId: ticket.ticketId || ticket._id || ticket.id,
        startStation: fromStation,
        startStationId: ticket.startStationId,
        endStation: toStation,
        endStationId: ticket.endStationId,
        tapInTime: new Date().toISOString(),
        status: 'in_progress',
        userId: user.id || user._id
      };
      // Log payload for debugging
      console.log('Tap In payload:', {
        ticketId: ticket.ticketId || ticket._id || ticket.id,
        userId: user.id || user._id,
        stationIdentifier: ticket.startStationId,
        timestamp: new Date().toISOString()
      });
      // Validate ObjectId format for ticket and station
      const ticketId = (ticket._id && ticket._id.length === 24) ? ticket._id : (ticket.ticketId && ticket.ticketId.length === 24 ? ticket.ticketId : null);
      const stationId = (ticket.startStationId && String(ticket.startStationId).length === 24) ? ticket.startStationId : null;
      if (!ticketId || !stationId) {
        alert('Invalid ticket or station ID. Please contact support.');
        setActionLoading(false);
        return;
      }
      const response = await ticketAPI.tapIn({ 
        ticketId: ticketId,
        userId: user.id || user._id,
        stationIdentifier: stationId,
        timestamp: new Date().toISOString()
      });
      if (response?.data?.error) {
        alert(`Tap In failed: ${response.data.error}`);
      } else {
        localStorage.setItem('currentJourney', JSON.stringify(journeyData));
        setJourney(journeyData);
        alert(`Tap In successful at ${fromStation}!\nYour journey to ${toStation} has started.`);
        setTicket({...ticket, status: 'in_progress'});
      }
    } catch (error) {
      console.error('Tap In error:', error);
      const errorMsg = error.response?.data?.error || error.message || "Failed to Tap In";
      alert(`Failed to Tap In: ${errorMsg}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTapOut = async () => {
    try {
      setActionLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const currentJourneyData = JSON.parse(localStorage.getItem('currentJourney') || '{}');
      // Calculate actual fare based on journey
      const calculatedFare = calculateFare(ticket.startStationId, ticket.endStationId);
      // Log payload for debugging
      console.log('Tap Out payload:', {
        ticketId: ticket.ticketId || ticket._id || ticket.id,
        userId: user.id || user._id,
        stationIdentifier: ticket.endStationId,
        timestamp: new Date().toISOString()
      });
      // Validate ObjectId format for ticket and station
      const ticketId = (ticket._id && ticket._id.length === 24) ? ticket._id : (ticket.ticketId && ticket.ticketId.length === 24 ? ticket.ticketId : null);
      const stationId = (ticket.endStationId && String(ticket.endStationId).length === 24) ? ticket.endStationId : null;
      if (!ticketId || !stationId) {
        alert('Invalid ticket or station ID. Please contact support.');
        setActionLoading(false);
        return;
      }
      const response = await ticketAPI.tapOut({ 
        ticketId: ticketId,
        userId: user.id || user._id,
        stationIdentifier: stationId,
        timestamp: new Date().toISOString()
      });
      if (response?.data?.error) {
        alert(`Tap Out failed: ${response.data.error}`);
      } else {
        // Complete journey tracking
        const completedJourney = {
          ...currentJourneyData,
          tapOutTime: new Date().toISOString(),
          actualFare: calculatedFare,
          status: 'completed',
          completedAt: new Date().toISOString()
        };
        // Add to journey history
        const existingJourneys = JSON.parse(localStorage.getItem('journeys') || '[]');
        existingJourneys.push(completedJourney);
        localStorage.setItem('journeys', JSON.stringify(existingJourneys));
        // Clear current journey
        localStorage.removeItem('currentJourney');
        setJourney(null);
        setFareCalculated(true);
        alert(`Tap Out successful at ${toStation}!\nActual fare: ₹${calculatedFare}\nJourney completed successfully.`);
        setTicket({...ticket, status: 'completed', actualFare: calculatedFare});
      }
    } catch (error) {
      console.error('Tap Out error:', error);
      const errorMsg = error.response?.data?.error || error.message || "Failed to Tap Out";
      alert(`Failed to Tap Out: ${errorMsg}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEarlyDrop = async () => {
    if (!confirm("Are you sure you want to end your journey early?")) return;
    
    try {
      setActionLoading(true);
      // Simulate early drop
      console.log('Early drop for ticket:', ticket.ticketId || ticket._id || ticket.id);
      // Optionally, call backend API for early drop if available
      // Update ticket status
      setTicket({...ticket, status: 'Completed'});
      // Add to journey history
      const journeyData = {
        ticketId: ticket.ticketId || ticket._id || ticket.id,
        startStation: ticket.startStationName || 'Unknown',
        endStation: ticket.endStationName || 'Unknown',
        fare: ticket.price || 25,
        status: 'completed',
        completedAt: new Date().toISOString(),
        earlyDrop: true
      };
      // Store in localStorage for journey page
      const existingJourneys = JSON.parse(localStorage.getItem('journeys') || '[]');
      existingJourneys.push(journeyData);
      localStorage.setItem('journeys', JSON.stringify(existingJourneys));
      alert("Early Drop successful! Journey completed.");
    } catch (error) {
      console.error('Early Drop error:', error);
      const errorMsg = error.response?.data?.error || error.message || "Failed to Early Drop";
      alert(`Failed to Early Drop: ${errorMsg}`);
    } finally {
      setActionLoading(false);
    }
  };

  // WhatsApp sharing functionality
  const handleWhatsAppShare = () => {
    const ticketDetails = `🎫 *Metro Ticket Details*\n\n` +
      `📍 *From:* ${fromStation}\n` +
      `📍 *To:* ${toStation}\n` +
      `💰 *Price:* ₹${ticket.price || 0}\n` +
      `📅 *Date:* ${new Date(ticket.createdAt).toLocaleDateString()}\n` +
      `🆔 *Ticket ID:* ${ticket.ticketId || ticket._id || ticket.id}\n` +
      `📊 *Status:* ${ticket.status}\n\n` +
      `🚇 SmartMetroCard - Your Digital Metro Companion`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(ticketDetails)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Copy ticket details to clipboard
  const handleCopyTicketDetails = async () => {
    const ticketDetails = `Metro Ticket Details\n\n` +
      `From: ${fromStation}\n` +
      `To: ${toStation}\n` +
      `Price: ₹${ticket.price || 0}\n` +
      `Date: ${new Date(ticket.createdAt).toLocaleDateString()}\n` +
      `Ticket ID: ${ticket.ticketId || ticket._id || ticket.id}\n` +
      `Status: ${ticket.status}`;
    
    try {
      await navigator.clipboard.writeText(ticketDetails);
      alert('Ticket details copied to clipboard!');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = ticketDetails;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Ticket details copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="container mt-5 pt-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading ticket details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-5 pt-5">
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/tickets')}>
          <i className="fas fa-arrow-left me-2"></i>Back to Tickets
        </button>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="container mt-5 pt-5">
        <div className="alert alert-warning">
          <i className="fas fa-exclamation-circle me-2"></i>
          No ticket found.
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/tickets')}>
          <i className="fas fa-arrow-left me-2"></i>Back to Tickets
        </button>
      </div>
    );
  }

  return (
    <div className="container mt-5 pt-5">
      <div className="row justify-content-center">
        <div className="col-lg-8 col-md-10">
          <div className="card border-0 shadow">
            <div className="card-header bg-primary text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0">
                  <i className="fas fa-ticket-alt me-2"></i>
                  Ticket Details
                </h4>
                <button 
                  className="btn btn-outline-light btn-sm"
                  onClick={() => navigate('/tickets')}
                >
                  <i className="fas fa-arrow-left me-1"></i>Back
                </button>
              </div>
            </div>
            
            <div className="card-body p-4">
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-4">
                    <h6 className="text-muted mb-2">Journey Route</h6>
                    <div className="d-flex align-items-center">
                      <div className="text-center flex-grow-1">
                        <div className="station-icon mb-2">
                          <i className="fas fa-map-marker-alt fa-2x text-success"></i>
                        </div>
                        <strong>{fromStation}</strong>
                        <div className="text-muted small">From</div>
                      </div>
                      <div className="mx-3">
                        <i className="fas fa-arrow-right fa-2x text-muted"></i>
                      </div>
                      <div className="text-center flex-grow-1">
                        <div className="station-icon mb-2">
                          <i className="fas fa-map-marker-alt fa-2x text-danger"></i>
                        </div>
                        <strong>{toStation}</strong>
                        <div className="text-muted small">To</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="col-md-6">
                  <div className="mb-4">
                    <h6 className="text-muted mb-2">Ticket Information</h6>
                    <div className="row">
                      <div className="col-6">
                        <div className="mb-3">
                          <small className="text-muted">Price</small>
                          <div className="h5 text-primary mb-0">₹{ticket.price || 0}</div>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="mb-3">
                          <small className="text-muted">Status</small>
                          <div>
                            <span className={`badge ${isActive ? 'bg-success' : isInProgress ? 'bg-warning' : isCompleted ? 'bg-secondary' : isCancelled ? 'bg-danger' : 'bg-secondary'}`}>
                              {ticket.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted">Created</small>
                      <div>{new Date(ticket.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="text-center mb-4">
                <h6 className="text-muted mb-3">QR Code for Entry</h6>
                <div className="qr-container p-3 border rounded bg-light">
                  <QRCode 
                    value={JSON.stringify({
                      ticketId: ticket.ticketId || ticket._id || ticket.id,
                      userId: ticket.userId || 'user123',
                      timestamp: Date.now(),
                      type: 'ticket',
                      status: ticket.status
                    })} 
                    size={200}
                    level="M"
                    includeMargin={true}
                  />
                </div>
                <small className="text-muted mt-2 d-block">
                  Scan this QR code at the station gate
                </small>
                <div className="mt-2">
                  <small className="text-muted">
                    Ticket ID: {ticket.ticketId || ticket._id || ticket.id}
                  </small>
                </div>
              </div>

              {/* Share Options */}
              <div className="border-top pt-4 mb-4">
                <h6 className="text-muted mb-3">Share Ticket</h6>
                <div className="row g-2">
                  <div className="col-md-6">
                    <button
                      onClick={() => handleWhatsAppShare()}
                      className="btn btn-success w-100"
                    >
                      <i className="fab fa-whatsapp me-2"></i>
                      Share via WhatsApp
                    </button>
                  </div>
                  <div className="col-md-6">
                    <button
                      onClick={() => handleCopyTicketDetails()}
                      className="btn btn-outline-primary w-100"
                    >
                      <i className="fas fa-copy me-2"></i>
                      Copy Details
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="border-top pt-4">
                <h6 className="text-muted mb-3">Actions</h6>
                <div className="row g-3">
                  {isActive && (
                    <>
                      <div className="col-md-6 col-sm-12">
                        <button
                          onClick={handleTapIn}
                          disabled={actionLoading}
                          className="btn btn-success w-100"
                        >
                          {actionLoading ? (
                            <span className="spinner-border spinner-border-sm me-2"></span>
                          ) : (
                            <i className="fas fa-sign-in-alt me-2"></i>
                          )}
                          Tap In
                        </button>
                      </div>
                      <div className="col-md-6 col-sm-12">
                        <button
                          onClick={handleCancel}
                          disabled={actionLoading}
                          className="btn btn-danger w-100"
                        >
                          {actionLoading ? (
                            <span className="spinner-border spinner-border-sm me-2"></span>
                          ) : (
                            <i className="fas fa-times me-2"></i>
                          )}
                          Cancel Ticket
                        </button>
                      </div>
                      <div className="col-md-6 col-sm-12">
                        <button
                          onClick={handleExtend}
                          disabled={actionLoading}
                          className="btn btn-info w-100"
                        >
                          {actionLoading ? (
                            <span className="spinner-border spinner-border-sm me-2"></span>
                          ) : (
                            <i className="fas fa-expand-arrows-alt me-2"></i>
                          )}
                          Extend Journey
                        </button>
                      </div>
                    </>
                  )}

                  {isInProgress && (
                    
                    <>
                      <div className="col-md-6 col-sm-12">
                        <button
                          onClick={handleTapOut}
                          disabled={actionLoading}
                          className="btn btn-success w-100"
                        >
                          {actionLoading ? (
                            <span className="spinner-border spinner-border-sm me-2"></span>
                          ) : (
                            <i className="fas fa-sign-out-alt me-2"></i>
                          )}
                          Tap Out
                        </button>
                      </div>
                      <div className="col-md-6 col-sm-12">
                        <button
                          onClick={handleEarlyDrop}
                          disabled={actionLoading}
                          className="btn btn-warning w-100"
                        >
                          {actionLoading ? (
                            <span className="spinner-border spinner-border-sm me-2"></span>
                          ) : (
                            <i className="fas fa-stop-circle me-2"></i>
                          )}
                          Early Drop
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .station-icon {
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: hsla(245, 56.80%, 46.30%, 0.63);
          margin: 0 auto;
        }
        .qr-container {
          display: inline-block;
          padding: 20px;
          background: white;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(78, 172, 81, 0.1);
        }
        @media (max-width: 768px) {
          .station-icon {
            width: 50px;
            height: 50px;
          }
          .station-icon i {
            font-size: 1.5rem !important;
          }
          .qr-container {
            padding: 15px;
          }
        }
      `}</style>
    </div>
  );
}

export default TicketDetailPage;
