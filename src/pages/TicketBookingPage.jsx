import { useSelector, useDispatch } from 'react-redux'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ticketAPI, walletAPI } from '../api/api'
import { fetchStations } from '../slices/stationSlice'
import { setSourceStation, setDestinationStation } from '../slices/ticketSlice'
import NearbyStationsFinder from '../components/NearbyStationsFinder'
import Swal from 'sweetalert2'

function useQuery() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

function TicketBookingPage() {
  const stationsState = useSelector(state => state.stations)
  const ticketsState = useSelector(state => state.tickets)
  const stations = stationsState?.allItems || stationsState?.items || []
  const user = useSelector(state => state.auth.user)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const query = useQuery()
  const location = useLocation()

  const [sourceId, setSourceId] = useState(location.state?.sourceId || query.get('sourceId') || '')
  const [destinationId, setDestinationId] = useState(location.state?.destinationId || '')
  const [selectedSchedule, setSelectedSchedule] = useState(location.state?.selectedSchedule || null)
  const [passengers, setPassengers] = useState(1)
  const [journeyType, setJourneyType] = useState('one-way')

  const [fareQuote, setFareQuote] = useState({ base: 0, total: 0 })
  const [backendTotalFare, setBackendTotalFare] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showNearbyStations, setShowNearbyStations] = useState(false)

  useEffect(() => {
    if (!stations || stations.length === 0) {
      dispatch(fetchStations())
    }
  }, [stations, dispatch])

  useEffect(() => {
    if (location.state?.sourceName || location.state?.destinationName) {
      // no-op for now, can be used to display preselected names
    }
  }, [location.state])

  // Update sourceId when sourceStation changes in Redux
  useEffect(() => {
    if (ticketsState.sourceStation && ticketsState.sourceStation._id) {
      setSourceId(ticketsState.sourceStation._id);
    }
  }, [ticketsState.sourceStation]);

  // Calculate fare when stations or details change
  useEffect(() => {
    const calculateFare = async () => {
      if (!sourceId || !destinationId || sourceId === destinationId) {
        setFareQuote({ base: 0, total: 0 });
        setBackendTotalFare(null);
        return;
      }

      try {
        // Get fare from backend
        const response = await ticketAPI.calculateFare({
          startStationId: sourceId,
          endStationId: destinationId,
          ticketType: journeyType,
          passengerCount: passengers,
        });

        if (response.data && response.data.amount) {
          setBackendTotalFare(response.data.amount);
          setFareQuote({ 
            base: response.data.baseFare || response.data.amount / passengers,
            total: response.data.amount 
          });
        }
      } catch (error) {
        console.error('Failed to calculate fare:', error);
        // Fallback to client-side calculation
        const base = 25;
        const total = journeyType === 'two-way' ? base * passengers * 1.8 : base * passengers;
        setFareQuote({ base, total });
        setBackendTotalFare(total);
      }
    };

    calculateFare();
  }, [sourceId, destinationId, passengers, journeyType]);

  const handleStationSelect = (station) => {
    // Set the selected station as source in Redux store
    dispatch(setSourceStation(station));
    setSourceId(station._id || station.id);
    
    // Close the nearby stations modal
    setShowNearbyStations(false);
  };

  const handleBookTicket = async () => {
    if (!sourceId || !destinationId) {
      setError('Please select both source and destination stations');
      return;
    }
    
    if (sourceId === destinationId) {
      setError('Source and destination stations cannot be the same');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Create multiple tickets for multiple passengers
      const tickets = [];
      
      for (let i = 0; i < passengers; i++) {
        const response = await ticketAPI.bookTicket({
          userId: user.id || user._id,
          trip_id: `trip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${i}`,
          startStationId: sourceId,
          endStationId: destinationId,
          ticketType: journeyType,
          passengerCount: 1, // Each ticket is for 1 passenger
          passengerNumber: i + 1, // Track which passenger this is
        });

        // Handle different response formats
        let ticket;
        if (response.data.ticket) {
          ticket = response.data.ticket;
        } else if (response.data.tickets && response.data.tickets.length > 0) {
          ticket = response.data.tickets[0];
        } else if (response.data) {
          ticket = response.data; // Assume the response is the ticket itself
        }
        
        if (!ticket || !(ticket.id || ticket._id)) {
          throw new Error(`Ticket creation failed for passenger ${i + 1}: No ticket id returned`);
        }
        
        tickets.push(ticket);
      }
      console.log("The booked tickets are ", tickets)

      // Calculate total amount
      const totalAmount = tickets.reduce((sum, ticket) => sum + (ticket.amount || 0), 0);
      
      // Get station names
      const sourceStation = stations.find(s => String(s._id || s.id || s.stop_id) === String(sourceId));
      const destinationStation = stations.find(s => String(s._id || s.id || s.stop_id) === String(destinationId));

      const sourceStationName = (stations.find(s => (s._id === sourceId) || (s.id === sourceId))?.name) || location.state?.sourceName
      const destinationStationName = (stations.find(s => (s._id === destinationId) || (s.id === destinationId))?.name) || location.state?.destinationName

      // For single passenger, use the ticket ID directly
      // For multiple passengers, use the first ticket ID (backend should handle the rest)
      const firstTicketId = tickets[0].id || tickets[0]._id;
      
      const paymentInfo = {
        type: "ticket",
        amount: totalAmount,
        id: firstTicketId,
        ticketIds: tickets.map(t => t.id || t._id),
        booking: {
          sourceId,
          destinationId,
          passengerCount: passengers,
          journeyType,
          sourceName: sourceStationName || sourceStation?.name || sourceStation?.title || "Unknown",
          destinationName: destinationStationName || destinationStation?.name || destinationStation?.title || "Unknown",
          tickets: tickets // Store all ticket data
        },
        selectedTrain: selectedSchedule ? {
          number: selectedSchedule.trainNumber || selectedSchedule.trainNo || selectedSchedule.number,
          from: sourceStationName,
          to: destinationStationName,
          legs: Array.isArray(selectedSchedule.stations)
            ? selectedSchedule.stations.map(s => s?.station?.name || s?.name || s?.stationName).filter(Boolean)
            : undefined
        } : undefined
      };

      // Store the tickets temporarily in localStorage for the payment page to access
      localStorage.setItem('pendingTickets', JSON.stringify(tickets));
      
      navigate('/payment', { state: { paymentInfo } });
    } catch (error) {
      console.error('Booking failed:', error);
      setError(error.response?.data?.error || error.message || 'Failed to book ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    handleBookTicket();
  };

  return (
    <div className="container mt-5 pt-5">
      <h3>Book Ticket</h3>
      {selectedSchedule && (
        <div className="alert alert-info">
          <div className="fw-bold">Selected Train: {selectedSchedule.trainNumber || selectedSchedule.trainName}</div>
          <div>From: {location.state?.sourceName} → To: {location.state?.destinationName}</div>
        </div>
      )}
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={submit}>
        <div className="mb-3">
          <label className="form-label">From Station</label>
          <div className="d-flex">
            <select className="form-select" value={sourceId} onChange={e => setSourceId(e.target.value)} required>
              <option value="">Select source station</option>
              {stations.map(st => (
                <option key={st._id || st.id} value={st._id || st.id}>
                  {st.name || st.title}
                </option>
              ))}
            </select>
            <button 
              type="button"
              className="btn btn-primary ms-2"
              onClick={() => setShowNearbyStations(true)}
              title="Find nearby stations"
            >
              <i className="fas fa-location-crosshairs"></i> Nearby
            </button>
          </div>
        </div>
        
        <div className="mb-3">
          <label className="form-label">To Station</label>
          <select className="form-select" value={destinationId} onChange={e => setDestinationId(e.target.value)} required>
            <option value="">Select destination station</option>
            {stations.map(st => (
              <option key={st._id || st.id} value={st._id || st.id}>
                {st.name || st.title}
              </option>
            ))}
          </select>
        </div>
        
        <div className="mb-3">
          <label className="form-label">Number of Passengers</label>
          <select className="form-select" value={passengers} onChange={e => setPassengers(parseInt(e.target.value))}>
            {Array.from({length: 10}, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>
                {n} Passenger{n > 1 ? 's' : ''}
              </option>
            ))}
          </select>
          <div className="form-text">
            Select number of passengers (1-10). Each passenger will get a separate QR code.
          </div>
        </div>
        
        <div className="mb-3">
          <label className="form-label">Journey Type</label>
          <select className="form-select" value={journeyType} onChange={e => setJourneyType(e.target.value)}>
            <option value="one-way">One Way</option>
            <option value="two-way">Two Way</option>
          </select>
        </div>
        
        <div className="mb-3 p-3 bg-light rounded">
          <h5>Fare Details</h5>
          <div className="d-flex justify-content-between">
            <span>Base Fare:</span>
            <span>₹{fareQuote.base}</span>
          </div>
          {passengers > 1 && (
            <div className="d-flex justify-content-between">
              <span>Passengers:</span>
              <span>{passengers} × ₹{fareQuote.base}</span>
            </div>
          )}
          {journeyType === 'two-way' && (
            <div className="d-flex justify-content-between">
              <span>Return Trip Discount:</span>
              <span className="text-success">-10%</span>
            </div>
          )}
          <hr />
          <div className="d-flex justify-content-between fw-bold">
            <span>Total Fare:</span>
            <span>₹{backendTotalFare ?? fareQuote.total}</span>
          </div>
        </div>
        
        <button className="btn btn-primary w-100 py-2" type="submit" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Booking...
            </>
          ) : (
            'Confirm Booking & Proceed to Payment'
          )}
        </button>
      </form>

      <NearbyStationsFinder 
        show={showNearbyStations} 
        onClose={() => setShowNearbyStations(false)}
        onStationSelect={handleStationSelect}
      />
    </div>
  )
}

export default TicketBookingPage