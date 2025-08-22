import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useLocation } from 'react-router-dom'
import { cardAPI, stationAPI } from '../api/api'
import { fetchUserCard, createVirtualCard, setCards } from '../slices/cardSlice'
import RechargeByCardNumber from '../components/RechargeByCardNumber'

function CardsPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { cards, loading, error } = useSelector(s => s.card)
  const user = useSelector(s => s.auth.user)
  const [stations, setStations] = useState([])
  const [tapInStation, setTapInStation] = useState(localStorage.getItem('tap_in_station') || '')
  const [tapOutStation, setTapOutStation] = useState(localStorage.getItem('tap_out_station') || '')
  const [showRechargeModal, setShowRechargeModal] = useState(false)
  const [showRechargeByNumberModal, setShowRechargeByNumberModal] = useState(false)
  const [rechargeAmount, setRechargeAmount] = useState(100)
  const [message, setMessage] = useState(location.state?.message || '')
  const [messageType, setMessageType] = useState(location.state?.type || '')

  useEffect(() => {
    (async () => {
      try {
        const { data } = await stationAPI.getAllStations()
        setStations(Array.isArray(data) ? data : data.items || [])
      } catch (error) {
        console.error('Failed to fetch stations:', error)
      }
      try {
        if (!user?.id && !user?._id) return
        dispatch(fetchUserCard(user.id || user._id))
      } catch (error) {
        console.error('Failed to fetch user cards:', error)
      }
    })()
  }, [dispatch, user])

  useEffect(() => { localStorage.setItem('tap_in_station', tapInStation) }, [tapInStation])
  useEffect(() => { localStorage.setItem('tap_out_station', tapOutStation) }, [tapOutStation])

  async function createNewCard() {
    try {
      await dispatch(createVirtualCard(user.id || user._id)).unwrap()
      setMessage('Card created successfully!')
      setMessageType('success')
    } catch (error) {
      console.error('Failed to create card:', error)
      const errorMsg = error?.response?.data?.error || error?.message || 'Failed to create card'
      if (errorMsg.includes('subscription') || errorMsg.includes('only 1 card allowed')) {
        setMessage('You need an active subscription to create more cards. Only 1 card allowed without subscription.')
        setMessageType('warning')
      } else {
        setMessage(errorMsg)
        setMessageType('error')
      }
    }
  }

  async function checkBalance(cardId) {
    try {
      const response = await cardAPI.checkBalance(cardId)
      const balance = response.data?.balance || response.data || 0
      
      // Create a temporary display element
      const balanceDisplay = document.createElement('div')
      balanceDisplay.innerHTML = `
        <div class="alert alert-success alert-dismissible fade show" role="alert">
          <i class="fas fa-wallet me-2"></i>
          <strong>Card Balance: ₹${Number(balance).toFixed(2)}</strong>
          <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
      `
      
      // Remove any existing balance display
      const existingDisplay = document.querySelector('.balance-display')
      if (existingDisplay) existingDisplay.remove()
      
      balanceDisplay.className = 'balance-display'
      const container = document.querySelector('.container')
      const firstRow = document.querySelector('.row')
      if (container && firstRow) {
        container.insertBefore(balanceDisplay, firstRow)
      }
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (balanceDisplay.parentNode) {
          balanceDisplay.remove()
        }
      }, 5000)
    } catch (error) {
      console.error('Failed to check balance:', error)
      const errorMsg = error.response?.data?.error || error.message || 'Failed to check balance'
      alert(`Balance check failed: ${errorMsg}`)
    }
  }

  async function setPrimary(cardId) {
    try {
      // Backend doesn't have update endpoint, so we'll handle this locally for now
      const updated = (cards || []).map(c => ((c.id||c._id) === cardId) ? { ...c, type: 'primary', isPrimary: true } : { ...c, type: (c.type==='primary'?'secondary':c.type), isPrimary: false })
      dispatch(setCards(updated))
      alert('Primary card updated locally. Note: This change is not persisted to backend.')
    } catch (error) {
      console.error('Failed to set primary card:', error)
      alert('Failed to set primary card. Please try again.')
    }
  }

  function handleRecharge(cardId, cardNumber) {
    const paymentInfo = {
      type: 'card_recharge',
      cardId: cardId,
      id: cardId,
      amount: 100,
      description: `Card Recharge - ${cardNumber} - ₹100`
    };
    
    navigate('/payment', {
      state: { paymentInfo }
    });
  }

  const primaryCard = cards?.find(c => c.isPrimary || c.type === 'primary') || cards?.[0]
  const secondaryCards = cards?.filter(c => !c.isPrimary && c.type !== 'primary') || []

  return (
    <div className="container mt-5 pt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="fas fa-credit-card me-2"></i>My Cards</h2>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={() => checkBalance('primary')}>
            <i className="fas fa-wallet me-2"></i>Check Balance
          </button>
          <button 
            className="btn btn-outline-success" 
            onClick={() => setShowRechargeModal(true)}
            disabled={!primaryCard}
          >
            <i className="fas fa-plus me-2"></i>Recharge Card
          </button>
          <button 
            className="btn btn-outline-info" 
            onClick={() => setShowRechargeByNumberModal(true)}
          >
            <i className="fas fa-credit-card me-2"></i>Recharge Any Card
          </button>
          <button className="btn btn-primary" onClick={createNewCard} disabled={loading}>
            <i className="fas fa-plus me-2"></i>Get New Card
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {message && (
        <div className={`alert alert-${messageType === 'error' ? 'danger' : 'success'}`}>
          {message}
          <button 
            type="button" 
            className="btn-close float-end" 
            onClick={() => setMessage('')}
          ></button>
        </div>
      )}

      <div className="row mb-4">
        <div className="col-12">
          <h5>Primary Card</h5>
          <div className="col-md-6">
            {primaryCard ? (
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
                    <div className="fw-bold">₹{Number(primaryCard.balance||0).toFixed(2)}</div>
                    <button 
                      className="btn btn-sm btn-outline-light mt-2" 
                      onClick={() => setShowRechargeModal(true)}
                    >
                      <i className="fas fa-plus me-1"></i>Recharge
                    </button>
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
                        if (!primaryCard?.id && !primaryCard?._id) {
                          alert('No primary card found. Please create a card first.');
                          return;
                        }
                        const handleTapIn = async (cardId) => {
                          try {
                            setActionLoading(cardId);
                            const user = JSON.parse(localStorage.getItem('user') || '{}');
                            const stationIdentifier = tapInStation || stations.find(s => (s.id || s._id) === tapInStation)?.name || 'Central Station';
                            const deviceId = localStorage.getItem('deviceId') || 'device123';
                            const qrData = `card:${cardId}:${Date.now()}`;
                            
                            const response = await cardAPI.tapIn(cardId, { 
                              userId: user.id || user._id,
                              stationIdentifier,
                              deviceId,
                              qrData
                            });
                            
                            alert("Tap In successful!");
                            fetchCards(); // Refresh cards
                          } catch (error) {
                            console.error('Tap In error:', error);
                            const errorMsg = error.response?.data?.error || error.message || "Failed to Tap In";
                            alert(`Tap In failed: ${errorMsg}`);
                          } finally {
                            setActionLoading(null);
                            localStorage.setItem('tapInStation', tapInStation);
                          }
                        };
                        await handleTapIn(primaryCard.id || primaryCard._id);
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
                        if (!primaryCard?.id && !primaryCard?._id) {
                          alert('No primary card found. Please create a card first.');
                          return;
                        }
                        try {
                          const qrData = JSON.stringify({
                            cardNumber: primaryCard.cardNumber,
                            token: 'demo-token' // In real app, this would be generated
                          })
                          await cardAPI.tapOut(primaryCard.id || primaryCard._id, {
                            endStation: stations.find(s => (s.id || s._id) === tapOutStation)?.name || tapOutStation,
                            deviceId: 'web-device-' + (user?.id || user?._id),
                            qrData: qrData
                          })
                        } catch (error) {
                          console.error('Tap out failed:', error)
                          alert('Tap out failed. Please try again.')
                        }
                      }}>
                        <i className="fas fa-sign-out-alt me-1"></i>Tap Out
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-muted">No primary card available</div>
            )}
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5>Secondary Cards</h5>
            <button 
              className="btn btn-outline-success btn-sm" 
              onClick={() => setShowRechargeModal(true)}
              disabled={secondaryCards.length === 0}
            >
              <i className="fas fa-plus me-1"></i>Recharge Any Card
            </button>
          </div>
          <div className="row">
            {secondaryCards.map((card, index) => (
              <div className="col-lg-4 col-md-6 mb-3" key={card.id || card._id || `secondary-card-${index}`}>
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
                  <div className="mt-3 d-flex gap-2 flex-wrap">
                    <button className="btn btn-success btn-sm me-2" onClick={() => handleRecharge(card.id || card._id, card.cardNumber)}>
                      <i className="fas fa-plus me-1"></i>Recharge
                    </button>
                    <button className="btn btn-outline-dark btn-sm" onClick={() => setPrimary(card.id || card._id)}>
                      Set Primary
                    </button>
                    <button 
                      className="btn btn-outline-success btn-sm" 
                      onClick={() => {
                        setRechargeAmount(100);
                        setShowRechargeModal(true);
                      }}
                      disabled={card.status !== 'active'}
                    >
                      <i className="fas fa-plus me-1"></i>Recharge
                    </button>
                    <button className="btn btn-outline-primary btn-sm" disabled={card.status !== 'active'}>
                      Use Card
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {secondaryCards.length === 0 && (
              <div className="col-12">
                <p className="text-muted">No secondary cards available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .credit-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1.5rem;
          border-radius: 15px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          transition: transform 0.2s ease-in-out;
        }
        .credit-card:hover {
          transform: translateY(-2px);
        }
        .credit-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .credit-chip {
          width: 40px;
          height: 30px;
          background: #ffd700;
          border-radius: 5px;
        }
        .credit-brand {
          font-weight: bold;
          font-size: 0.9rem;
        }
        .credit-nfc {
          font-size: 1.2rem;
        }
        .credit-number {
          font-size: 1.1rem;
          font-weight: bold;
          letter-spacing: 2px;
        }
        .credit-label {
          font-size: 0.7rem;
          opacity: 0.8;
        }
        .credit-name {
          font-weight: bold;
        }
        @media (max-width: 768px) {
          .d-flex.justify-content-between {
            flex-direction: column;
            gap: 1rem;
          }
          .d-flex.gap-2 {
            flex-direction: column;
          }
          .credit-card {
            padding: 1rem;
          }
          .credit-number {
            font-size: 1rem;
            letter-spacing: 1px;
          }
        }
      `}</style>

      {/* Recharge Modal */}
      {showRechargeModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-credit-card text-primary me-2"></i>
                  Recharge Primary Card
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowRechargeModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Recharge Amount (₹)</label>
                  <input
                    type="number"
                    className="form-control form-control-lg"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(Number(e.target.value))}
                    min="10"
                    step="10"
                  />
                </div>
                <div className="alert alert-info">
                  <i className="fas fa-info-circle me-2"></i>
                  Minimum recharge amount is ₹10. The amount will be added to your card balance.
                </div>
                <div className="row">
                  <div className="col-6">
                    <button 
                      className="btn btn-outline-secondary w-100" 
                      onClick={() => setRechargeAmount(50)}
                    >
                      ₹50
                    </button>
                  </div>
                  <div className="col-6">
                    <button 
                      className="btn btn-outline-secondary w-100" 
                      onClick={() => setRechargeAmount(100)}
                    >
                      ₹100
                    </button>
                  </div>
                </div>
                <div className="row mt-2">
                  <div className="col-6">
                    <button 
                      className="btn btn-outline-secondary w-100" 
                      onClick={() => setRechargeAmount(200)}
                    >
                      ₹200
                    </button>
                  </div>
                  <div className="col-6">
                    <button 
                      className="btn btn-outline-secondary w-100" 
                      onClick={() => setRechargeAmount(500)}
                    >
                      ₹500
                    </button>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowRechargeModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleRecharge}
                  disabled={rechargeAmount < 10}
                >
                  <i className="fas fa-credit-card me-2"></i>
                  Proceed to Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recharge by Card Number Modal */}
      <RechargeByCardNumber 
        show={showRechargeByNumberModal}
        onClose={() => setShowRechargeByNumberModal(false)}
      />
    </div>
  )
}

export default CardsPage

