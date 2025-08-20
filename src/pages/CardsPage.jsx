import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { cardAPI, stationAPI } from '../api/api'
import { setJourney } from '../slices/dataSlice'

function CardsPage() {
  const dispatch = useDispatch()
  const { primaryCardBalance, cards } = useSelector(s => s.data)
  const [stations, setStations] = useState([])
  const [tapInStation, setTapInStation] = useState('')
  const [tapOutStation, setTapOutStation] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const { data } = await stationAPI.getAllStations()
        setStations(Array.isArray(data) ? data : data.items || [])
      } catch {}
    })()
  }, [])

  return (
    <div className="container mt-5 pt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="fas fa-credit-card me-2"></i>My Cards</h2>
        <button className="btn btn-primary">
          <i className="fas fa-plus me-2"></i>Recharge Card
        </button>
      </div>

      <div className="row mb-4">
        <div className="col-12">
          <h5>Primary Card</h5>
          <div className="col-md-6">
            <div className="metro-card">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h6>SmartMetroCard</h6>
                  <small>Primary Card</small>
                </div>
                <div className="card-chip"></div>
              </div>
              <div className="mb-3">
                <h4>₹<span>{primaryCardBalance.toFixed(2)}</span></h4>
                <small>Available Balance</small>
              </div>
              <div className="d-flex justify-content-between align-items-end">
                <div>
                  <div className="card-number">**** **** **** 1234</div>
                  <small>Card Number</small>
                </div>
                <div className="text-end">
                  <div>12/25</div>
                  <small>Exp Date</small>
                </div>
              </div>
              <div className="mt-3">
                <div className="row g-2 align-items-center">
                  <div className="col-md-5">
                    <select className="form-select form-select-sm" value={tapInStation} onChange={e=>setTapInStation(e.target.value)}>
                      <option value="">Select Tap-In Station</option>
                      {stations.map(st => (
                        <option key={st.id || st._id} value={st.id || st._id}>{st.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3 d-grid">
                    <button className="btn btn-light btn-sm" onClick={async () => {
                      if (!tapInStation) return
                      try {
                        const { data } = await cardAPI.tapIn('primary', { stationId: tapInStation, timestamp: new Date().toISOString() })
                        dispatch(setJourney(data?.journey || null))
                      } catch {}
                    }}>
                      <i className="fas fa-sign-in-alt me-1"></i>Tap In
                    </button>
                  </div>
                </div>
                <div className="row g-2 align-items-center mt-2">
                  <div className="col-md-5">
                    <select className="form-select form-select-sm" value={tapOutStation} onChange={e=>setTapOutStation(e.target.value)}>
                      <option value="">Select Tap-Out Station</option>
                      {stations.map(st => (
                        <option key={st.id || st._id} value={st.id || st._id}>{st.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3 d-grid">
                    <button className="btn btn-light btn-sm" onClick={async () => {
                      if (!tapOutStation) return
                      try {
                        const { data } = await cardAPI.tapOut('primary', { stationId: tapOutStation, timestamp: new Date().toISOString() })
                        dispatch(setJourney(data?.journey || null))
                      } catch {}
                    }}>
                      <i className="fas fa-sign-out-alt me-1"></i>Tap Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <h5>Secondary Cards</h5>
          <div className="row">
            {cards.filter(c => c.type === 'secondary').map(card => (
              <div className="col-md-4 mb-3" key={card.id}>
                <div className={`card ${card.status === 'inactive' ? 'text-muted' : ''}`}>
                  <div className="card-body">
                    <h6>{card.name}</h6>
                    <p>Balance: ₹{card.balance}</p>
                    <p>Status: <span className={`badge ${card.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>{card.status}</span></p>
                    {card.status === 'active' && (
                      <button className="btn btn-primary btn-sm">Use Card</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CardsPage

