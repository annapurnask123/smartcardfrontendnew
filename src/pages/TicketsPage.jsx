import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchTickets } from '../slices/ticketSlice'
import { useNavigate } from 'react-router-dom'
import { fetchStations } from '../slices/stationSlice'
import { FaSpinner } from 'react-icons/fa';

function TicketsPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { tickets = [] } = useSelector(state => state.tickets)
  const user = useSelector(state => state.auth.user)
  const q = useSelector(state => state.ui.query)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)

  // station slice can be items | list | stations depending on how you set it up
  const stationState = useSelector(s => s.stations || {})
  const stations = stationState.items || stationState.list || stationState.stations || []
  console.log("THe stations received ",stations)
  // Build a quick lookup map: id -> name
  const stationById = useMemo(() => {
    const map = {}
    stations.forEach(s => {
      const key = s.id || s._id || s.code
      console.log(key)
      if (key) map[key] = s.name || s.title || s.displayName || key
      console.log("The map is ",map)
    })
    return map
  }, [stations])

  useEffect(() => {
    if (!user?.id && !user?._id) return
    setLoading(true)
    dispatch(fetchTickets()).finally(() => {
      setLoading(false)
    })
  }, [dispatch, user])

  useEffect(() => {
    // load stations once if empty
    if (!stations || stations.length === 0) {
      dispatch(fetchStations())
    }
  }, [dispatch, stations])

  console.log("The tickets received ",tickets)

  const filtered = tickets.filter(t => {
    console.log("The ticket is ",t)
    let fromName ;
    // const fromName = stationById[t.sourceId] || t.sourceName || t.source || t.sourceId || ''

    for (let i = 0; i < stations.length; i++) {
      if (stations[i].id === t.sourceId) {
        fromName = stations[i].name
        break
      }
    }
    

    console.log("The from name is ",fromName)
    const toName = stationById[t.destinationId] || t.destinationName || t.destination || t.destinationId || ''
    const text = `${fromName} ${toName}`.toLowerCase()
    return !q || text.includes(q.toLowerCase())
  })

  // Group tickets by status for sections: Booked, In Progress, Ended, Pending, Cancelled
  const grouped = useMemo(() => {
    const map = { booked: [], inprogress: [], ended: [], pending: [], cancelled: [] }
    tickets.forEach(t => {
      const status = (t.status || '').toLowerCase()
      if (status === 'active' || status === 'booked') map.booked.push(t)
      else if (status === 'inprogress' || status === 'in_progress' || status === 'ongoing' || status === 'started' || status === 'tapped_in') map.inprogress.push(t)
      else if (status === 'ended' || status === 'completed') map.ended.push(t)
      else if (status === 'pending') map.pending.push(t)
      else if (status === 'cancelled' || status === 'canceled') map.cancelled.push(t)
      else map.pending.push(t)
    })
    return map
  }, [tickets])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading your tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-5 pt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="fas fa-ticket-alt me-2"></i>Tickets</h2>
        <div className="input-group" style={{ maxWidth: 300 }}>
          <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Tickets</option>
            <option value="booked">Booked</option>
            <option value="inprogress">In Progress</option>
            <option value="ended">Completed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
      {['booked','inprogress','ended','pending','cancelled'].map(section => {
        const sectionTickets = grouped[section].filter(t => {
          const fromName = stationById[t.sourceId] || t.sourceName || t.source || t.sourceId || ''
          const toName = stationById[t.destinationId] || t.destinationName || t.destination || t.destinationId || ''
          const text = `${fromName} ${toName}`.toLowerCase()
          const matchesSearch = !q || text.includes((q||'').toLowerCase())
          const matchesFilter = !statusFilter || section === statusFilter
          return matchesSearch && matchesFilter
        })
        if (sectionTickets.length === 0) return null
        const title = section === 'inprogress' ? 'In Progress' : section.charAt(0).toUpperCase() + section.slice(1)
        return (
          <div className="mt-4" key={section}>
            <h5 className="mb-3">{title}</h5>
            <ul className="list-group">
              {sectionTickets.map(t => {
                const id = t.id || t._id

                // ✅ Always resolve station names
                const fromName = stationById[t.sourceId] || t.startStationName
                || t.source || t.sourceId || "Unknown"
                const toName = stationById[t.destinationId] || t.endStationName|| t.destination || t.destinationId || "Unknown"

                const isActive = (t.status || '').toLowerCase() === 'active' || (t.status||'').toLowerCase() === 'booked'
                const isInProgress = ['inprogress','in_progress','ongoing','started','tapped_in'].includes((t.status||'').toLowerCase())

                return (
                  <li key={id} className="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                      {/* ✅ Now always shows "From → To" */}
                      <div className="fw-bold">{fromName} → {toName}</div>
                      <small className="text-muted">{t.date || new Date(t.createdAt || Date.now()).toLocaleString()}</small>
                      {isInProgress && (
                        <div className="mt-1">
                          <span className="badge bg-warning text-dark">
                            <i className="fas fa-clock me-1"></i>Journey in Progress
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="d-flex align-items-center gap-3">
                      <span className={`badge bg-${isActive ? 'success' : isInProgress ? 'warning' : section === 'ended' ? 'dark' : section === 'cancelled' ? 'danger' : 'secondary'}`}>
                        {t.status}
                      </span>
                      <strong>₹{t.amount}</strong>
                      <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => navigate(`/tickets/${encodeURIComponent(id)}`)}
                        title="View ticket details"
                      >
                        <i className="fas fa-eye me-1"></i> View
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
