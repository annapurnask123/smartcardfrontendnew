import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setTickets } from '../slices/dataSlice'
import { ticketAPI } from '../api/api'
import { useNavigate } from 'react-router-dom'

function TicketsPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const tickets = useSelector(state => state.data.tickets)
  const user = useSelector(state => state.auth.user)

  useEffect(() => {
    (async () => {
      if (!user?.id) return
      try {
        const { data } = await ticketAPI.getUserTickets(user.id)
        dispatch(setTickets(Array.isArray(data) ? data : data?.data || []))
      } catch {}
    })()
  }, [dispatch, user])
  return (
    <div className="container mt-5 pt-5">
      <h2><i className="fas fa-ticket-alt me-2"></i>My Tickets</h2>
      <div className="row mt-3">
        {tickets.map(t => (
          <div key={t.id} className="col-md-6 mb-3">
            <div className="card">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 className="card-title">{t.id}</h6>
                    <p className="card-text"><strong>{t.source}</strong> → <strong>{t.destination}</strong><br /><small className="text-muted">{t.date}</small></p>
                  </div>
                  <span className={`badge bg-${t.status === 'active' ? 'success' : 'secondary'}`}>{t.status}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <strong>{t.amount}</strong>
                  <button className="btn btn-outline-primary btn-sm" onClick={() => navigate(`/tickets/${encodeURIComponent(t.id)}`)}>
                    <i className="fas fa-qrcode me-1"></i> View Ticket
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {tickets.length === 0 && <p className="text-muted">No tickets yet.</p>}
      </div>
    </div>
  )
}

export default TicketsPage

