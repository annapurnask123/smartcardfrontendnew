import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import QRCode from "react-qr-code";

function MultiTicketPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [currentTicketIndex, setCurrentTicketIndex] = useState(0);

  useEffect(() => {
    // Get tickets from location state or localStorage
    const ticketsData = location.state?.tickets || JSON.parse(localStorage.getItem('multiTickets') || '[]');
    
    if (ticketsData.length > 0) {
      setTickets(ticketsData);
      localStorage.setItem('multiTickets', JSON.stringify(ticketsData));
    } else {
      // If no tickets, redirect to booking page
      navigate('/book-ticket');
    }
  }, [location, navigate]);

  const currentTicket = tickets[currentTicketIndex];

  const handleNextTicket = () => {
    if (currentTicketIndex < tickets.length - 1) {
      setCurrentTicketIndex(currentTicketIndex + 1);
    }
  };

  const handlePrevTicket = () => {
    if (currentTicketIndex > 0) {
      setCurrentTicketIndex(currentTicketIndex - 1);
    }
  };

  if (tickets.length === 0) {
    return (
      <div className="container mt-5 pt-5">
        <div className="alert alert-info">
          <i className="fas fa-info-circle me-2"></i>
          No tickets found. Please book tickets first.
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/book-ticket')}>
          <i className="fas fa-ticket-alt me-2"></i>
          Book Tickets
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
                  Ticket {currentTicketIndex + 1} of {tickets.length}
                </h4>
                <button 
                  className="btn btn-outline-light btn-sm"
                  onClick={() => navigate('/tickets')}
                >
                  <i className="fas fa-arrow-left me-1"></i>Back to All Tickets
                </button>
              </div>
            </div>
            
            <div className="card-body p-4">
              {/* Ticket navigation */}
              {tickets.length > 1 && (
                <div className="d-flex justify-content-between mb-4">
                  <button 
                    className="btn btn-outline-primary"
                    onClick={handlePrevTicket}
                    disabled={currentTicketIndex === 0}
                  >
                    <i className="fas fa-chevron-left me-1"></i>Previous
                  </button>
                  <span className="align-self-center">
                    Ticket {currentTicketIndex + 1} of {tickets.length}
                  </span>
                  <button 
                    className="btn btn-outline-primary"
                    onClick={handleNextTicket}
                    disabled={currentTicketIndex === tickets.length - 1}
                  >
                    Next <i className="fas fa-chevron-right ms-1"></i>
                  </button>
                </div>
              )}

              {/* Ticket details */}
              <div className="text-center mb-4">
                <h6 className="text-muted mb-3">QR Code for Entry</h6>
                <div className="qr-container p-3 border rounded bg-light">
                  <QRCode 
                    value={JSON.stringify({
                      ticketId: currentTicket.ticketId || currentTicket._id || currentTicket.id,
                      userId: currentTicket.userId || 'user123',
                      timestamp: Date.now(),
                      type: 'ticket',
                      status: currentTicket.status,
                      passenger: currentTicket.passengerNumber || 1
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
                    Ticket ID: {currentTicket.ticketId || currentTicket._id || currentTicket.id}
                  </small>
                </div>
                {currentTicket.passengerNumber && (
                  <div className="mt-1">
                    <small className="text-muted">
                      Passenger: {currentTicket.passengerNumber}
                    </small>
                  </div>
                )}
              </div>

              {/* Ticket information */}
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <strong>From:</strong> {currentTicket.startStationName || "Unknown Station"}
                  </div>
                  <div className="mb-3">
                    <strong>To:</strong> {currentTicket.endStationName || "Unknown Station"}
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <strong>Price:</strong> ₹{currentTicket.price || currentTicket.amount || 0}
                  </div>
                  <div className="mb-3">
                    <strong>Status:</strong> 
                    <span className={`badge ${currentTicket.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>
                      {currentTicket.status || 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions for individual ticket */}
              <div className="border-top pt-4">
                <h6 className="text-muted mb-3">Actions</h6>
                <div className="d-grid gap-2">
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigate(`/ticket/${currentTicket.ticketId || currentTicket._id || currentTicket.id}`)}
                  >
                    <i className="fas fa-external-link-alt me-2"></i>
                    View Full Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MultiTicketPage;