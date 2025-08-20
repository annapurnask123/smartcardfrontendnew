import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { cardAPI, stationAPI, paymentAPI } from '../api/api'
import { openRazorpayCheckout } from '../utils/razorpay'
import { setJourney, setCards } from '../slices/dataSlice'

function CardsPage() {
  const dispatch = useDispatch()
  const { primaryCardBalance, cards } = useSelector(s => s.data)
  const user = useSelector(s => s.auth.user)
  const [stations, setStations] = useState([])
  const [tapInStation, setTapInStation] = useState(localStorage.getItem('tap_in_station') || '')
  const [tapOutStation, setTapOutStation] = useState(localStorage.getItem('tap_out_station') || '')

  useEffect(() => {
    (async () => {
      try {
        const { data } = await stationAPI.getAllStations()
        setStations(Array.isArray(data) ? data : data.items || [])
      } catch {}
      try {
        if (!user?.id && !user?._id) return
        const { data: userCards } = await cardAPI.getUserCards(user.id || user._id)
        dispatch(setCards(Array.isArray(userCards) ? userCards : userCards?.items || []))
      } catch {}
    })()
  }, [])

  useEffect(() => { localStorage.setItem('tap_in_station', tapInStation) }, [tapInStation])
  useEffect(() => { localStorage.setItem('tap_out_station', tapOutStation) }, [tapOutStation])

  async function createNewCard() {
    try {
      const { data } = await cardAPI.createCard({ userId: user.id || user._id })
      dispatch(setCards([...(cards||[]), data]))
    } catch {}
  }

  async function checkBalance(cardId) {
    try {
      const { data } = await cardAPI.getBalance(cardId)
      alert(`Balance: ₹${data.balance} | Journeys: ${data.journeyCount || 0}`)
    } catch {}
  }

  async function setPrimary(cardId) {
    try {
      await cardAPI.updateCard ? cardAPI.updateCard(cardId, { primary: true }) : Promise.resolve()
      const updated = (cards || []).map(c => ((c.id||c._id) === cardId) ? { ...c, type: 'primary' } : { ...c, type: (c.type==='primary'?'secondary':c.type) })
      dispatch(setCards(updated))
    } catch {}
  }

  return (
    <div className="container mt-5 pt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="fas fa-credit-card me-2"></i>My Cards</h2>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={() => checkBalance('primary')}>
            <i className="fas fa-wallet me-2"></i>Check Balance
          </button>
          <button className="btn btn-primary" onClick={createNewCard}>
            <i className="fas fa-plus me-2"></i>Get New Card
          </button>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-12">
          <h5>Primary Card</h5>
          <div className="col-md-6">
            <div className="credit-card">
              <div className="credit-row mb-3">
                <div className="d-flex align-items-center gap-2">
                  <div className="credit-chip"></div>
                  <div className="credit-brand">SMART METRO</div>
                </div>
                <i className="fas fa-wifi credit-nfc"></i>
              </div>
              <div className="credit-row mb-3">
                <div className="credit-number">**** **** **** 1234</div>
                <div className="text-end">
                  <div className="credit-label">VALID THRU</div>
                  <div>12/25</div>
                </div>
              </div>
              <div className="credit-row">
                <div>
                  <div className="credit-label">CARD HOLDER</div>
                  <div className="credit-name">Primary Card</div>
                </div>
                <div className="text-end">
                  <div className="credit-label">BALANCE</div>
                  <div className="fw-bold">₹{primaryCardBalance.toFixed(2)}</div>
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
                <div className="row g-2 align-items-center mt-2">
                  <div className="col-md-5">
                    <input type="number" min="1" className="form-control form-control-sm" placeholder="Recharge amount (₹)" id="recharge-amount" />
                  </div>
                  <div className="col-md-3 d-grid">
                    <button className="btn btn-outline-success btn-sm" onClick={async () => {
                      const input = document.getElementById('recharge-amount')
                      const amountRupees = Number(input?.value || 0)
                      if (!amountRupees) return
                      try {
                        const userId = user?.id || user?._id
                        const primary = (cards || []).find(c => c.type === 'primary' || c.isPrimary)
                        if (!primary) { alert('Primary card not found'); return }
                        // Backend expects amount in rupees for recharge
                        const { data: order } = await paymentAPI.createPaymentOrder({ amount: Math.round(amountRupees), currency: 'INR', purpose: 'recharge', type: 'recharge', id: (primary.id || primary._id), userId, paymentMethod: 'card' })
                        await openRazorpayCheckout({
                          key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_xxxxxxxxxxxxx',
                          amount: Math.round((order.amount || amountRupees) * 100),
                          name: 'SmartMetroCard',
                          description: 'Card Recharge',
                          orderId: order.order_id || order.id,
                          handler: async (response) => {
                            try {
                              await paymentAPI.verifyPayment({
                                razorpay_order_id: response.razorpay_order_id || order.order_id || order.id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                              })
                              // Refresh balance display
                              try {
                                const { data: bal } = await cardAPI.getBalance(primary.id || primary._id)
                                alert(`Recharge successful. New balance: ₹${bal.balance}`)
                              } catch {}
                            } catch (err) {
                              alert(err.response?.data?.error || 'Recharge verification failed')
                            }
                          },
                        })
                      } catch (e) { alert(e.response?.data?.error || 'Recharge failed') }
                    }}>
                      <i className="fas fa-bolt me-1"></i>Recharge
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
              <div className="col-md-4 mb-3" key={card.id || card._id}>
                <div className={`credit-card ${card.status === 'inactive' ? 'opacity-75' : ''}`}>
                  <div className="credit-row mb-3">
                    <div className="d-flex align-items-center gap-2">
                      <div className="credit-chip"></div>
                      <div className="credit-brand">SMART METRO</div>
                    </div>
                    <i className="fas fa-wifi credit-nfc"></i>
                  </div>
                  <div className="credit-row mb-2">
                    <div className="credit-number">**** **** **** {(card.last4 || '5678')}</div>
                    <div className="text-end">
                      <div className="credit-label">STATUS</div>
                      <span className={`badge ${card.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>{card.status}</span>
                    </div>
                  </div>
                  <div className="credit-row">
                    <div>
                      <div className="credit-label">CARD HOLDER</div>
                      <div className="credit-name">{card.name || 'Secondary Card'}</div>
                    </div>
                    <div className="text-end">
                      <div className="credit-label">BALANCE</div>
                      <div className="fw-bold">₹{Number(card.balance||0).toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="mt-3 d-flex gap-2">
                    <button className="btn btn-outline-secondary btn-sm" onClick={() => checkBalance(card.id || card._id)}>
                      <i className="fas fa-wallet me-1"></i>Balance
                    </button>
                    <button className="btn btn-outline-dark btn-sm" onClick={() => setPrimary(card.id || card._id)}>
                      Set Primary
                    </button>
                    <button className="btn btn-outline-primary btn-sm" disabled={card.status !== 'active'}>
                      Use Card
                    </button>
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

