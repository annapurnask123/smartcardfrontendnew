import { useSelector, useDispatch } from 'react-redux'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ticketAPI } from '../api/api' // Your API client
import { fetchStations } from '../slices/stationSlice'

function useQuery() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

function TicketBookingPage() {
  const stationsState = useSelector(state => state.stations)
  const stations = stationsState?.allItems || stationsState?.items || []
  const user = useSelector(state => state.auth.user)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const query = useQuery()

  const [sourceId, setSourceId] = useState(query.get('sourceId') || '')
  const [destinationId, setDestinationId] = useState('')
  const [passengers, setPassengers] = useState(1)
  const [journeyType, setJourneyType] = useState('one-way')

  const [fareQuote, setFareQuote] = useState({ base: 0, total: 0 })
  const [backendTotalFare, setBackendTotalFare] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!stations || stations.length === 0) {
      dispatch(fetchStations())
    }
  }, [stations, dispatch])

  useEffect(() => {
    if (!sourceId || !destinationId) {
      setFareQuote({ base: 0, total: 0 })
      setBackendTotalFare(null)
      return
    }
    const base = 25
    const total = journeyType === 'two-way' ? base * passengers * 1.8 : base * passengers
    setFareQuote({ base, total })
  }, [sourceId, destinationId, passengers, journeyType])

  const handleBookTicket = async () => {
    if (!sourceId || !destinationId || sourceId === destinationId) {
      setError('Please select valid source and destination');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      const response = await ticketAPI.bookTicket({
        userId: user.id || user._id,
        trip_id: `trip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        startStationId: sourceId,
        endStationId: destinationId,
        ticketType: journeyType === 'single' ? 'one-way' : journeyType,
        passengerCount: passengers,
      });

      const ticket = response.data.ticket || (response.data.tickets && response.data.tickets[0]);

      if (!ticket || !(ticket.id || ticket._id)) {
        throw new Error("Ticket creation failed: No ticket id returned");
      }

      setBackendTotalFare(response.data.totalAmount || ticket.amount);

      const paymentInfo = {
        type: "ticket",
        amount: ticket.amount,
        id: ticket.id || ticket._id,   
        booking: {
          sourceId,
          destinationId,
          passengerCount: passengers,
          journeyType,
          sourceName: stations.find(s => s._id === sourceId)?.name || "Unknown",
          destinationName: stations.find(s => s._id === destinationId)?.name || "Unknown",
        },
      };

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
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={submit}>
        <div className="mb-3">
          <label>From Station</label>
          <select className="form-select" value={sourceId} onChange={e => setSourceId(e.target.value)} required>
            <option value="">Select source</option>
            {stations.map(st => (
              <option key={st._id || st.id} value={st._id || st.id}>
                {st.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label>To Station</label>
          <select className="form-select" value={destinationId} onChange={e => setDestinationId(e.target.value)} required>
            <option value="">Select destination</option>
            {stations.map(st => (
              <option key={st._id || st.id} value={st._id || st.id}>
                {st.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label>Passengers</label>
          <select className="form-select" value={passengers} onChange={e => setPassengers(parseInt(e.target.value))}>
            {[1, 2, 3, 4, 5].map(n => (
              <option key={n} value={n}>
                {n} Passenger{n > 1 ? 's' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label>Journey Type</label>
          <select className="form-select" value={journeyType} onChange={e => setJourneyType(e.target.value)}>
            <option value="one-way">One Way</option>
            <option value="two-way">Two Way</option>
          </select>
        </div>
        <div className="mb-3">
          <strong>Base Fare:</strong> ₹{fareQuote.base} <br />
          <strong>Total Fare:</strong> ₹{backendTotalFare ?? fareQuote.total}
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Booking...' : 'Confirm Booking'}
        </button>
      </form>
    </div>
  )
}

export default TicketBookingPage
