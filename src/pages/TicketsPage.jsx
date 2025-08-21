import { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setTickets } from '../slices/dataSlice'
import { ticketAPI } from '../api/api'
import { useNavigate } from 'react-router-dom'
import { fetchStations } from '../slices/stationSlice'

function TicketsPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const tickets = useSelector(state => state.data.tickets)
  const user = useSelector(state => state.auth.user)
  const q = useSelector(state => state.ui.query)

  // station slice can be items | list | stations depending on how you set it up
  const stationState = useSelector(s => s.station || {})
  const stations = stationState.items || stationState.list || stationState.stations || []

  // Build a quick lookup map: id -> name
  const stationById = useMemo(() => {
    const map = {}
    stations.forEach(s => {
      const key = s.id || s._id || s.code
      if (key) map[key] = s.name || s.title || s.displayName || key
    })
    return map
  }, [stations])

  useEffect(() => {
    if (!user?.id) return
    ;(async () => {
      try {
        const { data } = await ticketAPI.getUserTickets(user.id)
        dispatch(setTickets(Array.isArray(data) ? data : data?.data || []))
      } catch {}
    })()
  }, [dispatch, user])

  useEffect(() => {
    // load stations once if empty
    if (!stations || stations.length === 0) {
      dispatch(fetchStations())
    }
  }, [dispatch, stations])

  const filtered = tickets.filter(t => {
    const fromName = t.sourceName || stationById[t.sourceId] || t.source || t.sourceId || ''
    const toName = t.destinationName || stationById[t.destinationId] || t.destination || t.destinationId || ''
    const text = `${fromName} ${toName}`.toLowerCase()
    return !q || text.includes(q.toLowerCase())
  })

  return (
    <div className="container mt-5 pt-5">
      <h2><i className="fas fa-ticket-alt me-2"></i>My Tickets</h2>
      <ul className="list-group mt-3">
        {filtered.map(t => {
          const fromName = t.sourceName || stationById[t.sourceId] || t.source || t.sourceId
          const toName = t.destinationName || stationById[t.destinationId] || t.destination || t.destinationId
          const isActive = t.status === 'active'
          const isCompleted = t.status === 'completed'
          return (
            <li key={t.id} className="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <div className="fw-bold">{fromName} → {toName}</div>
                <small className="text-muted">{t.date}</small>
              </div>
              <div className="d-flex align-items-center gap-3">
                <span className={`badge bg-${isActive ? 'success' : isCompleted ? 'dark' : 'secondary'}`}>
                  {isCompleted ? 'Journey Ended' : t.status}
                </span>
                <strong>₹{t.amount}</strong>
                <button
                  className="btn btn-outline-primary btn-sm"
                  disabled={!isActive}                              // only active tickets can open QR
                  onClick={() => navigate(`/tickets/${encodeURIComponent(t.id)}`)}
                  title={isActive ? 'Open QR' : 'QR available only for active tickets'}
                >
                  <i className="fas fa-qrcode me-1"></i> View
                </button>
              </div>
            </li>
          )
        })}
        {tickets.length === 0 && <li className="list-group-item text-muted">No tickets yet.</li>}
      </ul>
    </div>
  )
}

export default TicketsPage
