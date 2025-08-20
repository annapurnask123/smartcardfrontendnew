import { useEffect, useMemo, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { stationAPI, subscriptionPlanAPI, ticketAPI, userAPI, transactionAPI } from '../api/api'

function useQuery() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

function matches(text, q) {
  if (!q) return true
  const hay = (text || '').toString().toLowerCase()
  return hay.includes(q.toLowerCase())
}

function SearchPage() {
  const params = useQuery()
  const q = params.get('q') || params.get('search') || ''
  const user = useSelector(s => s.auth.user)

  const [stations, setStations] = useState([])
  const [plans, setPlans] = useState([])
  const [tickets, setTickets] = useState([])
  const [journeys, setJourneys] = useState([])
  const [transactions, setTx] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const [stRes, plRes] = await Promise.all([
          stationAPI.getAllStations().catch(() => ({ data: [] })),
          subscriptionPlanAPI.getAll().catch(() => ({ data: [] })),
        ])
        setStations(Array.isArray(stRes.data) ? stRes.data : stRes.data?.items || [])
        setPlans(Array.isArray(plRes.data) ? plRes.data : plRes.data?.items || [])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    (async () => {
      if (!user?.id && !user?._id) return
      try {
        const [tRes, jRes, xRes] = await Promise.all([
          ticketAPI.getUserTickets(user.id || user._id).catch(() => ({ data: [] })),
          userAPI.getUserJourneys().catch(() => ({ data: [] })),
          transactionAPI.getUserTransactions(user.id || user._id).catch(() => ({ data: [] })),
        ])
        setTickets(Array.isArray(tRes.data) ? tRes.data : tRes.data?.items || [])
        setJourneys(Array.isArray(jRes.data) ? jRes.data : jRes.data?.items || [])
        setTx(Array.isArray(xRes.data) ? xRes.data : xRes.data?.items || [])
      } catch {}
    })()
  }, [user])

  const filtered = {
    stations: stations.filter(s => matches(s.name || s.code, q)),
    plans: plans.filter(p => matches(p.name, q)),
    tickets: tickets.filter(t => matches(t.id, q) || matches(t.source, q) || matches(t.destination, q)),
    journeys: journeys.filter(j => matches(j.sourceName || j.source, q) || matches(j.destinationName || j.destination, q)),
    transactions: transactions.filter(tx => matches(tx.description, q) || matches(tx.id, q)),
  }

  return (
    <div className="container mt-5 pt-5">
      <h2 className="mb-4"><i className="fas fa-search me-2"></i>Search results for "{q}"</h2>

      <Section title={`Stations (${filtered.stations.length})`} icon="fa-train">
        <div className="row">
          {filtered.stations.slice(0, 12).map(s => (
            <div className="col-md-4 mb-3" key={s.id || s._id}>
              <div className="card">
                <div className="card-body d-flex justify-content-between align-items-center">
                  <span>{s.name}</span>
                  <Link to={`/book?sourceId=${encodeURIComponent(s.id || s._id || s.code)}`} className="btn btn-sm btn-primary">Book</Link>
                </div>
              </div>
            </div>
          ))}
          {filtered.stations.length === 0 && <p className="text-muted">No stations match.</p>}
        </div>
      </Section>

      <Section title={`Subscription Plans (${filtered.plans.length})`} icon="fa-crown">
        <div className="row">
          {filtered.plans.slice(0, 12).map(p => (
            <div className="col-md-4 mb-3" key={p.id || p._id}>
              <div className="card h-100">
                <div className="card-body d-flex justify-content-between align-items-center">
                  <span>{p.name}</span>
                  <Link to="/plans" className="btn btn-sm btn-outline-primary">View</Link>
                </div>
              </div>
            </div>
          ))}
          {filtered.plans.length === 0 && <p className="text-muted">No plans match.</p>}
        </div>
      </Section>

      <Section title={`Tickets (${filtered.tickets.length})`} icon="fa-ticket-alt">
        <div className="row">
          {filtered.tickets.slice(0, 12).map(t => (
            <div className="col-md-6 mb-3" key={t.id || t._id}>
              <div className="card">
                <div className="card-body d-flex justify-content-between align-items-center">
                  <span>{t.id} — {t.source} → {t.destination}</span>
                  <Link to={`/tickets/${encodeURIComponent(t.id || t._id)}`} className="btn btn-sm btn-outline-primary">Open</Link>
                </div>
              </div>
            </div>
          ))}
          {filtered.tickets.length === 0 && <p className="text-muted">No tickets match.</p>}
        </div>
      </Section>

      <Section title={`Journeys (${filtered.journeys.length})`} icon="fa-route">
        <div className="row">
          {filtered.journeys.slice(0, 12).map((j, idx) => (
            <div className="col-md-6 mb-3" key={j.id || j._id || idx}>
              <div className="card">
                <div className="card-body d-flex justify-content-between align-items-center">
                  <span>{(j.sourceName||j.source)} → {(j.destinationName||j.destination)}</span>
                </div>
              </div>
            </div>
          ))}
          {filtered.journeys.length === 0 && <p className="text-muted">No journeys match.</p>}
        </div>
      </Section>

      <Section title={`Transactions (${filtered.transactions.length})`} icon="fa-exchange-alt">
        <div className="row">
          {filtered.transactions.slice(0, 12).map(tx => (
            <div className="col-md-6 mb-3" key={tx.id || tx._id}>
              <div className="card">
                <div className="card-body d-flex justify-content-between align-items-center">
                  <span>{tx.id} — {tx.description} — ₹{tx.amount}</span>
                </div>
              </div>
            </div>
          ))}
          {filtered.transactions.length === 0 && <p className="text-muted">No transactions match.</p>}
        </div>
      </Section>
    </div>
  )
}

function Section({ title, icon, children }) {
  return (
    <div className="mb-4">
      <div className="d-flex align-items-center mb-2">
        <i className={`fas ${icon} me-2`}></i>
        <h5 className="mb-0">{title}</h5>
      </div>
      {children}
    </div>
  )
}

export default SearchPage

