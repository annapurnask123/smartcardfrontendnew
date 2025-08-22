import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchTickets } from '../slices/ticketSlice'
import { useNavigate } from 'react-router-dom'
import { fetchStations } from '../slices/stationSlice'

function TicketsPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { tickets = [] } = useSelector(state => state.tickets)
  const user = useSelector(state => state.auth.user)
  const q = useSelector(state => state.ui.query)
  const [statusFilter, setStatusFilter] = useState('')

  // station slice can be items | list | stations depending on how you set it up
  const stationState = useSelector(s => s.stations || {})
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
    if (!user?.id && !user?._id) return
    dispatch(fetchTickets())
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

  // Group tickets by status for sections: Active, Ended, Pending, Cancelled
  const grouped = useMemo(() => {
    const map = { active: [], ended: [], pending: [], cancelled: [] }
    tickets.forEach(t => {
      const status = (t.status || '').toLowerCase()
      if (status === 'active' || status === 'inprogress') map.active.push(t)
      else if (status === 'ended' || status === 'completed') map.ended.push(t)
      else if (status === 'pending') map.pending.push(t)
      else if (status === 'cancelled' || status === 'canceled') map.cancelled.push(t)
      else map.pending.push(t)
    })
    return map
  }, [tickets])

  return (
    <div className="container mt-5 pt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="fas fa-ticket-alt me-2"></i>Tickets</h2>
        <div className="input-group" style={{ maxWidth: 300 }}>
          <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Tickets</option>
            <option value="active">Active</option>
            <option value="ended">Completed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
      {['active','ended','pending','cancelled'].map(section => {
        const sectionTickets = grouped[section].filter(t => {
          const fromName = t.sourceName || stationById[t.sourceId] || t.source || t.sourceId || ''
          const toName = t.destinationName || stationById[t.destinationId] || t.destination || t.destinationId || ''
          const text = `${fromName} ${toName}`.toLowerCase()
          const matchesSearch = !q || text.includes((q||'').toLowerCase())
          const matchesFilter = !statusFilter || section === statusFilter
          return matchesSearch && matchesFilter
        })
        if (sectionTickets.length === 0) return null
        const title = section.charAt(0).toUpperCase() + section.slice(1)
        return (
          <div className="mt-4" key={section}>
            <h5 className="mb-3">{title}</h5>
            <ul className="list-group">
              {sectionTickets.map(t => {
                const id = t.id || t._id
                const fromName = t.sourceName || stationById[t.sourceId] || t.source || t.sourceId
                const toName = t.destinationName || stationById[t.destinationId] || t.destination || t.destinationId
                const isActive = (t.status || '').toLowerCase() === 'active' || (t.status||'').toLowerCase() === 'inprogress'
                return (
                  <li key={id} className="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-bold">{fromName} → {toName}</div>
                      <small className="text-muted">{t.date || new Date(t.createdAt || Date.now()).toLocaleString()}</small>
                    </div>
                    <div className="d-flex align-items-center gap-3">
                      <span className={`badge bg-${isActive ? 'success' : section === 'ended' ? 'dark' : section === 'cancelled' ? 'danger' : 'secondary'}`}>
                        {t.status}
                      </span>
                      <strong>₹{t.amount}</strong>
                      <button
                        className="btn btn-outline-primary btn-sm"
                        disabled={!isActive}
                        onClick={() => navigate(`/tickets/${encodeURIComponent(id)}`)}
                        title={isActive ? 'Open QR' : 'QR available only for active tickets'}
                      >
                        <i className="fas fa-qrcode me-1"></i> View
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
      {tickets.length === 0 && <div className="text-muted mt-3">No tickets yet.</div>}
    </div>
  )
}

export default TicketsPage
