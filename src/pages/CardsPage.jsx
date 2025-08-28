import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { cardAPI, stationAPI, subscriptionAPI } from '../api/api';
import { fetchUserCard, setCards } from '../slices/cardSlice';
import RechargeByCardNumber from '../components/RechargeByCardNumber';
import SimpleNotification from '../components/SimpleNotification';

function CardsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { cards, loading, error } = useSelector(s => s.card);
  const user = useSelector(s => s.auth.user);
  const [stations, setStations] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedSubscription, setSelectedSubscription] = useState('');
  const [tapInStation, setTapInStation] = useState(localStorage.getItem('tap_in_station') || '');
  const [tapOutStation, setTapOutStation] = useState(localStorage.getItem('tap_out_station') || '');
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showRechargeByNumberModal, setShowRechargeByNumberModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState(100);
  const [message, setMessage] = useState(location.state?.message || '');
  const [messageType, setMessageType] = useState(location.state?.type || '');
  const [actionLoading, setActionLoading] = useState(null);
  const [isLoading, setLoading] = useState(false);
  const [requiresPaymentSelection, setRequiresPaymentSelection] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [showPreTapInModal, setShowPreTapInModal] = useState(false);
  const [pendingTapInData, setPendingTapInData] = useState(null);

  // Helper function to get consistent card ID
  const getCardId = (card) => card.id || card._id;

  useEffect(() => {
    loadData();
  }, [dispatch, user]);

  async function loadData() {
    try {
      const { data } = await stationAPI.getAllStations();
      const stationList = Array.isArray(data) ? data : data.items || [];
      console.log('Loaded stations:', stationList.length);
      setStations(stationList);
    } catch (error) {
      console.error('Failed to fetch stations:', error);
      setMessage('Failed to fetch stations. Please try again later.');
      setMessageType('error');
    }
    
    try {
      if (!user?.id && !user?._id) return;
      dispatch(fetchUserCard(user.id || user._id));
      
      // Enhanced subscription fetching with multiple API attempts
      let activeSubscriptions = [];
      try {
        // Try different possible API endpoints and methods
        let subResponse;
        
        if (subscriptionAPI.getUserSubscriptions) {
          subResponse = await subscriptionAPI.getUserSubscriptions(user.id || user._id);
        } else if (subscriptionAPI.getSubscriptions) {
          subResponse = await subscriptionAPI.getSubscriptions(user.id || user._id);
        } else if (subscriptionAPI.getMySubscriptions) {
          subResponse = await subscriptionAPI.getMySubscriptions();
        } else {
          // Fallback to generic API call
          subResponse = { data: [] };
        }
        
        const subscriptionData = subResponse.data || subResponse || [];
        console.log('Raw subscription data:', subscriptionData);
        
        // Filter for active subscriptions with better status checking
        activeSubscriptions = (Array.isArray(subscriptionData) ? subscriptionData : []).filter(sub => {
          const status = (sub.status || '').toLowerCase();
          const isActive = status === 'active' || status === 'success';
          const notExpired = !sub.endDate || !sub.expiryDate || 
            new Date(sub.endDate || sub.expiryDate) > new Date();
          
          console.log(`Subscription ${sub._id || sub.id}: status=${status}, isActive=${isActive}, notExpired=${notExpired}`);
          return isActive && notExpired;
        });
        
        console.log('Active subscriptions found:', activeSubscriptions.length);
      } catch (subError) {
        console.warn('Failed to fetch subscriptions:', subError);
        // Continue without subscriptions - not a critical error
      }
      
      setSubscriptions(activeSubscriptions);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      setMessage('Failed to fetch user data. Please try again later.');
      setMessageType('error');
    }
  }

  useEffect(() => { 
    localStorage.setItem('tap_in_station', tapInStation); 
  }, [tapInStation]);
  
  useEffect(() => { 
    localStorage.setItem('tap_out_station', tapOutStation); 
  }, [tapOutStation]);
  
  // Handle successful recharge
  useEffect(() => {
    const pendingRecharge = localStorage.getItem('pendingRecharge');
    if (pendingRecharge && cards.length > 0) {
      try {
        const rechargeData = JSON.parse(pendingRecharge);
        const updatedCards = cards.map(card => {
          if (getCardId(card) === rechargeData.cardId) {
            return { ...card, balance: (card.balance || 0) + rechargeData.amount };
          }
          return card;
        });
        dispatch(setCards(updatedCards));
        localStorage.removeItem('pendingRecharge');
        setMessage(`Card ${rechargeData.cardNumber} recharged with ₹${rechargeData.amount}`);
        setMessageType('success');
      } catch (error) {
        console.error('Error processing recharge:', error);
      }
    }
  }, [cards, dispatch]);

  async function createNewCard() {
    if (!user?.id && !user?._id) {
      setMessage('Please login to create a card');
      setMessageType('error');
      return;
    }

    try {
      setLoading(true);
      
      // Create card via backend API (backend requires Mongo ObjectId)
      const response = await cardAPI.createCard({
        userId: user._id || user.id
      });

      const createdCard = response.data?.card || response.data?.virtualCard;
      if (createdCard) {
        dispatch(setCards([...(cards || []), createdCard]));
        setMessage(`Card created successfully! Card Number: ${createdCard.cardNumber}`);
        setMessageType('success');
        // Reload data to ensure everything is in sync
        loadData();
      } else {
        throw new Error(response.data?.error || 'Failed to create card');
      }
    } catch (error) {
      console.error('Card creation failed:', error);
      setMessage(error.response?.data?.error || error.message || 'Card creation failed. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }

  async function checkBalance(cardId) {
    try {
      const response = await cardAPI.checkBalance(cardId);
      const balance = response.data?.balance || response.data || 0;
      
      setMessage(`Card balance: ₹${Number(balance).toFixed(2)}`);
      setMessageType('success');
      
      // Auto-clear message after 5 seconds
      setTimeout(() => {
        setMessage('');
      }, 5000);
    } catch (error) {
      console.error('Failed to check balance:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to check balance';
      setMessage(`Balance check failed: ${errorMsg}`);
      setMessageType('error');
    }
  }

  async function setPrimary(cardId) {
    try {
      // Update card primary status via API
      const response = await cardAPI.updateCard(cardId, { isPrimary: true });
      
      if (response.data.success) {
        // Update all cards in state
        const updated = cards.map(c => ({
          ...c,
          isPrimary: getCardId(c) === cardId,
          type: getCardId(c) === cardId ? 'primary' : 'secondary'
        }));
        
        dispatch(setCards(updated));
        setMessage('Primary card updated successfully');
        setMessageType('success');
      } else {
        throw new Error(response.data.error || 'Failed to update primary card');
      }
    } catch (error) {
      console.error('Failed to set primary card:', error);
      setMessage(error.response?.data?.error || 'Failed to set primary card. Please try again.');
      setMessageType('error');
    }
  }

  function handleRecharge(cardId, cardNumber) {
    if (!cardId) {
      alert('Please select a card to recharge');
      return;
    }

    if (!rechargeAmount || rechargeAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const paymentInfo = {
      type: 'recharge',
      cardId: cardId,
      id: cardId,
      amount: rechargeAmount,
      description: `Card Recharge - ${cardNumber || 'Card'} - ₹${rechargeAmount}`
    };
    
    // Store recharge info for after payment
    localStorage.setItem('pendingRecharge', JSON.stringify({
      cardId: cardId,
      cardNumber: cardNumber,
      amount: rechargeAmount
    }));
    
    navigate('/payment', {
      state: { paymentInfo }
    });
  }

  async function handleTapIn(cardId) {
    if (!tapInStation) {
      alert('Please select a tap-in station first');
      return;
    }
    
    // Get card details
    const card = cards.find(c => getCardId(c) === cardId);
    if (!card) {
      alert('Card not found');
      return;
    }
    
    // Get station details (prefer stop_id)
    const station = stations.find(s => String(s.stop_id) === String(tapInStation))
      || stations.find(s => (s._id || s.id) === tapInStation || String(s._id) === String(tapInStation) || String(s.id) === String(tapInStation));
    
    if (!station) {
      alert('Station not found. Please select a valid station.');
      return;
    }

    // Show payment method selection modal first
    setPendingTapInData({
      cardId,
      card,
      station
    });
    setShowPreTapInModal(true);
  }

  const executeTapIn = async (paymentMethod, chosenPlanId = null) => {
    if (!pendingTapInData) return;

    const { cardId, card, station } = pendingTapInData;
    
    setActionLoading(cardId);
    setMessage('');
    setMessageType('');

    try {
      // Prepare tap-in data
      const tapInData = {
        stationIdentifier: String(tapInStation || station.stop_id || station.name || station._id || station.id),
        deviceId: 'web-portal',
        qrData: JSON.stringify({
          cardNumber: card.cardNumber,
          token: `web-token-${Date.now()}`
        }),
        paymentMethod: paymentMethod,
        chosenPlanId: chosenPlanId
      };

      // Validate payment method selection
      if (paymentMethod === 'subscription' && !chosenPlanId) {
        setMessage('Please select a subscription plan.');
        setMessageType('error');
        setActionLoading(null);
        return;
      }

      if (paymentMethod === 'balance') {
        // Check if card has sufficient balance
        if (card.balance < 20) {
          setMessage('Insufficient balance. Minimum ₹20 required for journey. Please recharge your card.');
          setMessageType('error');
          setActionLoading(null);
          return;
        }
      }
      
      console.log('Executing tap-in with payment method:', paymentMethod, tapInData);
      
      // Call backend API
      const response = await cardAPI.tapIn(cardId, tapInData);
      
      // Success handling
      const successMessage = paymentMethod === 'subscription'
        ? `Tap-in successful at ${station.name} using your subscription! No amount deducted.`
        : `Tap-in successful at ${station.name}! Journey will be charged from your card balance.`;
      
      setMessage(successMessage);
      setMessageType('success');
      
      // Store tap in info
      localStorage.setItem('tapInStation', tapInStation);
      localStorage.setItem('tappedInCardId', cardId);
      localStorage.setItem('tapInTime', new Date().toISOString());
      localStorage.setItem('selectedSubscription', chosenPlanId || '');
      localStorage.setItem('paymentMethod', paymentMethod);
      
      // Close modal and reset
      setShowPreTapInModal(false);
      setPendingTapInData(null);
      
    } catch (error) {
      console.error('Tap In error:', error);
      let errorMessage = 'Failed to tap in. Please try again.';
      
      if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || 'Invalid request. Please check your card and station selection.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied. Please check your subscription status or card balance.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Card or station not found.';
      }
      
      setMessage(errorMessage);
      setMessageType('error');
    } finally {
      setActionLoading(null);
    }
  };
async function handleTapOut(cardId) {
  if (!tapOutStation) {
    alert('Please select a tap-out station first');
    return;
  }
  
  if (!cardId) {
    alert('No card found. Please create a card first.');
    return;
  }

  const tappedInCardId = localStorage.getItem('tappedInCardId');
  if (tappedInCardId !== cardId) {
    alert('This card was not used for tap-in. Please use the same card.');
    return;
  }

  try {
    setActionLoading(cardId);
    
    // Get card details
    const card = cards.find(c => getCardId(c) === cardId);
    if (!card) {
      alert('Card not found');
      return;
    }
    
    // Get station details (prefer stop_id)
    const outStation = stations.find(s => String(s.stop_id) === String(tapOutStation))
      || stations.find(s => (s._id || s.id) === tapOutStation || String(s._id) === String(tapOutStation) || String(s.id) === String(tapOutStation));
    if (!outStation) {
      alert('Station not found');
      return;
    }
    
    // Get payment method from localStorage
    const paymentMethod = localStorage.getItem('paymentMethod');
    const assignedPlanId = localStorage.getItem('assignedPlanId');
    
    console.log('Tap-out details:', {
      cardId,
      paymentMethod,
      assignedPlanId,
      outStation: outStation.name
    });
    
    // Prepare tap-out data
    const tapOutData = {
      endStation: String(tapOutStation || outStation.stop_id || outStation.name || outStation._id || outStation.id),
      deviceId: 'web-portal',
      qrData: JSON.stringify({
        cardNumber: card.cardNumber,
        token: `web-token-${Date.now()}`
      })
    };
    
    // Add metadata if needed by API
    tapOutData.metadata = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };
    
    // Add plan ID if it was a subscription journey
    if (paymentMethod === 'subscription' && assignedPlanId) {
      tapOutData.chosenPlanId = assignedPlanId;
      tapOutData.paymentMethod = 'subscription';
    }
    
    console.log('Sending tap-out request:', tapOutData);
    
    // Call backend API
    const response = await cardAPI.tapOut(cardId, tapOutData);
    
    // Update card balance from backend response only if balance was deducted
    const usedSubscription = paymentMethod === 'subscription';
    if (!usedSubscription && response.data.newBalance !== undefined) {
      const updatedCards = cards.map(c => {
        if (getCardId(c) === cardId) {
          return { ...c, balance: response.data.newBalance };
        }
        return c;
      });
      dispatch(setCards(updatedCards));
    }
    
    // Show success message
    const successMessage = usedSubscription 
      ? 'Tap Out successful! Journey completed using your subscription - no amount deducted.'
      : `Tap Out successful! ₹${response.data.fare || response.data.amount || 0} deducted from your balance.`;
    
    setMessage(successMessage);
    setMessageType('success');
    
    // Clear tap in info
    localStorage.removeItem('tapInStation');
    localStorage.removeItem('tappedInCardId');
    localStorage.removeItem('tapInTime');
    localStorage.removeItem('selectedSubscription');
    localStorage.removeItem('paymentMethod');
    localStorage.removeItem('assignedPlanId');
    
  } catch (error) {
    console.error('Tap Out error:', error);
    let errorMessage = 'Tap Out failed. Please try again.';
    
    if (error.response?.status === 400) {
      errorMessage = error.response.data?.error || 'Invalid tap-out request.';
      // Log detailed error information for debugging
      console.error('Validation error details:', error.response.data);
    } else if (error.response?.status === 404) {
      errorMessage = 'No active journey found for this card.';
    } else if (error.response?.status === 500) {
      errorMessage = 'Server error during tap-out. Please try again later.';
      // Log server error details
      console.error('Server error details:', error.response.data);
    }
    
    // Check if there's additional error information in the response
    if (error.response?.data) {
      console.error('Full error response:', error.response.data);
    }
    
    setMessage(errorMessage);
    setMessageType('error');
  } finally {
    setActionLoading(null);
  }
}

  const primaryCard = cards?.find(c => c.isPrimary || c.type === 'primary') || cards?.[0];
  const secondaryCards = cards?.filter(c => !c.isPrimary && c.type !== 'primary') || [];

  return (
    <div className="container mt-5 pt-5">
      {message && (
        <SimpleNotification
          message={message}
          type={messageType}
          onClose={() => setMessage('')}
        />
      )}
      
      {/* Payment Method Selection UI */}
      {requiresPaymentSelection && messageType === 'info' && message.includes('payment method') && (
        <div className="alert alert-warning mt-3">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {message}
          <div className="mt-2">
            <strong>Please select your preferred payment method:</strong>
            <div className="form-check mt-2">
              <input
                className="form-check-input"
                type="radio"
                name="paymentMethod"
                id="paymentBalance"
                value="balance"
                checked={selectedPaymentMethod === 'balance'}
                onChange={() => setSelectedPaymentMethod('balance')}
              />
              <label className="form-check-label" htmlFor="paymentBalance">
                Use Card Balance (Pay per journey)
              </label>
            </div>
            {subscriptions.map(sub => (
              <div key={sub._id || sub.id} className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="paymentMethod"
                  id={`payment-${sub._id || sub.id}`}
                  value={sub._id || sub.id}
                  checked={selectedPaymentMethod === (sub._id || sub.id)}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                />
                <label className="form-check-label" htmlFor={`payment-${sub._id || sub.id}`}>
                  Use {sub.planName || sub.name} Subscription
                </label>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <button 
              className="btn btn-primary me-2"
              onClick={() => {
                if (selectedPaymentMethod === 'balance') {
                  setSelectedSubscription('');
                } else {
                  setSelectedSubscription(selectedPaymentMethod);
                }
                setRequiresPaymentSelection(false);
                // Retry the tap-in with the selected payment method
                const tappedInCardId = localStorage.getItem('tappedInCardId');
                if (tappedInCardId) {
                  handleTapIn(tappedInCardId);
                }
              }}
            >
              Confirm Payment Method
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => {
                setRequiresPaymentSelection(false);
                setMessage('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="fas fa-credit-card me-2"></i>My Cards</h2>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={() => checkBalance(primaryCard ? getCardId(primaryCard) : null)}>
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
          <button className="btn btn-primary" onClick={createNewCard} disabled={isLoading}>
            {isLoading ? (
              <><span className="spinner-border spinner-border-sm me-2"></span>Creating...</>
            ) : (
              <><i className="fas fa-plus me-2"></i>Get New Card</>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          {typeof error === 'string' ? error : error.message || 'An error occurred'}
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
                  <div className="credit-number">{primaryCard.cardNumber || '**** **** **** 1234'}</div>
                  <div className="text-end">
                    <div className="credit-label">VALID THRU</div>
                    <div>12/25</div>
                  </div>
                </div>
                <div className="credit-row">
                  <div>
                    <div className="credit-label">CARD HOLDER</div>
                    <div className="credit-name">{user?.name || 'Primary User'}</div>
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
                      <select 
                        className="form-select form-select-sm" 
                        value={tapInStation} 
                        onChange={e => setTapInStation(e.target.value)}
                      >
                        <option value="">Select Tap-In Station</option>
                        {stations.map(st => (
                          <option key={st.stop_id || st.id || st._id} value={st.stop_id || st.id || st._id}>
                            {st.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3 d-grid">
                      <button 
                        className="btn btn-light btn-sm" 
                        onClick={() => handleTapIn(getCardId(primaryCard))}
                        disabled={actionLoading === getCardId(primaryCard) || !tapInStation}
                      >
                        {actionLoading === getCardId(primaryCard) ? (
                          <span className="spinner-border spinner-border-sm"></span>
                        ) : (
                          <>
                            <i className="fas fa-sign-in-alt me-1"></i>Tap In
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="row g-2 align-items-center mt-2">
                    <div className="col-md-5">
                      <select 
                        className="form-select form-select-sm" 
                        value={tapOutStation} 
                        onChange={e => setTapOutStation(e.target.value)}
                      >
                        <option value="">Select Tap-Out Station</option>
                        {stations.map(st => (
                          <option key={st.stop_id || st.id || st._id} value={st.stop_id || st.id || st._id}>
                            {st.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3 d-grid">
                      <button 
                        className="btn btn-light btn-sm" 
                        onClick={() => handleTapOut(getCardId(primaryCard))}
                        disabled={actionLoading === getCardId(primaryCard) || !tapOutStation}
                      >
                        {actionLoading === getCardId(primaryCard) ? (
                          <span className="spinner-border spinner-border-sm"></span>
                        ) : (
                          <>
                            <i className="fas fa-sign-out-alt me-1"></i>Tap Out
                          </>
                        )}
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

      {subscriptions.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <h6 className="card-title">
                  <i className="fas fa-crown text-warning me-2"></i>
                  Active Subscriptions
                </h6>
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <select 
                      className="form-select" 
                      value={selectedSubscription} 
                      onChange={(e) => setSelectedSubscription(e.target.value)}
                    >
                      <option value="">Use Card Balance (Pay per journey)</option>
                      {subscriptions.map(sub => (
                        <option key={sub._id || sub.id} value={sub._id || sub.id}>
                          {sub.planName || sub.name} - Valid until {new Date(sub.endDate || sub.expiryDate).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <span className="badge bg-success">
                      {selectedSubscription ? 'Subscription Active' : 'Pay per Journey'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5>Secondary Cards</h5>
          </div>
          <div className="row">
            {secondaryCards.map((card, index) => (
              <div className="col-lg-4 col-md-6 mb-3" key={getCardId(card) || `secondary-card-${index}`}>
                <div className={`credit-card ${card.status === 'inactive' ? 'opacity-75' : ''}`}>
                  <div className="credit-row mb-3">
                    <div className="d-flex align-items-center gap-2">
                      <div className="credit-chip"></div>
                      <div className="credit-brand">SMART METRO</div>
                    </div>
                    <i className="fas fa-wifi credit-nfc"></i>
                  </div>
                  <div className="credit-row mb-2">
                    <div className="credit-number">{card.cardNumber || '**** **** **** 5678'}</div>
                    <div className="text-end">
                      <div className="credit-label">STATUS</div>
                      <span className={`badge ${card.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>
                        {card.status || 'active'}
                      </span>
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
                    <button 
                      className="btn btn-success btn-sm" 
                      onClick={() => handleRecharge(getCardId(card), card.cardNumber)}
                    >
                      <i className="fas fa-plus me-1"></i>Recharge
                    </button>
                    <button 
                      className="btn btn-outline-dark btn-sm" 
                      onClick={() => setPrimary(getCardId(card))}
                    >
                      Set Primary
                    </button>
                    <button 
                      className="btn btn-outline-primary btn-sm" 
                      onClick={() => checkBalance(getCardId(card))}
                    >
                      <i className="fas fa-wallet me-1"></i>Balance
                    </button>
                    {/* Tap controls for secondary cards */}
                    <div className="w-100"></div>
                    <div className="row g-2 w-100 align-items-center">
                      <div className="col-7">
                        <select 
                          className="form-select form-select-sm" 
                          value={tapInStation} 
                          onChange={e => setTapInStation(e.target.value)}
                        >
                          <option value="">Select Tap-In Station</option>
                          {stations.map(st => (
                            <option key={st.stop_id || st.id || st._id} value={st.stop_id || st.id || st._id}>
                              {st.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-5 d-grid">
                        <button 
                          className="btn btn-light btn-sm" 
                          onClick={() => handleTapIn(getCardId(card))}
                          disabled={actionLoading === getCardId(card) || !tapInStation}
                        >
                          {actionLoading === getCardId(card) ? (
                            <span className="spinner-border spinner-border-sm"></span>
                          ) : (
                            <>
                              <i className="fas fa-sign-in-alt me-1"></i>Tap In
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="row g-2 w-100 align-items-center mt-1">
                      <div className="col-7">
                        <select 
                          className="form-select form-select-sm" 
                          value={tapOutStation} 
                          onChange={e => setTapOutStation(e.target.value)}
                        >
                          <option value="">Select Tap-Out Station</option>
                          {stations.map(st => (
                            <option key={st.stop_id || st.id || st._id} value={st.stop_id || st.id || st._id}>
                              {st.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-5 d-grid">
                        <button 
                          className="btn btn-light btn-sm" 
                          onClick={() => handleTapOut(getCardId(card))}
                          disabled={actionLoading === getCardId(card) || !tapOutStation}
                        >
                          {actionLoading === getCardId(card) ? (
                            <span className="spinner-border spinner-border-sm"></span>
                          ) : (
                            <>
                              <i className="fas fa-sign-out-alt me-1"></i>Tap Out
                            </>
                          )}
                        </button>
                      </div>
                    </div>
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

      {/* Recharge Modal */}
      {showRechargeModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-credit-card text-primary me-2"></i>
                  Recharge Card
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
                  onClick={() => handleRecharge(
                    primaryCard ? getCardId(primaryCard) : null, 
                    primaryCard?.cardNumber
                  )}
                  disabled={rechargeAmount < 10 || !primaryCard}
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

      {/* Pre-Tap-In Payment Method Selection Modal */}
      {showPreTapInModal && pendingTapInData && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-credit-card text-primary me-2"></i>
                  Choose Payment Method for Journey
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setShowPreTapInModal(false);
                    setPendingTapInData(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-info">
                  <i className="fas fa-info-circle me-2"></i>
                  <strong>Journey Details:</strong><br/>
                  Card: {pendingTapInData.card.cardNumber}<br/>
                  From: {pendingTapInData.station.name}<br/>
                  Please select how you want to pay for this journey:
                </div>
                
                <div className="mb-3">
                  <strong>Payment Options:</strong>
                  
                  {/* Card Balance Option */}
                  <div className="form-check mt-2">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="preTapInPaymentMethod"
                      id="preTapInBalance"
                      value="balance"
                      checked={selectedPaymentMethod === 'balance'}
                      onChange={() => setSelectedPaymentMethod('balance')}
                    />
                    <label className="form-check-label" htmlFor="preTapInBalance">
                      <strong>Use Card Balance</strong> - Pay per journey (₹20-50 based on distance)
                    </label>
                    {selectedPaymentMethod === 'balance' && (
                      <div className="ms-4 mt-1 text-muted small">
                        Current balance: ₹{pendingTapInData.card.balance || 0}<br/>
                        Minimum required: ₹20
                      </div>
                    )}
                  </div>

                  {/* Subscription Options */}
                  {subscriptions.map(sub => (
                    <div key={sub._id || sub.id} className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="preTapInPaymentMethod"
                        id={`preTapIn-${sub._id || sub.id}`}
                        value={sub._id || sub.id}
                        checked={selectedPaymentMethod === (sub._id || sub.id)}
                        onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                      />
                      <label className="form-check-label" htmlFor={`preTapIn-${sub._id || sub.id}`}>
                        <strong>Use {sub.planName || sub.name} Subscription</strong> - No additional charges
                      </label>
                      {selectedPaymentMethod === (sub._id || sub.id) && (
                        <div className="ms-4 mt-1 text-muted small">
                          Valid until: {new Date(sub.endDate || sub.expiryDate).toLocaleDateString()}<br/>
                          Plan type: {sub.planType || 'Standard'}
                        </div>
                      )}
                    </div>
                  ))}

                  {subscriptions.length === 0 && (
                    <div className="alert alert-warning mt-2">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      No active subscriptions found. You can only use card balance for journeys.
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowPreTapInModal(false);
                    setPendingTapInData(null);
                    setSelectedPaymentMethod('');
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => {
                    if (!selectedPaymentMethod) {
                      alert('Please select a payment method first.');
                      return;
                    }
                    
                    const paymentMethod = selectedPaymentMethod === 'balance' ? 'balance' : 'subscription';
                    const chosenPlanId = selectedPaymentMethod === 'balance' ? null : selectedPaymentMethod;
                    
                    executeTapIn(paymentMethod, chosenPlanId);
                  }}
                  disabled={!selectedPaymentMethod}
                >
                  <i className="fas fa-sign-in-alt me-2"></i>
                  Confirm & Tap In
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}

export default CardsPage;