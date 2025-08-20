import { useSelector, useDispatch } from 'react-redux'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { stationAPI } from '../api/api'

function useQuery() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

function TicketBookingPage() {
  const stationsState = useSelector(state => state.stations)
  const stations = stationsState?.allItems || stationsState?.items || []
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const query = useQuery()

  const [sourceId, setSourceId] = useState(query.get('sourceId') || '')
  const [destinationId, setDestinationId] = useState('')
  const [passengers, setPassengers] = useState(1)
  const [journeyType, setJourneyType] = useState('single')

  const source = stations.find(s => (s.id || s._id || String(s.code)) === sourceId)
  const destination = stations.find(s => (s.id || s._id || String(s.code)) === destinationId)

  const [fareQuote, setFareQuote] = useState({ base: 0, total: 0 })
  const [routeInfo, setRouteInfo] = useState(null)

  useEffect(() => {
    // hydrate from localStorage
    try {
      const cached = JSON.parse(localStorage.getItem('booking_draft') || 'null')
      if (cached) {
        setSourceId(cached.sourceId || '')
        setDestinationId(cached.destinationId || '')
        setPassengers(cached.passengers || 1)
        setJourneyType(cached.journeyType || 'single')
      }
    } catch {}
  }, [])

  useEffect(() => {
    // persist booking draft
    const draft = { sourceId, destinationId, passengers, journeyType }
    localStorage.setItem('booking_draft', JSON.stringify(draft))
  }, [sourceId, destinationId, passengers, journeyType])

  useEffect(() => {
    async function quote() {
      if (!sourceId || !destinationId) return setFareQuote({ base: 0, total: 0 })
      try {
        // If backend exposes a route-with-timings, we can also use it to show indirect routes later
        const base = 25
        const total = journeyType === 'return' ? base * passengers * 1.8 : base * passengers
        setFareQuote({ base, total })
        // Load route with timings for indirect route suggestions
        try {
          const { data } = await stationAPI.getRouteWithTimings(sourceId, destinationId)
          setRouteInfo(data)
        } catch { setRouteInfo(null) }
      } catch {
        setFareQuote({ base: 0, total: 0 })
      }
    }
    quote()
  }, [sourceId, destinationId, passengers, journeyType])

  async function submit(e) {
    e.preventDefault()
    if (!destinationId) return
    // Create a tentative ticket via backend before payment, or pass booking to payment
    const booking = {
      sourceId,
      destinationId,
      sourceName: source?.name || 'Unknown',
      destinationName: destination?.name || 'Unknown',
      passengerCount: passengers,
      journeyType,
      total: `₹${Number.isFinite(fareQuote.total) ? fareQuote.total : 0}`,
    }
    navigate('/pay', { state: { booking } })
  }

  return (
    <div className="container mt-5 pt-5">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h5><i className="fas fa-ticket-alt me-2"></i>Book Ticket</h5>
            </div>
            <div className="card-body">
              <form onSubmit={submit}>
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">From Station</label>
                      <select className="form-select" value={sourceId} onChange={e=>setSourceId(e.target.value)}>
                        <option value="">Select source</option>
                        {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">To Station</label>
                      <select className="form-select" value={destinationId} onChange={e=>setDestinationId(e.target.value)}>
                        <option value="">Select destination</option>
                        {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Number of Passengers</label>
                      <select className="form-select" value={passengers} onChange={e=>setPassengers(parseInt(e.target.value))}>
                        {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Passenger{n>1?'s':''}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Journey Type</label>
                      <select className="form-select" value={journeyType} onChange={e=>setJourneyType(e.target.value)}>
                        <option value="single">Single Journey</option>
                        <option value="return">Return Journey</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="card bg-light">
                    <div className="card-body">
                      <h6>Fare Details</h6>
                      <div className="d-flex justify-content-between">
                        <span>Base Fare:</span>
                        <span>₹{fareQuote.base}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Total Amount:</span>
                        <strong>₹{Number.isFinite(fareQuote.total) ? fareQuote.total : 0}</strong>
                      </div>
                      {routeInfo && Array.isArray(routeInfo?.legs) && routeInfo.legs.length > 0 && (
                        <div className="mt-3">
                          <h6 className="mb-2"><i className="fas fa-random me-2"></i>Suggested Route</h6>
                          <ul className="list-group">
                            {routeInfo.legs.map((leg, idx) => (
                              <li key={idx} className="list-group-item">
                                <div className="d-flex justify-content-between">
                                  <div>
                                    <strong>{leg.from}</strong> → <strong>{leg.to}</strong>
                                  </div>
                                  <div className="text-end">
                                    <small className="text-muted">{(leg.trains||[]).map(t=>`${t.name||t.code} ${t.time?`(${t.time})`:''}`).join(', ')}</small>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <button type="submit" className="btn btn-success w-100">
                  <i className="fas fa-check me-2"></i>Confirm Booking
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TicketBookingPage

