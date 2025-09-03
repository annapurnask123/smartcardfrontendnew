import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import QRCode from "react-qr-code";
import { ticketAPI } from "../api/api";
import { fetchStations } from "../slices/stationSlice";
import Swal from 'sweetalert2';

function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [journey, setJourney] = useState(null);
  const [selectedExtendStation, setSelectedExtendStation] = useState(null);
  const [showExtendDropdown, setShowExtendDropdown] = useState(false);
  const [selectedEarlyDropStation, setSelectedEarlyDropStation] = useState(null);
  const [showEarlyDropDropdown, setShowEarlyDropDropdown] = useState(false);
  const [isExtendSelected, setIsExtendSelected] = useState(false);
  const [isEarlyDropSelected, setIsEarlyDropSelected] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [qrCodeValue, setQrCodeValue] = useState('');

  const stationsState = useSelector((state) => state.stations);
  const stations = stationsState?.allItems || stationsState?.items || [];

  // Status logic for ticket actions
  const isActive = ticket?.status === 'Active' || ticket?.status === 'booked' || ticket?.status === 'active' || ticket?.status === 'confirmed';
  const isInProgress = ticket?.status === 'InProgress' || ticket?.status === 'in_progress' || ticket?.status === 'ongoing' || ticket?.status === 'started' || ticket?.status === 'tapped_in';
  const isCompleted = ticket?.status === 'Completed' || ticket?.status === 'completed' || ticket?.status === 'finished' || ticket?.status === 'ended';
  const isCancelled = ticket?.status === 'Cancelled' || ticket?.status === 'cancelled';

  // Calculate fare between stations - memoized for performance
  const calculateFare = useCallback((fromStationId, toStationId) => {
    const baseFare = 10;
    const perStationFare = 5;
    
    // Find index of stations in stations array
    const fromIndex = stations.findIndex(s => (s.id || s._id) === fromStationId);
    const toIndex = stations.findIndex(s => (s.id || s._id) === toStationId);
    
    if (fromIndex === -1 || toIndex === -1) return baseFare; // fallback
    
    const stationDistance = Math.abs(fromIndex - toIndex);
    return baseFare + (stationDistance * perStationFare);
  }, [stations]);

  // Simplified station name resolution
  const resolveStationName = useCallback((stationId, fallbackName) => {
    if (!stationId) return fallbackName || "Unknown Station";
    
    // If it's already a name, return it
    if (typeof stationId === 'string' && !stationId.match(/^[0-9a-fA-F]{24}$/)) {
      return stationId;
    }
    
    // Find station by ID
    const station = stations.find(s => 
      (s.id || s._id) === stationId || 
      String(s._id) === String(stationId) ||
      String(s.id) === String(stationId)
    );
    
    return station?.name || station?.station_name || station?.stop_name || fallbackName || "Unknown Station";
  }, [stations]);

  // Get from and to station names
  const fromStation = resolveStationName(
    ticket?.startStationId || ticket?.sourceStationId, 
    ticket?.startStationName || ticket?.sourceStation || ticket?.fromStation || ticket?.from
  );
  
  const toStation = resolveStationName(
    ticket?.endStationId || ticket?.destinationStationId,
    ticket?.endStationName || ticket?.destinationStation || ticket?.toStation || ticket?.to
  );

  // Check if extend/early drop has been used based on ticket properties
  useEffect(() => {
    if (ticket) {
      // Check if ticket has been extended (compare original vs current destination)
      const originalEndStation = ticket.originalEndStationId || ticket.endStationId;
      if (ticket.endStationId !== originalEndStation || ticket.extended) {
        setIsExtendSelected(true);
      }
      
      // Check if early drop has been used
      if (ticket.earlyDrop || ticket.isEarlyDrop) {
        setIsEarlyDropSelected(true);
      }

      // Generate QR code value
      const qrData = JSON.stringify({
        ticketId: ticket.ticketId || ticket._id || ticket.id,
        userId: ticket.userId || 'user123',
        timestamp: Date.now(),
        type: 'ticket',
        status: ticket.status
      });
      setQrCodeValue(qrData);
    }
  }, [ticket]);

  // Load current journey on component mount
  useEffect(() => {
    const currentJourneyData = localStorage.getItem('currentJourney');
    if (currentJourneyData) {
      setJourney(JSON.parse(currentJourneyData));
    }
  }, []);

  // Check for payment success on component mount
  useEffect(() => {
    const checkPaymentStatus = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentSuccess = urlParams.get('payment_success');
      const paymentType = urlParams.get('payment_type');
      const ticketId = urlParams.get('ticket_id');
      
      if (paymentSuccess === 'true' && paymentType === 'extend' && ticketId === id) {
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Show success message
        Swal.fire({
          icon: 'success',
          title: 'Payment Successful!',
          text: 'Your journey has been extended successfully.',
          confirmButtonText: 'OK'
        }).then(() => {
          // Refresh ticket data and maintain in_progress status
          fetchTicketData().then(() => {
            // Ensure ticket remains in_progress after extension
            setTicket(prev => ({
              ...prev,
              status: 'in_progress' // Keep journey active after extension
            }));
          });
        });
      }
    };
    
    checkPaymentStatus();
  }, [id]);

  // Fetch ticket data
  const fetchTicketData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ticketAPI.getTicket(id);
      const ticketData = res.data || res.ticket;
      
      if (ticketData) {
        // Ensure ticket has proper fields
        ticketData.price = ticketData.price || ticketData.amount || ticketData.fare || 25;
        ticketData.status = ticketData.status || 'Active';
        
        setTicket(ticketData);
      }
    } catch (err) {
      console.error('Error fetching ticket:', err);
      setError("Failed to load ticket details. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Fetch ticket + stations
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        
        // Fetch stations first to ensure they're available
        try {
          await dispatch(fetchStations());
        } catch (stationError) {
          console.error('Failed to fetch stations:', stationError);
        }
        
        await fetchTicketData();
        
        // Check for journey data
        const journeyData = localStorage.getItem('currentJourney');
        if (journeyData) {
          setJourney(JSON.parse(journeyData));
        }
        
      } catch (err) {
        console.error('Error in fetchData:', err);
        setError("Failed to load ticket details. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, dispatch, fetchTicketData]);

  // Get stations available for extending (stations after current end station)
  const getExtendStations = useCallback(() => {
    if (stations.length === 0) return [];
    
    const currentEndId = String(ticket?.endStationId?._id || ticket?.endStationId?.id || ticket?.endStationId);
    return stations.filter(s => {
      const stationId = String(s._id || s.id);
      return stationId !== currentEndId;
    });
  }, [stations, ticket]);

  // Get stations available for early drop (only stations between start and end)
  const getEarlyDropStations = useCallback(() => {
    if (stations.length === 0) return [];
    
    const startId = String(ticket?.startStationId?._id || ticket?.startStationId?.id || ticket?.startStationId);
    const endId = String(ticket?.endStationId?._id || ticket?.endStationId?.id || ticket?.endStationId);
    
    // Filter to get only intermediate stations (excluding start and end)
    return stations.filter(s => {
      const stationId = String(s._id || s.id);
      return stationId !== startId && stationId !== endId;
    });
  }, [stations, ticket]);

  // ===== Ticket Actions =====
  const handleCancel = async () => {
    // Prevent cancel if journey started
    if (isInProgress) {
      Swal.fire({
        icon: 'error',
        title: 'Cannot Cancel Ticket',
        text: 'You cannot cancel after journey has started.',
        confirmButtonText: 'OK'
      });
      return;
    }
    
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "Do you want to cancel this ticket?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, cancel it!'
    });
    
    if (!result.isConfirmed) return;
    
    try {
      setActionLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await ticketAPI.cancelTicket({ 
        ticketId: ticket.ticketId || ticket._id || ticket.id,
        userId: user.id || user._id
      });
      
      if (response?.data?.error) {
        Swal.fire({
          icon: 'error',
          title: 'Cancel Failed',
          text: response.data.error,
          confirmButtonText: 'OK'
        });
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Ticket Cancelled!',
          text: 'Ticket cancelled successfully! Refund (if any) will reflect in your wallet.',
          confirmButtonText: 'OK'
        });
        
        setTicket({...ticket, status: 'Cancelled'});
        setTimeout(() => navigate('/tickets'), 1500);
      }
    } catch (error) {
      console.error('Cancel error:', error);
      const errorMsg = error.response?.data?.error || error.message || "Failed to cancel ticket";
      
      Swal.fire({
        icon: 'error',
        title: 'Cancel Failed',
        text: errorMsg,
        confirmButtonText: 'OK'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtendJourney = async () => {
    // Allow extension only after journey has started
    if (!isInProgress) {
      Swal.fire({
        icon: 'info',
        title: 'Start Journey First',
        text: 'You can extend your destination after you tap in and start the journey.',
        confirmButtonText: 'OK'
      });
      return;
    }
    if (!selectedExtendStation) {
      setShowExtendDropdown(true);
      return;
    }

    const result = await Swal.fire({
      title: 'Extend Journey?',
      html: `Extend your journey to <b>${selectedExtendStation.name}</b>?<br>Additional fare will be charged.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, extend it!'
    });
    
    if (!result.isConfirmed) return;

    try {
      setActionLoading(true);
      
      // Extract current end station ID
      let currentEndStationId = ticket.endStationId;
      if (typeof currentEndStationId === 'object' && currentEndStationId !== null) {
        currentEndStationId = currentEndStationId._id || currentEndStationId.id;
      }
      currentEndStationId = String(currentEndStationId);
      
      // Extract new station ID
      let newStationId = selectedExtendStation._id || selectedExtendStation.id;
      newStationId = String(newStationId);
      
      // Calculate additional fare
      const additionalFare = calculateFare(currentEndStationId, newStationId);
      
      // Navigate to payment page with extra fare and new station id
      navigate('/payment', {
        state: {
          paymentInfo: {
            type: 'ticket_extend',
            ticketId: ticket.ticketId || ticket._id || ticket.id,
            userId: ticket.userId,
            newEndStationId: newStationId,
            newEndStationName: selectedExtendStation.name,
            additionalFare: additionalFare,
            amount: additionalFare,
            description: `Extend journey to ${selectedExtendStation.name}`,
            returnUrl: `/tickets/${ticket.ticketId || ticket._id || ticket.id}?payment_success=true&payment_type=extend&ticket_id=${ticket.ticketId || ticket._id || ticket.id}`
          }
        }
      });
      
    } catch (error) {
      console.error('Extend error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Extension Failed',
        text: "Failed to extend ticket. Please try again.",
        confirmButtonText: 'OK'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmExtend = async () => {
    if (!selectedExtendStation) {
      setMessage('Please select a station to extend your journey to');
      setMessageType('error');
      return;
    }

    try {
      setActionLoading(true);
      
      // Extract current end station ID
      let currentEndStationId = ticket.endStationId;
      if (typeof currentEndStationId === 'object' && currentEndStationId !== null) {
        currentEndStationId = currentEndStationId._id || currentEndStationId.id;
      }
      currentEndStationId = String(currentEndStationId);
      
      // Extract new station ID
      let newStationId = selectedExtendStation._id || selectedExtendStation.id;
      newStationId = String(newStationId);
      
      // Calculate additional fare between current end and new end station
      const additionalFare = calculateFare(currentEndStationId, newStationId);
      
      // Call backend API to extend ticket
      const extendResponse = await ticketAPI.extendJourney({
        ticketId: ticket.ticketId || ticket._id || ticket.id,
        userId: ticket.userId,
        newEndStationId: newStationId,
        additionalFare: additionalFare
      });
      
      // If backend requires payment, navigate to payment page
      if (extendResponse.data && extendResponse.data.paymentOrder) {
        navigate('/payment', {
          state: {
            paymentInfo: {
              type: 'ticket_extend',
              originalType: 'ticket',
              id: ticket.ticketId || ticket._id || ticket.id,
              ticketId: ticket.ticketId || ticket._id || ticket.id,
              userId: ticket.userId,
              amount: additionalFare,
              paymentMethod: "razorpay",
              description: `Extend journey to ${selectedExtendStation.name}`,
              returnUrl: `/tickets/${ticket.ticketId || ticket._id || ticket.id}?payment_success=true&payment_type=extend&ticket_id=${ticket.ticketId || ticket._id || ticket.id}`,
              paymentOrder: extendResponse.data.paymentOrder
            }
          }
        });
      } else {
        // Update ticket locally with new destination
        setTicket(prevTicket => ({
          ...prevTicket,
          endStationId: newStationId,
          endStationName: selectedExtendStation.name,
          endStation: selectedExtendStation.name,
          extended: true,
          additionalFare: additionalFare
        }));
        
        // Show success message
        Swal.fire({
          icon: 'success',
          title: 'Journey Extended!',
          html: `Your journey has been extended to <b>${selectedExtendStation.name}</b>.<br>Additional fare: ₹${additionalFare}`,
          confirmButtonText: 'OK'
        });
      }
      
      setIsExtendSelected(true);
      setShowExtendDropdown(false);
      
    } catch (error) {
      console.error('Extend ticket error:', error);
      
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      // If backend fails, navigate to payment as fallback
      navigate('/payment', {
        state: {
          paymentInfo: {
            type: 'ticket_extend',
            originalType: 'ticket',
            id: ticket.ticketId || ticket._id || ticket.id,
            ticketId: ticket.ticketId || ticket._id || ticket.id,
            userId: user.id || user._id,
            amount: additionalFare,
            paymentMethod: "razorpay",
            description: `Extend journey to ${selectedExtendStation.name}`,
            returnUrl: `/tickets/${ticket.ticketId || ticket._id || ticket.id}?payment_success=true&payment_type=extend&ticket_id=${ticket.ticketId || ticket._id || ticket.id}`
          }
        }
      });
      
    } finally {
      setActionLoading(false);
    }
  };

  const handleEarlyDrop = async () => {
    if (!selectedEarlyDropStation) {
      setShowEarlyDropDropdown(true);
      return;
    }

    // Calculate fare from START to EARLY DROP station (reduced fare)
    let startStationId = ticket.startStationId;
    if (typeof startStationId === 'object' && startStationId !== null) {
      startStationId = startStationId._id || startStationId.id;
    }
    startStationId = String(startStationId);
    
    const earlyDropStationId = String(selectedEarlyDropStation._id || selectedEarlyDropStation.id);
    const earlyDropFare = calculateFare(startStationId, earlyDropStationId);
    
    // Calculate original fare to show savings
    let originalEndStationId = ticket.endStationId;
    if (typeof originalEndStationId === 'object' && originalEndStationId !== null) {
      originalEndStationId = originalEndStationId._id || originalEndStationId.id;
    }
    originalEndStationId = String(originalEndStationId);
    const originalFare = calculateFare(startStationId, originalEndStationId);
    const savings = originalFare - earlyDropFare;

    const result = await Swal.fire({
      title: 'Early Drop?',
      html: `End your journey early at <b>${selectedEarlyDropStation.name}</b>?<br><br>
             Reduced fare: ₹${earlyDropFare} (you save ₹${savings})<br>
             Original fare to ${toStation}: ₹${originalFare}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, drop early!'
    });

    if (!result.isConfirmed) return;

    try {
      setActionLoading(true);
      
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const currentJourneyData = JSON.parse(localStorage.getItem('currentJourney') || '{}');
      
      // Update ticket status to completed with early drop
      const completedJourney = {
        ...currentJourneyData,
        tapOutTime: new Date().toISOString(),
        actualFare: earlyDropFare,
        originalFare: originalFare,
        savings: savings,
        status: 'completed',
        completedAt: new Date().toISOString(),
        earlyDrop: true,
        earlyDropStation: selectedEarlyDropStation.name,
        earlyDropStationId: earlyDropStationId
      };
      
      // Add to journey history
      const existingJourneys = JSON.parse(localStorage.getItem('journeys') || '[]');
      existingJourneys.push(completedJourney);
      localStorage.setItem('journeys', JSON.stringify(existingJourneys));
      
      // Clear current journey
      localStorage.removeItem('currentJourney');
      setJourney(null);
      
      // Update ticket status with early drop destination
      setTicket({
        ...ticket, 
        status: 'completed', 
        actualFare: earlyDropFare, 
        originalFare: originalFare,
        savings: savings,
        earlyDrop: true,
        endStationId: earlyDropStationId,
        endStation: selectedEarlyDropStation.name
      });
      
      Swal.fire({
        icon: 'success',
        title: 'Early Drop Completed!',
        html: `You've successfully ended your journey at <b>${selectedEarlyDropStation.name}</b>.<br>
               You saved ₹${savings} on your fare.`,
        confirmButtonText: 'OK'
      });
      
      // Reset dropdown state
      setShowEarlyDropDropdown(false);
      setSelectedEarlyDropStation(null);
      setIsEarlyDropSelected(true);
    } catch (error) {
      console.error('Early Drop error:', error);
      const errorMsg = error.response?.data?.error || error.message || "Failed to Early Drop";
      Swal.fire({
        icon: 'error',
        title: 'Early Drop Failed',
        text: errorMsg,
        confirmButtonText: 'OK'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmEarlyDrop = async () => {
    if (!selectedEarlyDropStation) {
      setMessage('Please select an early drop station');
      setMessageType('error');
      return;
    }

    const currentEndId = String(ticket?.endStationId?._id || ticket?.endStationId?.id || ticket?.endStationId);
    const earlyDropId = String(selectedEarlyDropStation._id || selectedEarlyDropStation.id);
    
    if (currentEndId === earlyDropId) {
      setMessage('Early drop station cannot be the same as current destination');
      setMessageType('error');
      return;
    }

    // Calculate savings (refund amount)
    const currentFare = ticket.price || 50;
    const earlyDropFare = calculateFare(
      ticket.startStationId?._id || ticket.startStationId?.id || ticket.startStationId,
      selectedEarlyDropStation._id || selectedEarlyDropStation.id
    );
    const savings = Math.max(0, currentFare - earlyDropFare);

    if (savings <= 0) {
      setMessage('No refund available for this early drop station');
      setMessageType('error');
      return;
    }

    try {
      setActionLoading('earlyDrop');
      
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Call backend API to process early drop
      const response = await ticketAPI.dropEarly({
        ticketId: ticket.ticketId || ticket._id || ticket.id,
        userId: user.id || user._id,
        stationId: selectedEarlyDropStation._id || selectedEarlyDropStation.id
      });
      
      // Update ticket locally
      setTicket(prevTicket => ({
        ...prevTicket,
        endStationId: selectedEarlyDropStation._id || selectedEarlyDropStation.id,
        endStationName: selectedEarlyDropStation.name,
        endStation: selectedEarlyDropStation.name,
        price: earlyDropFare,
        refundAmount: savings,
        earlyDrop: true,
        status: 'completed'
      }));
      
      // End backend journey and persist to local history
      try {
        const { userJourneyAPI } = await import('../api/api');
        const currentJourneyData = JSON.parse(localStorage.getItem('currentJourney') || '{}');
        if (currentJourneyData?._id) {
          await userJourneyAPI.endJourney(currentJourneyData._id, 'completed');
        }
        const completedJourney = {
          ...currentJourneyData,
          tapOutTime: new Date().toISOString(),
          status: 'completed',
          completedAt: new Date().toISOString(),
          earlyDrop: true,
          earlyDropStation: selectedEarlyDropStation.name
        };
        const existingJourneys = JSON.parse(localStorage.getItem('journeys') || '[]');
        existingJourneys.push(completedJourney);
        localStorage.setItem('journeys', JSON.stringify(existingJourneys));
        localStorage.removeItem('currentJourney');
        setJourney(null);
      } catch (_) {}
      
      // Show success message with refund info
      Swal.fire({
        icon: 'success',
        title: 'Early Drop Successful!',
        html: `New destination: <b>${selectedEarlyDropStation.name}</b>.<br>
               Refund of ₹${savings} will be processed to your wallet.`,
        confirmButtonText: 'OK'
      });
      
      setIsEarlyDropSelected(true);
      setShowEarlyDropDropdown(false);
      
    } catch (error) {
      console.error('Early drop error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to process early drop. Please try again.';
      
      Swal.fire({
        icon: 'error',
        title: 'Early Drop Failed',
        text: errorMessage,
        confirmButtonText: 'OK'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleTapIn = async () => {
    try {
      setActionLoading('tapIn');

      // Get the start station ID with multiple fallback options
      let startStationId = ticket?.startStationId || ticket?.sourceStationId || ticket?.from_station_id;
      if (typeof startStationId === 'object' && startStationId !== null) {
        startStationId = startStationId._id || startStationId.id || startStationId.stop_id;
      }

      // If still no startStationId, try to find by station name
      if (!startStationId && fromStation && fromStation !== 'Unknown Station') {
        const stationByName = stations.find(s =>
          s.name === fromStation ||
          s.station_name === fromStation ||
          s.stop_name === fromStation
        );
        if (stationByName) {
          startStationId = stationByName._id || stationByName.id || stationByName.stop_id;
        }
      }

      // Find the station details from stations array
      const startStation = stations.find(s =>
        (s._id || s.id) === startStationId ||
        s.stop_id === startStationId ||
        s.name === fromStation ||
        (startStationId && String(s._id) === String(startStationId)) ||
        (startStationId && String(s.id) === String(startStationId))
      );

      // Robust validation: block tap in if missing or invalid
      if (!startStationId || !startStation || !startStation.name || startStation.name === 'Unknown Station') {
        Swal.fire({
          icon: 'error',
          title: 'Cannot Tap In',
          text: 'Start station information is missing or invalid. Please contact support or try rebooking.',
          confirmButtonText: 'OK'
        });
        setActionLoading(null);
        return;
      }

      // Get user information
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (!user.id && !user._id) {
        Swal.fire({
          icon: 'error',
          title: 'User not found. Please login again.',
          confirmButtonText: 'OK'
        });
        setActionLoading(null);
        return;
      }

      // Try ticket API first with proper parameters
      let response;
      try {
        response = await ticketAPI.tapIn({
          ticketId: ticket.ticketId || ticket._id || ticket.id,
          stationId: startStation._id || startStation.id || startStation.stop_id,
          timestamp: new Date().toISOString()
        });
      } catch (ticketError) {
        const errorMessage = ticketError.response?.data?.error ||
          'Ticket tap-in failed. Please ensure the ticket is valid and try again.';
        Swal.fire({
          icon: 'error',
          title: 'Tap In Failed',
          text: errorMessage,
          confirmButtonText: 'OK'
        });
        setActionLoading(null);
        return;
      }

      // Start backend journey record and persist locally
      try {
        const { userJourneyAPI } = await import('../api/api');
        const startRes = await userJourneyAPI.startJourney({
          userId: user.id || user._id,
          tripId: ticket.trip_id,
          sourceStationId: startStation._id || startStation.id || startStation.stop_id,
          destinationStationId: ticket.endStationId?._id || ticket.endStationId?.id || ticket.endStationId
        });
        const journeyDoc = startRes.data || startRes;
        const journeyData = {
          _id: journeyDoc._id || journeyDoc.id,
          ticketId: ticket.ticketId || ticket._id || ticket.id,
          startStation: startStation.name,
          startStationId: startStation._id || startStation.id,
          startTime: new Date().toISOString(),
          status: 'in_progress',
          paymentMethod: 'ticket'
        };
        localStorage.setItem('currentJourney', JSON.stringify(journeyData));
        setJourney(journeyData);
      } catch (_) {
        const journeyData = {
          ticketId: ticket.ticketId || ticket._id || ticket.id,
          startStation: startStation.name,
          startStationId: startStation._id || startStation.id,
          startTime: new Date().toISOString(),
          status: 'in_progress',
          paymentMethod: 'ticket'
        };
        localStorage.setItem('currentJourney', JSON.stringify(journeyData));
        setJourney(journeyData);
      }

      // Update ticket status
      setTicket(prev => ({
        ...prev,
        status: 'in_progress',
        tapInTime: new Date().toISOString(),
        tapInStation: startStation._id || startStation.id
      }));

      Swal.fire({
        icon: 'success',
        title: 'Tap In Successful!',
        html: `Successfully tapped in at <b>${startStation.name}</b>!<br>Your journey has started.`,
        confirmButtonText: 'OK'
      });

    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || "Failed to tap in. Please try again.";
      Swal.fire({
        icon: 'error',
        title: 'Tap In Error',
        text: errorMessage,
        confirmButtonText: 'OK'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleTapOut = async () => {
    try {
      setActionLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const currentJourneyData = JSON.parse(localStorage.getItem('currentJourney') || '{}');
      
      // Calculate actual fare based on journey
      const calculatedFare = calculateFare(ticket.startStationId, ticket.endStationId);
      
      const ticketId = String(ticket.ticketId || ticket._id || ticket.id);
      
      // Try to get end station ID from different possible fields
      let stationId = ticket.endStationId || ticket.endStation || ticket.toStationId || ticket.to_station_id;
      
      // If stationId is an object, extract the _id or id field
      if (typeof stationId === 'object' && stationId !== null) {
        stationId = stationId._id || stationId.id;
      }
      
      stationId = String(stationId);
      
      // Validate required fields
      if (!ticketId || !stationId || ticketId === 'undefined' || stationId === 'undefined' || stationId === 'null') {
        console.error('Missing data for tap out:', { ticketId, stationId, ticket });
        Swal.fire({
          icon: 'error',
          title: 'Cannot Tap Out',
          text: 'Ticket or station information missing. Please contact support.',
          confirmButtonText: 'OK'
        });
        setActionLoading(false);
        return;
      }
      
      // If stationId is not a valid ObjectId, try to find it by name
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;
      if (!objectIdRegex.test(stationId)) {
        // Try to find station by name or other identifier
        const foundStation = stations.find(s => 
          s.name === toStation || 
          s.name === stationId ||
          (s.id || s._id) === stationId ||
          s.stop_id === stationId
        );
        
        if (foundStation) {
          stationId = String(foundStation._id || foundStation.id);
        } else {
          console.error('Could not find end station:', { stationId, toStation, stations });
          Swal.fire({
            icon: 'error',
            title: 'Cannot Find Station',
            text: `Could not find station "${toStation}". Please refresh and try again.`,
            confirmButtonText: 'OK'
          });
          setActionLoading(false);
          return;
        }
      }
      
      const response = await ticketAPI.tapOut({ 
        ticketId: ticketId,
        userId: String(user.id || user._id),
        stationId: stationId,
        timestamp: new Date().toISOString()
      });
      
      if (response?.data?.error) {
        Swal.fire({
          icon: 'error',
          title: 'Tap Out Failed',
          text: response.data.error,
          confirmButtonText: 'OK'
        });
      } else {
        // End backend journey if we have one
        try {
          const { userJourneyAPI } = await import('../api/api');
          if (currentJourneyData?._id) {
            await userJourneyAPI.endJourney(currentJourneyData._id, 'completed');
          }
        } catch (_) {}
        // Maintain local history as well
        const completedJourney = {
          ...currentJourneyData,
          tapOutTime: new Date().toISOString(),
          actualFare: calculatedFare,
          status: 'completed',
          completedAt: new Date().toISOString()
        };
        const existingJourneys = JSON.parse(localStorage.getItem('journeys') || '[]');
        existingJourneys.push(completedJourney);
        localStorage.setItem('journeys', JSON.stringify(existingJourneys));
        localStorage.removeItem('currentJourney');
        setJourney(null);
        
        Swal.fire({
          icon: 'success',
          title: 'Tap Out Successful!',
          html: `You've successfully completed your journey to <b>${toStation}</b>.<br>Fare: ₹${calculatedFare}`,
          confirmButtonText: 'OK'
        });
        setTicket({...ticket, status: 'completed', actualFare: calculatedFare});
      }
    } catch (error) {
      console.error('Tap Out error:', error);
      const errorMsg = error.response?.data?.error || error.message || "Failed to Tap Out";
      Swal.fire({
        icon: 'error',
        title: 'Tap Out Failed',
        text: errorMsg,
        confirmButtonText: 'OK'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // WhatsApp sharing functionality
  const handleWhatsAppShare = async () => {
    const ticketDetails = 
      `🎫 *SmartMetroCard Ticket*\n\n` +
      `📍 *From:* ${fromStation}\n` +
      `📍 *To:* ${toStation}\n` +
      `💰 *Price:* ₹${ticket.price || 0}\n` +
      `📅 *Date:* ${new Date(ticket.createdAt).toLocaleDateString()}\n` +
      `🆔 *Ticket ID:* ${ticket.ticketId || ticket._id || ticket.id}\n` +
      `📊 *Status:* ${ticket.status}\n\n` +
      `Scan the QR code at the station gate for entry.\n\n` +
      `_Powered by SmartMetroCard_`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(ticketDetails)}`;
    
    if (navigator.share && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: 'SmartMetroCard Ticket',
          text: ticketDetails,
        });
      } catch (err) {
        console.log('Native sharing failed, falling back to WhatsApp');
        window.open(whatsappUrl, '_blank');
      }
    } else {
      window.open(whatsappUrl, '_blank');
    }
  };

  // Copy ticket details to clipboard
  const handleCopyTicketDetails = async () => {
    const ticketDetails = `Metro Ticket Details\n\n` +
      `From: ${fromStation}\n` +
      `To: ${toStation}\n` +
      `Price: ₹${ticket.price || 0}\n` +
      `Date: ${new Date(ticket.createdAt).toLocaleDateString()}\n` +
      `Ticket ID: ${ticket.ticketId || ticket._id || ticket.id}\n` +
      `Status: ${ticket.status}`;
    
    try {
      await navigator.clipboard.writeText(ticketDetails);
      Swal.fire({
        icon: 'success',
        title: 'Copied to Clipboard!',
        text: 'Ticket details copied to clipboard!',
        confirmButtonText: 'OK'
      });
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = ticketDetails;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      Swal.fire({
        icon: 'success',
        title: 'Copied to Clipboard!',
        text: 'Ticket details copied to clipboard!',
        confirmButtonText: 'OK'
      });
    }
  };

  if (loading) {
    return (
      <div className="container mt-5 pt-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading ticket details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-5 pt-5">
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/tickets')}>
          <i className="fas fa-arrow-left me-2"></i>Back to Tickets
        </button>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="container mt-5 pt-5">
        <div className="alert alert-warning">
          <i className="fas fa-exclamation-circle me-2"></i>
          No ticket found.
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/tickets')}>
          <i className="fas fa-arrow-left me-2"></i>Back to Tickets
        </button>
      </div>
    );
  }

  return (
    <div className="container mt-5 pt-5">
      <div className="row justify-content-center">
        <div className="col-lg-8 col-md-10">
          <div className="card border-0 shadow">
            <div className="card-header bg-primary text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0">
                  <i className="fas fa-ticket-alt me-2"></i>
                  Ticket Details
                </h4>
                <button 
                  className="btn btn-outline-light btn-sm"
                  onClick={() => {
                    if (window.history.length > 1) {
                      navigate(-1)
                    } else {
                      navigate('/tickets')
                    }
                  }}
                >
                  <i className="fas fa-arrow-left me-1"></i>Back
                </button>
              </div>
            </div>
            
            <div className="card-body p-4">
              {/* Message Alert */}
              {message && (
                <div className={`alert alert-${messageType === 'success' ? 'success' : 'danger'} mb-4`}>
                  {message}
                </div>
              )}
              
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-4">
                    <h6 className="text-muted mb-2">Journey Route</h6>
                    <div className="d-flex align-items-center">
                      <div className="text-center flex-grow-1">
                        <div className="station-icon mb-2">
                          <i className="fas fa-map-marker-alt fa-2x text-success"></i>
                        </div>
                        <strong>{fromStation}</strong>
                        <div className="text-muted small">From</div>
                      </div>
                      <div className="mx-3">
                        <i className="fas fa-arrow-right fa-2x text-muted"></i>
                      </div>
                      <div className="text-center flex-grow-1">
                        <div className="station-icon mb-2">
                          <i className="fas fa-map-marker-alt fa-2x text-danger"></i>
                        </div>
                        <strong>{toStation}</strong>
                        <div className="text-muted small">To</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="col-md-6">
                  <div className="mb-4">
                    <h6 className="text-muted mb-2">Ticket Information</h6>
                    <div className="row">
                      <div className="col-6">
                        <div className="mb-3">
                          <small className="text-muted">Price</small>
                          <div className="h5 text-primary mb-0">₹{ticket.price || 0}</div>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="mb-3">
                          <small className="text-muted">Status</small>
                          <div>
                            <span className={`badge ${isActive ? 'bg-success' : isInProgress ? 'bg-warning' : isCompleted ? 'bg-secondary' : isCancelled ? 'bg-danger' : 'bg-secondary'}`}>
                              {ticket.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted">Created</small>
                      <div>{new Date(ticket.createdAt).toLocaleString()}</div>
                    </div>
                    {ticket.extended && (
                      <div className="mb-3">
                        <small className="text-muted">Extended</small>
                        <div className="text-success">Yes</div>
                      </div>
                    )}
                    {ticket.earlyDrop && (
                      <div className="mb-3">
                        <small className="text-muted">Early Drop</small>
                        <div className="text-info">Yes</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="text-center mb-4">
                <h6 className="text-muted mb-3">QR Code for Entry</h6>
                <div className="qr-container p-3 border rounded bg-light">
                  {qrCodeValue ? (
                    <QRCode 
                      value={qrCodeValue}
                      size={200}
                      level="M"
                    />
                  ) : (
                    <div className="d-flex justify-content-center align-items-center" style={{height: '200px'}}>
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading QR Code...</span>
                      </div>
                    </div>
                  )}
                </div>
                <small className="text-muted mt-2 d-block">
                  Scan this QR code at the station gate
                </small>
                <div className="mt-2">
                  <small className="text-muted">
                    Ticket ID: {ticket.ticketId || ticket._id || ticket.id}
                  </small>
                </div>
              </div>

              {/* Share Options */}
              <div className="border-top pt-4 mb-4">
                <h6 className="text-muted mb-3">Share Ticket</h6>
                <div className="row g-2">
                  <div className="col-md-6">
                    <button
                      onClick={() => handleWhatsAppShare()}
                      className="btn btn-success w-100"
                      disabled={actionLoading}
                    >
                      <i className="fab fa-whatsapp me-2"></i>
                      Share via WhatsApp
                    </button>
                  </div>
                  <div className="col-md-6">
                    <button
                      onClick={() => handleCopyTicketDetails()}
                      className="btn btn-outline-primary w-100"
                      disabled={actionLoading}
                    >
                      <i className="fas fa-copy me-2"></i>
                      Copy Details
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="border-top pt-4">
                <h6 className="text-muted mb-3">Actions</h6>
                <div className="row g-3">
                  {/* Tap In - only for active tickets */}
                  {isActive && (
                    <div className="col-md-6 col-sm-12">
                      <button
                        onClick={handleTapIn}
                        disabled={actionLoading}
                        className="btn btn-success w-100"
                      >
                        {actionLoading === 'tapIn' ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Processing...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-sign-in-alt me-2"></i>
                            Tap In at {fromStation}
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Tap Out - for in-progress tickets */}
                  {isInProgress && (
                    <div className="col-md-6 col-sm-12">
                      <button
                        onClick={handleTapOut}
                        disabled={actionLoading}
                        className="btn btn-success w-100"
                      >
                        {actionLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Processing...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-sign-out-alt me-2"></i>
                            Tap Out at {toStation}
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Cancel - only for active tickets */}
                  {isActive && (
                    <div className="col-md-6 col-sm-12">
                      <button
                        onClick={handleCancel}
                        disabled={actionLoading}
                        className="btn btn-danger w-100"
                      >
                        {actionLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Processing...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-times me-2"></i>
                            Cancel Ticket
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Extend Journey - only for in-progress tickets, not completed */}
                  {isInProgress && !isCompleted && !isExtendSelected && (
                    <div className="col-md-6 col-sm-12">
                      <button
                        onClick={() => setShowExtendDropdown(true)}
                        disabled={actionLoading}
                        className="btn btn-info w-100"
                      >
                        {actionLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Processing...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-expand-arrows-alt me-2"></i>
                            Extend Journey
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Early Drop - only for active/in-progress tickets, not completed */}
                  {(isActive || isInProgress) && !isCompleted && !isEarlyDropSelected && (
                    <div className="col-md-6 col-sm-12">
                      <button
                        onClick={() => setShowEarlyDropDropdown(true)}
                        disabled={actionLoading}
                        className="btn btn-warning w-100"
                      >
                        {actionLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Processing...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-stop-circle me-2"></i>
                            Early Drop
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Extend Journey Modal */}
      {showExtendDropdown && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Extend Journey</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowExtendDropdown(false)}
                  disabled={actionLoading}
                ></button>
              </div>
              <div className="modal-body">
                <p>Select a station to extend your journey:</p>
                {!isInProgress && (
                  <div className="alert alert-info py-2">
                    You can extend only after starting the journey (Tap In).
                  </div>
                )}
                <select 
                  className="form-select" 
                  onChange={(e) => setSelectedExtendStation(JSON.parse(e.target.value))}
                  value={selectedExtendStation ? JSON.stringify(selectedExtendStation) : ''}
                  disabled={actionLoading || !isInProgress}
                >
                  <option value="">Select Station</option>
                  {getExtendStations().map((station) => (
                    <option value={JSON.stringify(station)} key={station._id || station.id}>
                      {station.name}
                    </option>
                  ))}
                </select>
                {selectedExtendStation && (
                  <div className="mt-3 p-2 bg-light rounded">
                    <small>
                      Additional fare: ₹{calculateFare(
                        ticket.endStationId?._id || ticket.endStationId?.id || ticket.endStationId,
                        selectedExtendStation._id || selectedExtendStation.id
                      )}
                    </small>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowExtendDropdown(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleConfirmExtend}
                  disabled={!isInProgress || !selectedExtendStation || actionLoading}
                >
                  {actionLoading ? (
                    <span className="spinner-border spinner-border-sm me-2"></span>
                  ) : null}
                  Confirm Extension
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Early Drop Modal */}
      {showEarlyDropDropdown && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Early Drop</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowEarlyDropDropdown(false)}
                  disabled={actionLoading}
                ></button>
              </div>
              <div className="modal-body">
                <p>Select a station to end your journey early:</p>
                <select 
                  className="form-select" 
                  onChange={(e) => setSelectedEarlyDropStation(JSON.parse(e.target.value))}
                  value={selectedEarlyDropStation ? JSON.stringify(selectedEarlyDropStation) : ''}
                  disabled={actionLoading}
                >
                  <option value="">Select Station</option>
                  {getEarlyDropStations().map((station) => (
                    <option value={JSON.stringify(station)} key={station._id || station.id}>
                      {station.name}
                    </option>
                  ))}
                </select>
                {selectedEarlyDropStation && (
                  <div className="mt-3 p-2 bg-light rounded">
                    <small>
                      Refund amount: ₹{Math.max(0, (ticket.price || 50) - calculateFare(
                        ticket.startStationId?._id || ticket.startStationId?.id || ticket.startStationId,
                        selectedEarlyDropStation._id || selectedEarlyDropStation.id
                      ))}
                    </small>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowEarlyDropDropdown(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleConfirmEarlyDrop}
                  disabled={!selectedEarlyDropStation || actionLoading === 'earlyDrop'}
                >
                  {actionLoading === 'earlyDrop' ? (
                    <span className="spinner-border spinner-border-sm me-2"></span>
                  ) : null}
                  Confirm Early Drop
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .station-icon {
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: hsla(245, 56.80%, 46.30%, 0.63);
          margin: 0 auto;
        }
        .qr-container {
          display: inline-block;
          padding: 20px;
          background: white;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(78, 172, 81, 0.1);
        }
        @media (max-width: 768px) {
          .station-icon {
            width: 50px;
            height: 50px;
          }
          .station-icon i {
            font-size: 1.5rem !important;
          }
          .qr-container {
            padding: 15px;
          }
        }
      `}</style>
    </div>
  );
}

export default TicketDetailPage;