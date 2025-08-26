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
      
      // Fetch user subscriptions - handle different API method names
      let activeSubscriptions = [];
      try {
        // Try different possible method names for subscription API
        const subResponse = subscriptionAPI.getUserSubscriptions 
          ? await subscriptionAPI.getUserSubscriptions(user.id || user._id)
          : subscriptionAPI.getSubscriptions 
          ? await subscriptionAPI.getSubscriptions(user.id || user._id)
          : { data: [] };
        
        activeSubscriptions = (subResponse.data || []).filter(sub => sub.status === 'active');
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
      
      // Create card via backend API
      const response = await cardAPI.createCard({
        userId: user.id || user._id,
        isPrimary: cards.length === 0, // First card is always primary
        cardType: cards.length === 0 ? 'primary' : 'secondary'
      });

      if (response.data.success && response.data.card) {
        // Add new card to state
        const newCard = response.data.card;
        dispatch(setCards([...cards, newCard]));
        setMessage(`Card created successfully! Card Number: ${newCard.cardNumber}`);
        setMessageType('success');
        
        // Reload data to ensure everything is in sync
        loadData();
      } else {
        throw new Error(response.data.error || 'Failed to create card');
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
      type: 'card_recharge',
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
    
    try {
      setActionLoading(cardId);
      
      // Get card details
      const card = cards.find(c => getCardId(c) === cardId);
      if (!card) {
        alert('Card not found');
        return;
      }
      
      // Get station details
      const station = stations.find(s => 
        (s._id || s.id) === tapInStation || 
        s.stop_id === tapInStation ||
        String(s._id) === String(tapInStation) ||
        String(s.id) === String(tapInStation)
      );
      
      if (!station) {
        alert('Station not found. Please select a valid station.');
        return;
      }

      // Check for assigned plan from localStorage
      const cardPlanSelections = JSON.parse(localStorage.getItem('cardPlanSelections') || '{}');
      const assignedPlanId = cardPlanSelections[cardId];
      
      // Prepare tap-in data according to API requirements
      // Based on the error, the API expects different field names
      const tapInData = {
        stationId: station._id || station.id, // Use _id instead of stationIdentifier
        deviceId: 'web-portal', // Consistent device ID
        cardNumber: card.cardNumber, // Include card number directly
        userId: user.id || user._id, // Include user ID
      };

      // Add metadata if needed by API
      tapInData.metadata = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      };

      // Determine payment method and add plan ID if available
      if (assignedPlanId) {
        tapInData.planId = assignedPlanId;
        tapInData.paymentMethod = 'subscription';
      } else if (selectedSubscription) {
        tapInData.planId = selectedSubscription;
        tapInData.paymentMethod = 'subscription';
      } else {
        tapInData.paymentMethod = 'balance';
        
        // Check if card has sufficient balance
        if (card.balance < 20) {
          alert('Insufficient balance. Minimum ₹20 required for journey. Please recharge your card.');
          return;
        }
      }
      
      console.log('Sending tap-in request:', tapInData);
      
      // Call backend API with proper error handling
      const response = await cardAPI.tapIn(cardId, tapInData);
      
      // Handle different response scenarios
      if (response.data.requiresPaymentSelection) {
        alert('Please select your payment method for this journey.');
        navigate('/payment-method', { 
          state: { 
            cardId, 
            stationId: station._id || station.id,
            estimatedFare: response.data.estimatedFare 
          } 
        });
        return;
      }

      // Success handling
      const successMessage = response.data.usedSubscription 
        ? `Tap-in successful at ${station.name} using your subscription!`
        : `Tap-in successful at ${station.name}! ₹${response.data.fare || response.data.amount} deducted.`;
      
      setMessage(successMessage);
      setMessageType('success');
      
      // Update card balance in Redux if balance was deducted
      if (response.data.newBalance !== undefined) {
        const updatedCards = cards.map(c => 
          getCardId(c) === cardId ? { ...c, balance: response.data.newBalance } : c
        );
        dispatch(setCards(updatedCards));
      }
      
      // Store tap in info
      localStorage.setItem('tapInStation', tapInStation);
      localStorage.setItem('tappedInCardId', cardId);
      localStorage.setItem('tapInTime', new Date().toISOString());
      localStorage.setItem('selectedSubscription', selectedSubscription || '');
      localStorage.setItem('assignedPlanId', assignedPlanId || '');
      localStorage.setItem('paymentMethod', response.data.usedSubscription ? 'subscription' : 'balance');
      
    } catch (error) {
      console.error('Tap In error:', error);
      let errorMessage = 'Failed to tap in. Please try again.';
      
      if (error.response?.status === 400) {
        // More specific error message for 400 errors
        errorMessage = error.response.data?.error || 'Invalid request. Please check your card and station selection.';
        
        // Log the exact error details for debugging
        console.error('API Error Details:', error.response.data);
      } else if (error.response?.status === 403) {
        errorMessage = 'Insufficient balance. Please recharge your card.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Card or station not found.';
      }
      
      setMessage(errorMessage);
      setMessageType('error');
    } finally {
      setActionLoading(null);
    }
  }

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
      
      // Get station details
      const outStation = stations.find(s => (s._id || s.id) === tapOutStation);
      if (!outStation) {
        alert('Station not found');
        return;
      }
      
      // Get payment method from localStorage
      const paymentMethod = localStorage.getItem('paymentMethod');
      const assignedPlanId = localStorage.getItem('assignedPlanId');
      
      // Prepare tap-out data
      const tapOutData = {
        stationId: outStation._id || outStation.id, // Use correct field name
        deviceId: 'web-portal',
        cardNumber: card.cardNumber,
        userId: user.id || user._id,
      };
      
      // Add metadata if needed by API
      tapOutData.metadata = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      };
      
      // Add plan ID if it was a subscription journey
      if (paymentMethod === 'subscription' && assignedPlanId) {
        tapOutData.planId = assignedPlanId;
        tapOutData.paymentMethod = 'subscription';
      }
      
      console.log('Sending tap-out request:', tapOutData);
      
      // Call backend API
      const response = await cardAPI.tapOut(cardId, tapOutData);
      
      // Update card balance from backend response
      if (response.data.newBalance !== undefined) {
        const updatedCards = cards.map(c => {
          if (getCardId(c) === cardId) {
            return { ...c, balance: response.data.newBalance };
          }
          return c;
        });
        dispatch(setCards(updatedCards));
      }
      
      // Show success message
      const successMessage = paymentMethod === 'subscription' 
        ? 'Tap Out successful! Journey completed using your subscription.'
        : `Tap Out successful! ₹${response.data.fare || response.data.amount} deducted from your balance.`;
      
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
      } else if (error.response?.status === 404) {
        errorMessage = 'No active journey found for this card.';
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
                          <option key={st.id || st._id} value={st.id || st._id}>
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
                          <option key={st.id || st._id} value={st.id || st._id}>
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