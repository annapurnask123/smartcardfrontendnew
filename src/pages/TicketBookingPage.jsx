import { useSelector, useDispatch } from 'react-redux'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { addTicket } from '../slices/dataSlice'

function useQuery() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

function TicketBookingPage() {
  const stations = useSelector(state => state.data.stations)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const query = useQuery()

  const [sourceId, setSourceId] = useState(query.get('sourceId') || '')
  const [destinationId, setDestinationId] = useState('')
  const [passengers, setPassengers] = useState(1)
  const [journeyType, setJourneyType] = useState('single')

  const source = stations.find(s => s.id === sourceId)
  const destination = stations.find(s => s.id === destinationId)

  const distance = sourceId && destinationId ? Math.abs(parseInt(sourceId) - parseInt(destinationId)) : 0
  const farePerPerson = sourceId && destinationId ? (25 + distance * 5) : 0
  const total = journeyType === 'return' ? farePerPerson * passengers * 1.8 : farePerPerson * passengers

  function submit(e) {
    e.preventDefault()
    if (!destinationId) return
    const booking = {
      sourceId,
      destinationId,
      sourceName: source?.name || 'Unknown',
      destinationName: destination?.name || 'Unknown',
      passengerCount: passengers,
      journeyType,
      total: `₹${Number.isFinite(total) ? total : 0}`,
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
                        <span>₹{farePerPerson}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Total Amount:</span>
                        <strong>₹{Number.isFinite(total) ? total : 0}</strong>
                      </div>
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

