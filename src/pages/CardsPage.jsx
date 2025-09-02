import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { cardAPI, stationAPI, subscriptionAPI } from '../api/api';
import { fetchUserCard, setCards } from '../slices/cardSlice';
import RechargeByCardNumber from '../components/RechargeByCardNumber';
import SimpleNotification from '../components/SimpleNotification';

function CardsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
    const { cards, loading, error } = useSelector(s => s.card);
  const user = useSelector(s => s.auth.user);
  const [stations, setStations] = useState([]);
    const [tapInStation, setTapInStation] = useState(localStorage.getItem('tap_in_station') || '');
  const [tapOutStation, setTapOutStation] = useState(localStorage.getItem('tap_out_station') || '');
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showRechargeByNumberModal, setShowRechargeByNumberModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState(0);
    const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCardForTapIn, setSelectedCardForTapIn] = useState(null);
  const [selectedTapInStation, setSelectedTapInStation] = useState('');
  const [userSubscriptions, setUserSubscriptions] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [isLoading, setLoading] = useState(false);

  // Helper function to get consistent card ID
  const getCardId = (card) => card.id || card._id;
  const isTappedInForCard = (cardId) => String(localStorage.getItem('tappedInCardId') || '') === String(cardId);

  useEffect(() => {
    loadData();
  }, [dispatch, user]);

  async function loadData() {
    try {
      const { data } = await stationAPI.getAllStations();
      const stationList = Array.isArray(data) ? data : data.items || [];
            setStations(stationList);
    } catch (error) {
      console.error('Failed to fetch stations:', error);
      setMessage('Failed to fetch stations. Please try again later.');
      setMessageType('error');
    }
    
    try {
      if (!user?.id && !user?._id) return;
      dispatch(fetchUserCard(user.id || user._id));
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
          if (card.cardNumber === rechargeData.cardNumber) {
            return { ...card, balance: (card.balance || 0) + Number(rechargeData.amount) };
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
      
      // Update local store with the fetched balance
      try {
        const updated = cards.map(c =>
          getCardId(c) === cardId ? { ...c, balance: Number(balance) } : c
        );
        dispatch(setCards(updated));
      } catch (_) {}
      
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
        // Refresh from server to avoid drift
        if (user?.id || user?._id) {
          dispatch(fetchUserCard(user.id || user._id));
        }
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

  async function handleRecharge(cardId, amount) {
    if (!amount || amount <= 0) {
      setMessage('Please enter a valid recharge amount');
      setMessageType('error');
      return;
    }
    
    setActionLoading(cardId);
    
    try {
      const card = cards.find(c => getCardId(c) === cardId);
      if (!card) {
        setMessage('Card not found');
        setMessageType('error');
        return;
      }
      
            
      // Start Razorpay payment flow for recharge
      localStorage.setItem('pendingRecharge', JSON.stringify({
        cardNumber: card.cardNumber,
        amount: Number(amount)
      }));
      navigate('/payment', {
        state: {
          paymentInfo: {
            type: 'recharge',
            id: card.cardNumber,
            amount: parseFloat(amount),
            description: `Card Recharge - ${card.cardNumber} - ₹${parseFloat(amount)}`
          }
        }
      });
      // Balance will be updated after payment verification/webhook
      
    } catch (error) {
      console.error('Recharge error:', error);
      let errorMessage = 'Recharge failed. Please try again.';
      
      if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || 'Invalid recharge request.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Card not found.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error during recharge. Please try again later.';
      }
      
      setMessage(errorMessage);
      setMessageType('error');
    } finally {
      setActionLoading(null);
    }
  }

  function handleRechargeModal(cardId, cardNumber) {
    if (!cardId) {
      setMessage('Please select a card to recharge');
      setMessageType('error');
      return;
    }

    if (!rechargeAmount || rechargeAmount <= 0) {
      setMessage('Please enter a valid amount');
      setMessageType('error');
      return;
    }

    const paymentInfo = {
      type: 'recharge',
      cardId: cardNumber, // Use card number instead of ObjectId
      id: cardNumber,
      amount: rechargeAmount,
      description: `Card Recharge - ${cardNumber || 'Card'} - ₹${rechargeAmount}`
    };
    
    // Store recharge info for after payment
    localStorage.setItem('pendingRecharge', JSON.stringify({
      cardNumber: cardNumber,
      amount: Number(rechargeAmount)
    }));
    
    navigate('/payment', {
      state: { paymentInfo }
    });
    
    setShowRechargeModal(false);
  }

  async function handleTapIn(cardId, tapInStation) {
    if (!tapInStation) {
      setMessage('Please select a station to tap in');
      setMessageType('error');
      return;
    }
    
    const card = cards.find(c => getCardId(c) === cardId);
    if (!card) {
      setMessage('Card not found');
      setMessageType('error');
      return;
    }
    
    // Store tap-in details for payment modal
    setSelectedCardForTapIn(card);
    setSelectedTapInStation(tapInStation);
    
    // Always show payment method selection modal first
    try {
      // Get user subscriptions to show in payment modal
      const response = await subscriptionAPI.getAllSubscriptions();
      const allSubscriptions = response.data?.subscriptions || response.data || [];
      const activeSubscriptions = allSubscriptions.filter(sub => sub.status === 'active');
      
      // Transform subscriptions to match expected format
      const transformedSubscriptions = activeSubscriptions.map(sub => ({
        subscriptionId: sub._id,
        planName: sub.planId?.name || 'Unknown Plan',
        planType: sub.planType || 'Standard',
        validUntil: sub.endDate,
        description: 'Travel using your active subscription (no charge)',
        cost: 0
      }));
      
      setUserSubscriptions(transformedSubscriptions);
      
      // Always show payment modal if user has any payment options
      if (transformedSubscriptions.length > 0 || (card.balance > 0)) {
        setPaymentMethod('');
        setSelectedPlanId('');
        setShowPaymentModal(true);
        return;
      } else {
        // No payment options available
        const errorMessage = 'No payment methods available. Please recharge your card or purchase a subscription.';
        setMessage(errorMessage);
        setMessageType('error');
      }
    } catch (error) {
      console.error('Failed to check subscriptions:', error);
      // If subscription check fails but card has balance, show modal
      if (card.balance > 0) {
        setUserSubscriptions([]);
        setPaymentMethod('');
        setSelectedPlanId('');
        setShowPaymentModal(true);
      } else {
        setMessage('Failed to load payment options. Please try again.');
        setMessageType('error');
      }
    }
  }

async function handleTapOut(cardId, tapOutStation) {
  if (!tapOutStation) {
    setMessage('Please select a station to tap out');
    setMessageType('error');
    return;
  }

  // Check tap-in info in localStorage (soft check; server will validate)
  const tappedInCardId = localStorage.getItem('tappedInCardId');
  const tapInTime = localStorage.getItem('tapInTime');
  const isLikelyValidJourney = tappedInCardId && String(tappedInCardId) === String(cardId) && !!tapInTime;
  if (!isLikelyValidJourney) {
    console.warn('Local journey state not found or mismatched; proceeding with server-side validation', { tappedInCardId, cardId, tapInTime });
  }

  setActionLoading(cardId);

  try {
    const card = cards.find(c => getCardId(c) === cardId);
    if (!card) {
      setMessage('Card not found');
      setMessageType('error');
      return;
    }

    const outStation = stations.find(s => String(s.stop_id) === String(tapOutStation))
      || stations.find(s => (s._id || s.id) === tapOutStation);
    if (!outStation) {
      setMessage('Station not found');
      setMessageType('error');
      return;
    }

    const tapOutData = {
      endStation: String(outStation.stop_id || outStation._id || outStation.id),
      deviceId: 'web-portal',
      qrData: JSON.stringify({
        cardNumber: card.cardNumber,
        token: `web-token-${Date.now()}`
      }),
      paymentMethod: localStorage.getItem('journeyPaymentMethod') || undefined,
      chosenPlanId: localStorage.getItem('journeySubscriptionId') || undefined
    };

    const response = await cardAPI.tapOut(cardId, tapOutData);

    // Enhanced balance update handling
    const updatedBalance = response.data?.balance ?? response.data?.card?.balance ?? response.data?.remainingBalance;
    const fareCharged = response.data?.fareCharged ?? response.data?.fare ?? 0;
    
    console.log('Tap-out response:', {
      balance: updatedBalance,
      fareCharged: fareCharged,
      paymentMethod: response.data?.paymentMethod,
      fullResponse: response.data
    });

    if (updatedBalance !== undefined) {
      const updatedCards = cards.map(c =>
        getCardId(c) === cardId
          ? { ...c, balance: updatedBalance, status: 'Active' }
          : c
      );
      dispatch(setCards(updatedCards));
      console.log(`Card balance updated: ₹${updatedBalance}`);
    } else {
      // Force refresh if balance not in response
      console.log('Balance not found in response, refreshing cards...');
      dispatch(fetchUserCard(user.id || user._id));
    }

    // Determine selected payment method before clearing storage
    const selectedMethod = localStorage.getItem('journeyPaymentMethod') || response.data?.paymentMethod || '';

    setTapOutStation('');
    localStorage.removeItem('tap_out_station');
    localStorage.removeItem('tappedInCardId');
    localStorage.removeItem('tapInTime');
    // Clear journey payment selections
    localStorage.removeItem('journeyPaymentMethod');
    localStorage.removeItem('journeySubscriptionId');

    // Extract fare and balance robustly from API response
    const fare = response.data?.fare ?? response.data?.actualFare ?? response.data?.calculatedFare ?? response.data?.amount ?? response.data?.deducted;
    const newBalance = response.data?.balance ?? response.data?.card?.balance ?? response.data?.newBalance;

    let detailsMsg = '';
    if (selectedMethod === 'subscription' || fare === 0) {
      detailsMsg = ' No fare deducted (subscription).';
    } else if (typeof fare === 'number') {
      detailsMsg = ` Fare deducted: ₹${fare}.`;
    }

    if (typeof newBalance === 'number') {
      detailsMsg += ` New balance: ₹${newBalance}.`;
    } else {
      // If balance not provided, refresh cards to reflect any server-side updates
      if (user?.id || user?._id) {
        dispatch(fetchUserCard(user.id || user._id));
      }
    }

    setMessage(`Successfully tapped out at ${outStation.name}.${detailsMsg}`);
    setMessageType('success');

    setTimeout(() => {
      setMessage('');
    }, 5000);

  } catch (error) {
    console.error('Tap Out error:', error);
    let errorMessage = 'Tap Out failed. Please try again.';

    if (error.response?.status === 400) {
      const errorData = error.response.data;
      if (errorData?.error) {
        errorMessage = errorData.error;
      } else {
        errorMessage = 'Invalid tap-out request. Please check your journey status.';
      }
      console.error('Validation error details:', error.response.data);
    } else if (error.response?.status === 403) {
      errorMessage = error.response.data?.error || 'Insufficient balance or journey access denied.';
    } else if (error.response?.status === 404) {
      errorMessage = 'No active journey found for this card.';
    } else if (error.response?.status === 500) {
      errorMessage = 'Server error during tap-out. Please try again later.';
      console.error('Server error details:', error.response.data);
    }

    if (error.response?.data) {
      console.error('Full error response:', error.response.data);
    }

    setMessage(errorMessage);
    setMessageType('error');
  } finally {
    setActionLoading(null);
  }
}

  async function performTapIn(card, tapInStation, selectedPaymentMethod, planId) {
  setActionLoading(getCardId(card));
  
  try {
    // ...existing code...
    const inStation = stations.find(s => String(s.stop_id) === String(tapInStation))
      || stations.find(s => (s._id || s.id) === tapInStation);
    if (!inStation) {
      setMessage('Station not found');
      setMessageType('error');
      return;
    }
    
    const resolvedPlanId = selectedPaymentMethod === 'subscription' ? (planId || userSubscriptions[0]?.subscriptionId || null) : null;
    const tapInData = {
      stationIdentifier: inStation.stop_id || inStation._id,
      deviceId: 'web-device',
      qrData: JSON.stringify({
        cardNumber: card.cardNumber,
        token: `web-token-${Date.now()}`,
        deviceId: 'web-device'
      }),
      paymentMethod: selectedPaymentMethod,
      ...(resolvedPlanId && { chosenPlanId: resolvedPlanId })
    };
    
    const response = await cardAPI.tapIn(getCardId(card), tapInData);
    
    if (response.data) {
      setMessage(`Tap In successful at ${inStation.name}! Journey started with ${selectedPaymentMethod} payment.`);
      setMessageType('success');
      dispatch(fetchUserCard(user.id || user._id));
      setTapInStation('');
      localStorage.removeItem('tap_in_station');

      // Store tap-in info for tap-out validation
      localStorage.setItem('tappedInCardId', String(getCardId(card)));
      localStorage.setItem('tapInTime', String(Date.now()));
      // Persist chosen payment method for this journey
      localStorage.setItem('journeyPaymentMethod', selectedPaymentMethod);
      if (resolvedPlanId) {
        localStorage.setItem('journeySubscriptionId', String(resolvedPlanId));
      }
    }
  } catch (error) {
    console.error('Tap In error:', error);
    const msg = error?.response?.data?.error || error?.message || 'Tap In failed. Please try again.';
    setMessage(msg);
    setMessageType('error');
  } finally {
    setActionLoading(null);
    setShowPaymentModal(false);
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
                          <option key={st.stop_id || st.id || st._id} value={st.stop_id || st.id || st._id}>
                            {st.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3 d-grid">
                      <button 
                        className="btn btn-light btn-sm" 
                        onClick={() => handleTapIn(getCardId(primaryCard), tapInStation)}
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
                        onClick={() => handleTapOut(getCardId(primaryCard), tapOutStation)}
                        disabled={!isTappedInForCard(getCardId(primaryCard)) || actionLoading === getCardId(primaryCard) || !tapOutStation}
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
                      onClick={() => handleRecharge(getCardId(card), rechargeAmount)}
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
                          onClick={() => handleTapIn(getCardId(card), tapInStation)}
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
                          onClick={() => handleTapOut(getCardId(card), tapOutStation)}
                          disabled={!isTappedInForCard(getCardId(card)) || actionLoading === getCardId(card) || !tapOutStation}
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
                  onClick={() => handleRechargeModal(getCardId(primaryCard), primaryCard?.cardNumber)}
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

      {/* Payment Method Selection Modal */}
      {showPaymentModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-credit-card text-primary me-2"></i>
                  Select Payment Method
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowPaymentModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <p className="text-muted mb-3">
                    Choose how you want to pay for your journey:
                  </p>
                  
                  {/* Card Balance Option */}
                  {selectedCardForTapIn && selectedCardForTapIn.balance > 0 && (
                    <div className="form-check mb-3 p-3 border rounded">
                      <input 
                        className="form-check-input" 
                        type="radio" 
                        name="paymentMethod" 
                        id="balancePayment"
                        value="balance"
                        checked={paymentMethod === 'balance'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      />
                      <label className="form-check-label w-100" htmlFor="balancePayment">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <strong>Card Balance</strong>
                            <div className="text-muted small">Pay per journey</div>
                          </div>
                          <div className="text-success">
                            <strong>₹{selectedCardForTapIn.balance?.toFixed(2) || '0.00'}</strong>
                          </div>
                        </div>
                      </label>
                    </div>
                  )}
                  
                  {/* Subscription Options */}
                  {userSubscriptions && userSubscriptions.length > 0 && (
                    <div className="form-check mb-3 p-3 border rounded">
                      <input 
                        className="form-check-input" 
                        type="radio" 
                        name="paymentMethod" 
                        id="subscription-payment"
                        value="subscription"
                        checked={paymentMethod === 'subscription'}
                        onChange={() => setPaymentMethod('subscription')}
                      />
                      <label className="form-check-label w-100" htmlFor="subscription-payment">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <strong>Use Subscription (Free)</strong>
                            <div className="text-muted small">Travel using your active subscription</div>
                          </div>
                          <div className="text-primary">
                            <i className="fas fa-infinity"></i>
                          </div>
                        </div>
                      </label>
                      
                      {/* Subscription Selection Dropdown */}
                      {paymentMethod === 'subscription' && userSubscriptions.length > 1 && (
                        <div className="mt-3">
                          <label className="form-label">Select Subscription:</label>
                          <select 
                            className="form-select"
                            value={selectedPlanId}
                            onChange={(e) => setSelectedPlanId(e.target.value)}
                          >
                            <option value="">Choose a subscription...</option>
                            {userSubscriptions.map((sub) => (
                              <option key={sub.subscriptionId} value={sub.subscriptionId}>
                                {sub.planName} ({sub.planType}) - Valid until {new Date(sub.validUntil).toLocaleDateString()}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      
                      {/* Single Subscription Display */}
                      {paymentMethod === 'subscription' && userSubscriptions.length === 1 && (
                        <div className="mt-3 p-2 bg-light rounded">
                          <strong>{userSubscriptions[0].planName}</strong> ({userSubscriptions[0].planType})
                          <div className="text-muted small">
                            Valid until: {new Date(userSubscriptions[0].validUntil).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* No payment methods available */}
                  {(!selectedCardForTapIn || selectedCardForTapIn.balance <= 0) && userSubscriptions.length === 0 && (
                    <div className="alert alert-warning">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      No payment methods available. Please recharge your card or purchase a subscription.
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => {
                    if (paymentMethod === 'balance') {
                      performTapIn(selectedCardForTapIn, selectedTapInStation, 'balance', null);
                    } else if (paymentMethod === 'subscription') {
                      performTapIn(selectedCardForTapIn, selectedTapInStation, 'subscription', selectedPlanId);
                    }
                  }}
                  disabled={!paymentMethod}
                >
                  <i className="fas fa-sign-in-alt me-2"></i>
                  Start Journey
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
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