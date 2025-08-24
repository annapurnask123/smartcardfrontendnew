import { useEffect, useState } from "react";
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
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [journey, setJourney] = useState(null);
  const [fareCalculated, setFareCalculated] = useState(false);
  const [selectedExtendStation, setSelectedExtendStation] = useState(null);
  const [showExtendDropdown, setShowExtendDropdown] = useState(false);
  const [selectedEarlyDropStation, setSelectedEarlyDropStation] = useState(null);
  const [showEarlyDropDropdown, setShowEarlyDropDropdown] = useState(false);
  const [isExtendSelected, setIsExtendSelected] = useState(false);
  const [isEarlyDropSelected, setIsEarlyDropSelected] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [paymentOptions, setPaymentOptions] = useState(null);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // Calculate fare between stations
  const calculateFare = (fromStationId, toStationId) => {
    const baseFare = 10;
    const perStationFare = 5;
    
    // Find index of stations in stations array
    const fromIndex = stations.findIndex(s => (s.id || s._id) === fromStationId);
    const toIndex = stations.findIndex(s => (s.id || s._id) === toStationId);
    
    if (fromIndex === -1 || toIndex === -1) return baseFare; // fallback
    
    const stationDistance = Math.abs(fromIndex - toIndex);
    return baseFare + (stationDistance * perStationFare);
  };

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
    }
  }, [ticket]);

  // Load current journey on component mount
  useEffect(() => {
    const currentJourneyData = localStorage.getItem('currentJourney');
    if (currentJourneyData) {
      setJourney(JSON.parse(currentJourneyData));
    }
  }, []);

  const stationsState = useSelector((state) => state.stations);
  const stations = stationsState?.allItems || stationsState?.items || [];

  // Status logic for ticket actions
  const isActive = ticket?.status === 'Active' || ticket?.status === 'booked' || ticket?.status === 'active' || ticket?.status === 'confirmed';
  const isInProgress = ticket?.status === 'InProgress' || ticket?.status === 'in_progress' || ticket?.status === 'ongoing' || ticket?.status === 'started' || ticket?.status === 'tapped_in';
  const isCompleted = ticket?.status === 'Completed' || ticket?.status === 'completed' || ticket?.status === 'finished' || ticket?.status === 'ended';
  const isCancelled = ticket?.status === 'Cancelled' || ticket?.status === 'cancelled';

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
          // Continue with fallback stations if needed
        }
        
        // Try different API endpoints
        let ticketData = null;
        try {
          const res = await ticketAPI.getTicket(id);
          ticketData = res.data || res.ticket;
          
          // Ensure ticket has proper fields
          if (ticketData) {
            ticketData.price = ticketData.price || ticketData.amount || ticketData.fare || 25;
            ticketData.status = ticketData.status || 'Active';
            
            // Generate QR code data only for booked tickets
            if (ticketData.status === 'booked' || ticketData.status === 'Active') {
              const qrData = {
                ticketId: ticketData._id || ticketData.id,
                userId: ticketData.userId || ticketData.user,
                timestamp: Date.now(),
                type: 'ticket'
              };
              ticketData.qrCodeData = JSON.stringify(qrData);
            }
          }
        } catch (err) {
          console.warn('getTicket failed, using fallback data');
          ticketData = {
            id: id,
            _id: id,
            startStationId: 'station1',
            endStationId: 'station2', 
            price: 25,
            amount: 25,
            status: 'Active',
            createdAt: new Date().toISOString(),
            qrCodeData: JSON.stringify({
              ticketId: id,
              userId: 'user123',
              timestamp: Date.now(),
              type: 'ticket'
            })
          };
        }
        
        // Generate QR code if missing
        if (!ticketData.qrCode) {
          const qrData = {
            ticketId: ticketData.ticketId || ticketData._id || ticketData.id,
            userId: ticketData.userId,
            timestamp: Date.now(),
            type: 'ticket'
          };
          const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData));
          ticketData = {
            ...ticketData,
            qrCode: qrCodeDataUrl,
            qrData: JSON.stringify({
              ticketId: ticketData.ticketId || ticketData._id || ticketData.id,
              userId: ticketData.userId,
              timestamp: Date.now(),
              type: 'ticket'
            })
          };
        }
        
        setTicket(ticketData);
        
        // Check for journey data
        const journeyData = localStorage.getItem('currentJourney');
        if (journeyData) {
          setJourney(JSON.parse(journeyData));
        }
        
        // Check if returning from extend journey payment
        const urlParams = new URLSearchParams(window.location.search);
        const paymentSuccess = urlParams.get('extend_success');
        const newEndStationId = urlParams.get('newEndStationId');
        const newEndStationName = urlParams.get('newEndStationName');
        
        if (paymentSuccess === 'true' && newEndStationId && newEndStationName) {
          // Update ticket destination after successful extend payment
          ticketData = {
            ...ticketData,
            endStationId: newEndStationId,
            endStationName: newEndStationName,
            endStation: newEndStationName
          };
          setTicket(ticketData);
          
          // Clear URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
          
          Swal.fire({
            icon: 'success',
            title: 'Journey extended successfully!',
            text: `New destination: ${newEndStationName}\nYou can now tap out at the new destination.`,
            confirmButtonText: 'OK'
          });
        }
        
      } catch (err) {
        console.error('Error fetching ticket:', err);
        setError("Failed to load ticket details. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, dispatch]);

  const fromStation = (() => {
    // Debug ticket data structure
    console.log('Ticket data for station resolution:', {
      ticket,
      startStationId: ticket?.startStationId,
      startStationName: ticket?.startStationName,
      sourceStation: ticket?.sourceStation,
      fromStation: ticket?.fromStation,
      from: ticket?.from,
      stations: stations.length
    });

    // Try multiple approaches to find station name
    let stationName = "Unknown Station";
    
    // Method 1: Direct station name from ticket
    if (ticket?.startStationName) {
      stationName = ticket.startStationName;
      console.log('Found station name from ticket.startStationName:', stationName);
      return stationName;
    }
    
    if (ticket?.sourceStation) {
      stationName = ticket.sourceStation;
      console.log('Found station name from ticket.sourceStation:', stationName);
      return stationName;
    }
    
    if (ticket?.fromStation) {
      stationName = ticket.fromStation;
      console.log('Found station name from ticket.fromStation:', stationName);
      return stationName;
    }
    
    if (ticket?.from) {
      stationName = typeof ticket.from === 'string' ? ticket.from : ticket.from?.name;
      if (stationName && stationName !== 'Unknown Station') {
        console.log('Found station name from ticket.from:', stationName);
        return stationName;
      }
    }
    
    // Method 2: Find by station ID
    if (ticket?.startStationId && stations.length > 0) {
      let startStationId = ticket.startStationId;
      
      // Handle object IDs
      if (typeof startStationId === 'object' && startStationId !== null) {
        startStationId = startStationId._id || startStationId.id || startStationId.stop_id;
      }
      
      const foundStation = stations.find((s) => 
        (s.id || s._id) === startStationId || 
        s.stop_id === startStationId ||
        String(s._id) === String(startStationId) ||
        String(s.id) === String(startStationId)
      );
      
      if (foundStation) {
        stationName = foundStation.name || foundStation.station_name || foundStation.stop_name;
        console.log('Found station by ID:', { foundStation, stationName });
        return stationName;
      }
    }
    
    console.log('Could not resolve station name, using fallback');
    return "Unknown Station";
  })();

  const toStation = (() => {
    // Debug end station data
    console.log('End station data:', {
      endStationId: ticket?.endStationId,
      endStationName: ticket?.endStationName,
      destinationStation: ticket?.destinationStation,
      toStation: ticket?.toStation,
      to: ticket?.to
    });

    let stationName = "Unknown Station";
    
    // Method 1: Direct station name from ticket
    if (ticket?.endStationName) {
      return ticket.endStationName;
    }
    
    if (ticket?.destinationStation) {
      return ticket.destinationStation;
    }
    
    if (ticket?.toStation) {
      return ticket.toStation;
    }
    
    if (ticket?.to) {
      stationName = typeof ticket.to === 'string' ? ticket.to : ticket.to?.name;
      if (stationName && stationName !== 'Unknown Station') {
        return stationName;
      }
    }
    
    // Method 2: Find by station ID
    if (ticket?.endStationId && stations.length > 0) {
      let endStationId = ticket.endStationId;
      
      // Handle object IDs
      if (typeof endStationId === 'object' && endStationId !== null) {
        endStationId = endStationId._id || endStationId.id || endStationId.stop_id;
      }
      
      const foundStation = stations.find((s) => 
        (s.id || s._id) === endStationId || 
        s.stop_id === endStationId ||
        String(s._id) === String(endStationId) ||
        String(s.id) === String(endStationId)
      );
      
      if (foundStation) {
        return foundStation.name || foundStation.station_name || foundStation.stop_name;
      }
    }
    
    return "Unknown Station";
  })();

  // Get stations available for extending (stations after current end station)
  const getExtendStations = () => {
    if (stations.length === 0) return [];
    
    const currentEndId = String(ticket?.endStationId?._id || ticket?.endStationId?.id || ticket?.endStationId);
    return stations.filter(s => {
      const stationId = String(s._id || s.id);
      return stationId !== currentEndId;
    });
  };

  // Get stations available for early drop (only stations between start and end)
  const getEarlyDropStations = () => {
    if (stations.length === 0) return [];
    
    const startId = String(ticket?.startStationId?._id || ticket?.startStationId?.id || ticket?.startStationId);
    const endId = String(ticket?.endStationId?._id || ticket?.endStationId?.id || ticket?.endStationId);
    
    // Filter to get only intermediate stations (excluding start and end)
    return stations.filter(s => {
      const stationId = String(s._id || s.id);
      return stationId !== startId && stationId !== endId;
    });
  };

  // ===== Ticket Actions =====
  const handleCancel = async () => {
    // Prevent cancel if journey started
    if (isInProgress) {
      Swal.fire({
        icon: 'error',
        title: 'You cannot cancel after journey has started.',
        confirmButtonText: 'OK'
      });
      return;
    }
    if (!confirm("Are you sure you want to cancel this ticket?")) return;
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
          title: `Cancel failed: ${response.data.error}`,
          confirmButtonText: 'OK'
        });
      } else {
        // Add ticket amount to wallet
        if (ticket.price > 0) {
          try {
            const { walletAPI } = require('../api/api');
            await walletAPI.addToWallet({
              userId: user.id || user._id,
              amount: ticket.price,
              reason: 'Ticket cancelled refund',
              ticketId: ticket.ticketId || ticket._id || ticket.id
            });
            Swal.fire({
              icon: 'success',
              title: "Ticket cancelled and amount refunded to wallet!",
              confirmButtonText: 'OK'
            });
          } catch (walletError) {
            Swal.fire({
              icon: 'error',
              title: "Ticket cancelled, but failed to refund to wallet.",
              confirmButtonText: 'OK'
            });
          }
        } else {
          Swal.fire({
            icon: 'success',
            title: "Ticket cancelled successfully!",
            confirmButtonText: 'OK'
          });
        }
        setTicket({...ticket, status: 'Cancelled'});
        setTimeout(() => navigate('/tickets'), 1500);
      }
    } catch (error) {
      console.error('Cancel error:', error);
      const errorMsg = error.response?.data?.error || error.message || "Failed to cancel ticket";
      Swal.fire({
        icon: 'error',
        title: `Cancel failed: ${errorMsg}`,
        confirmButtonText: 'OK'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtendJourney = async () => {
    if (!selectedExtendStation) {
      setShowExtendDropdown(true);
      return;
    }

    if (!confirm(`Extend journey to ${selectedExtendStation.name}? Additional fare will be charged.`)) {
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
      
      console.log('Extend journey:', { currentEndStationId, newStationId, selectedStation: selectedExtendStation.name });
      
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
            autoTapOut: true // Flag to automatically tap out after payment
          }
        }
      });
      setIsExtendSelected(true);
    } catch (error) {
      console.error('Extend error:', error);
      Swal.fire({
        icon: 'error',
        title: "Failed to extend ticket. Please try again.",
        confirmButtonText: 'OK'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmExtend = async () => {
    if (selectedExtendStation) {
      setShowExtendDropdown(false);
      
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
      
      console.log('Extend journey fare calculation:', { 
        currentEndStationId, 
        newStationId, 
        selectedStation: selectedExtendStation.name,
        additionalFare,
        presentTicketId: ticket.ticketId || ticket._id || ticket.id
      });
      
      try {
        setActionLoading(true);
        
        // Call backend API to extend ticket
        const extendResponse = await ticketAPI.extendTicket({
          ticketId: ticket.ticketId || ticket._id || ticket.id,
          newEndStationId: newStationId,
          newEndStationName: selectedExtendStation.name,
          additionalFare: additionalFare
        });
        
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
          title: 'Journey Extended Successfully!',
          text: `New destination: ${selectedExtendStation.name}. Additional fare: ₹${additionalFare}`,
          confirmButtonText: 'OK'
        });
        
        setIsExtendSelected(true);
        
      } catch (error) {
        console.error('Extend ticket error:', error);
        
        // If backend fails, navigate to payment as fallback
        navigate('/payment', {
          state: {
            paymentInfo: {
              type: 'ticket',
              id: ticket.ticketId || ticket._id || ticket.id,
              userId: ticket.userId,
              amount: additionalFare,
              paymentMethod: "upi",
              description: `Extend journey to ${selectedExtendStation.name} (Additional fare: ₹${additionalFare})`,
              returnUrl: `/ticket-details/${ticket.ticketId || ticket._id || ticket.id}`
            }
          }
        });
        
        setIsExtendSelected(true);
      } finally {
        setActionLoading(false);
      }
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

    if (!confirm(`End your journey early at ${selectedEarlyDropStation.name}?\n\nReduced fare: ₹${earlyDropFare} (you save ₹${savings})\nOriginal fare to ${toStation}: ₹${originalFare}`)) {
      return;
    }

    try {
      setActionLoading(true);
      
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const currentJourneyData = JSON.parse(localStorage.getItem('currentJourney') || '{}');
      
      console.log('Early drop:', { 
        startStationId, 
        earlyDropStationId, 
        selectedStation: selectedEarlyDropStation.name,
        earlyDropFare,
        originalFare,
        savings
      });
      
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
        title: 'Early Drop Completed',
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
        title: `Failed to Early Drop: ${errorMsg}`,
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
      
      // Call backend API to process early drop
      const response = await ticketAPI.dropEarly({
        ticketId: ticket.ticketId || ticket._id || ticket.id,
        newEndStationId: selectedEarlyDropStation._id || selectedEarlyDropStation.id,
        newEndStationName: selectedEarlyDropStation.name,
        refundAmount: savings
      });
      
      console.log('Early drop response:', response.data);
      
      // Update ticket locally
      setTicket(prevTicket => ({
        ...prevTicket,
        endStationId: selectedEarlyDropStation._id || selectedEarlyDropStation.id,
        endStationName: selectedEarlyDropStation.name,
        endStation: selectedEarlyDropStation.name,
        price: earlyDropFare,
        refundAmount: savings,
        earlyDrop: true
      }));
      
      // Show success message with refund info
      setMessage(`Early drop successful! New destination: ${selectedEarlyDropStation.name}. Refund of ₹${savings} will be processed to your wallet.`);
      setMessageType('success');
      
      setIsEarlyDropSelected(true);
      setShowEarlyDropDropdown(false);
      
      // Stay on detail page - don't navigate away
      
    } catch (error) {
      console.error('Early drop error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to process early drop. Please try again.';
      setMessage(errorMessage);
      setMessageType('error');
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

      // Store journey information for tracking
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

      // Update ticket status
      setTicket(prev => ({
        ...prev,
        status: 'in_progress',
        tapInTime: new Date().toISOString(),
        tapInStation: startStation._id || startStation.id
      }));

      setMessage(`Successfully tapped in at ${startStation.name}!`);
      setMessageType('success');

    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || "Failed to tap in. Please try again.";
      Swal.fire({
        icon: 'error',
        title: 'Tap In Error',
        text: errorMessage,
        confirmButtonText: 'OK'
      });
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
          title: 'Ticket or station information missing. Please contact support.',
          confirmButtonText: 'OK'
        });
        setActionLoading(false);
        return;
      }
      
      // If stationId is not a valid ObjectId, try to find it by name
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;
      if (!objectIdRegex.test(stationId)) {
        console.log('End station ID not in ObjectId format, trying to find by name...');
        
        // Try to find station by name or other identifier
        const foundStation = stations.find(s => 
          s.name === toStation || 
          s.name === stationId ||
          (s.id || s._id) === stationId ||
          s.stop_id === stationId
        );
        
        if (foundStation) {
          stationId = String(foundStation._id || foundStation.id);
          console.log('Found end station by lookup:', stationId);
        } else {
          console.error('Could not find end station:', { stationId, toStation, stations });
          Swal.fire({
            icon: 'error',
            title: `Could not find station "${toStation}". Please refresh and try again.`,
            confirmButtonText: 'OK'
          });
          setActionLoading(false);
          return;
        }
      }
      
      // Final validation
      if (!objectIdRegex.test(stationId)) {
        console.error('Final end station ID still invalid:', stationId);
        Swal.fire({
          icon: 'error',
          title: 'Invalid station ID format. Please contact support.',
          confirmButtonText: 'OK'
        });
        setActionLoading(false);
        return;
      }
      
      console.log('Tap Out with:', { ticketId, stationId, userId: user.id || user._id });
      
      const response = await ticketAPI.tapOut({ 
        ticketId: ticketId,
        userId: String(user.id || user._id),
        stationId: stationId,
        timestamp: new Date().toISOString()
      });
      
      if (response?.data?.error) {
        Swal.fire({
          icon: 'error',
          title: `Tap Out failed: ${response.data.error}`,
          confirmButtonText: 'OK'
        });
      } else {
        // Complete journey tracking
        const completedJourney = {
          ...currentJourneyData,
          tapOutTime: new Date().toISOString(),
          actualFare: calculatedFare,
          status: 'completed',
          completedAt: new Date().toISOString()
        };
        
        // Add to journey history
        const existingJourneys = JSON.parse(localStorage.getItem('journeys') || '[]');
        existingJourneys.push(completedJourney);
        localStorage.setItem('journeys', JSON.stringify(existingJourneys));
        
        // Clear current journey
        localStorage.removeItem('currentJourney');
        setJourney(null);
        setFareCalculated(true);
        
        Swal.fire({
          icon: 'success',
          title: 'Tap Out Successful',
          confirmButtonText: 'OK'
        });
        setTicket({...ticket, status: 'completed', actualFare: calculatedFare});
      }
    } catch (error) {
      console.error('Tap Out error:', error);
      const errorMsg = error.response?.data?.error || error.message || "Failed to Tap Out";
      Swal.fire({
        icon: 'error',
        title: `Failed to Tap Out: ${errorMsg}`,
        confirmButtonText: 'OK'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // WhatsApp sharing functionality
  const handleWhatsAppShare = () => {
    const ticketDetails = `🎫 *Metro Ticket Details*\n\n` +
      `📍 *From:* ${fromStation}\n` +
      `📍 *To:* ${toStation}\n` +
      `💰 *Price:* ₹${ticket.price || 0}\n` +
      `📅 *Date:* ${new Date(ticket.createdAt).toLocaleDateString()}\n` +
      `🆔 *Ticket ID:* ${ticket.ticketId || ticket._id || ticket.id}\n` +
      `📊 *Status:* ${ticket.status}\n\n` +
      `🚇 SmartMetroCard - Your Digital Metro Companion`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(ticketDetails)}`;
    window.open(whatsappUrl, '_blank');
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
        title: 'Ticket details copied to clipboard!',
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
        title: 'Ticket details copied to clipboard!',
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
                  onClick={() => navigate('/tickets')}
                >
                  <i className="fas fa-arrow-left me-1"></i>Back
                </button>
              </div>
            </div>
            
            <div className="card-body p-4">
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
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="text-center mb-4">
                <h6 className="text-muted mb-3">QR Code for Entry</h6>
                <div className="qr-container p-3 border rounded bg-light">
                  <QRCode 
                    value={JSON.stringify({
                      ticketId: ticket.ticketId || ticket._id || ticket.id,
                      userId: ticket.userId || 'user123',
                      timestamp: Date.now(),
                      type: 'ticket',
                      status: ticket.status
                    })} 
                    size={200}
                    level="M"
                  />
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
                    >
                      <i className="fab fa-whatsapp me-2"></i>
                      Share via WhatsApp
                    </button>
                  </div>
                  <div className="col-md-6">
                    <button
                      onClick={() => handleCopyTicketDetails()}
                      className="btn btn-outline-primary w-100"
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
                        {actionLoading ? (
                          <span className="spinner-border spinner-border-sm me-2"></span>
                        ) : (
                          <i className="fas fa-sign-in-alt me-2"></i>
                        )}
                        Tap In at {fromStation}
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
                          <span className="spinner-border spinner-border-sm me-2"></span>
                        ) : (
                          <i className="fas fa-sign-out-alt me-2"></i>
                        )}
                        Tap Out at {toStation}
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
                          <span className="spinner-border spinner-border-sm me-2"></span>
                        ) : (
                          <i className="fas fa-times me-2"></i>
                        )}
                        Cancel Ticket
                      </button>
                    </div>
                  )}

                  {/* Extend Journey - only for active/in-progress tickets, not completed */}
                  {(isActive || isInProgress) && !isCompleted && (
                    <div className="col-md-6 col-sm-12">
                      <button
                        onClick={() => setShowExtendDropdown(true)}
                        disabled={actionLoading}
                        className="btn btn-info w-100"
                      >
                        {actionLoading ? (
                          <span className="spinner-border spinner-border-sm me-2"></span>
                        ) : (
                          <i className="fas fa-expand-arrows-alt me-2"></i>
                        )}
                        Extend Journey
                      </button>
                    </div>
                  )}

                  {/* Early Drop - only for active/in-progress tickets, not completed */}
                  {(isActive || isInProgress) && !isCompleted && (
                    <div className="col-md-6 col-sm-12">
                      <button
                        onClick={() => setShowEarlyDropDropdown(true)}
                        disabled={actionLoading}
                        className="btn btn-warning w-100"
                      >
                        {actionLoading ? (
                          <span className="spinner-border spinner-border-sm me-2"></span>
                        ) : (
                          <i className="fas fa-stop-circle me-2"></i>
                        )}
                        Early Drop
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showExtendDropdown && (
        <div className="modal fade show" style={{ display: 'block' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Extend Journey</h5>
                <button type="button" className="btn-close" onClick={() => setShowExtendDropdown(false)}></button>
              </div>
              <div className="modal-body">
                <p>Select a station to extend your journey:</p>
                <select className="form-select" onChange={(e) => setSelectedExtendStation(JSON.parse(e.target.value))}>
                  <option value="">Select Station</option>
                  {getExtendStations().map((station) => (
                    <option value={JSON.stringify(station)} key={station._id || station.id}>{station.name}</option>
                  ))}
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowExtendDropdown(false)}>Close</button>
                <button type="button" className="btn btn-primary" onClick={handleConfirmExtend}>Confirm</button>
                <button type="button" className="btn btn-success" onClick={handleTapOut}>Tap Out</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEarlyDropDropdown && (
        <div className="modal fade show" style={{ display: 'block' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Early Drop</h5>
                <button type="button" className="btn-close" onClick={() => setShowEarlyDropDropdown(false)}></button>
              </div>
              <div className="modal-body">
                <p>Select a station to end your journey early:</p>
                <select className="form-select" onChange={(e) => setSelectedEarlyDropStation(JSON.parse(e.target.value))}>
                  <option value="">Select Station</option>
                  {getEarlyDropStations().map((station) => (
                    <option value={JSON.stringify(station)} key={station._id || station.id}>{station.name}</option>
                  ))}
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEarlyDropDropdown(false)}>Close</button>
                <button type="button" className="btn btn-primary" onClick={handleConfirmEarlyDrop}>Confirm</button>
                <button type="button" className="btn btn-success" onClick={handleTapOut}>Tap Out</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPaymentOptions && paymentOptions && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Choose Payment Method</h5>
                <button type="button" className="btn-close" onClick={() => setShowPaymentOptions(false)}></button>
              </div>
              <div className="modal-body">
                <p className="mb-3">{paymentOptions.message}</p>
                
                {/* Subscription Options */}
                {paymentOptions.options && paymentOptions.options.find(opt => opt.type === 'subscription') && (
                  <div className="mb-4">
                    <h6 className="fw-bold text-primary">Use Active Subscription (Free)</h6>
                    {paymentOptions.options.find(opt => opt.type === 'subscription').subscriptions.map((sub) => (
                      <div key={sub.subscriptionId} className="card mb-2">
                        <div className="card-body p-3">
                          <div className="form-check">
                            <input 
                              className="form-check-input" 
                              type="radio" 
                              name="paymentMethod" 
                              value={`subscription-${sub.subscriptionId}`}
                              onChange={() => {
                                setSelectedPaymentMethod('subscription');
                                setSelectedSubscription(sub.subscriptionId);
                              }}
                            />
                            <label className="form-check-label">
                              <div className="d-flex justify-content-between align-items-center">
                                <div>
                                  <strong>{sub.planName}</strong>
                                  <br />
                                  <small className="text-muted">{sub.description}</small>
                                  <br />
                                  <small className="text-success">Valid until: {new Date(sub.validUntil).toLocaleDateString()}</small>
                                </div>
                                <span className="badge bg-success">₹0</span>
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Card Balance Option */}
                {paymentOptions.options && paymentOptions.options.find(opt => opt.type === 'balance') && (
                  <div className="mb-4">
                    <h6 className="fw-bold text-warning">Pay from Card Balance</h6>
                    <div className="card">
                      <div className="card-body p-3">
                        <div className="form-check">
                          <input 
                            className="form-check-input" 
                            type="radio" 
                            name="paymentMethod" 
                            value="balance"
                            onChange={() => {
                              setSelectedPaymentMethod('balance');
                              setSelectedSubscription(null);
                            }}
                          />
                          <label className="form-check-label">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <strong>Card Balance</strong>
                                <br />
                                <small className="text-muted">
                                  Current Balance: ₹{paymentOptions.card?.balance || 0}
                                </small>
                                <br />
                                <small className="text-info">Fare will be calculated at destination</small>
                              </div>
                              <span className="badge bg-warning">Pay as you go</span>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Direct Subscription Selection (for multiple subscriptions) */}
                {paymentOptions.subscriptions && (
                  <div className="mb-4">
                    <h6 className="fw-bold text-primary">Select Subscription</h6>
                    {paymentOptions.subscriptions.map((sub) => (
                      <div key={sub.subscriptionId} className="card mb-2">
                        <div className="card-body p-3">
                          <div className="form-check">
                            <input 
                              className="form-check-input" 
                              type="radio" 
                              name="subscription" 
                              value={sub.subscriptionId}
                              onChange={() => {
                                setSelectedPaymentMethod('subscription');
                                setSelectedSubscription(sub.subscriptionId);
                              }}
                            />
                            <label className="form-check-label">
                              <div className="d-flex justify-content-between align-items-center">
                                <div>
                                  <strong>{sub.planName}</strong> ({sub.planType})
                                  <br />
                                  <small className="text-muted">{sub.description}</small>
                                  <br />
                                  <small className="text-success">Valid until: {new Date(sub.validUntil).toLocaleDateString()}</small>
                                  {sub.benefits && sub.benefits.length > 0 && (
                                    <div>
                                      <small className="text-info">Benefits: {sub.benefits.join(', ')}</small>
                                    </div>
                                  )}
                                </div>
                                <span className="badge bg-success">Free</span>
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPaymentOptions(false)}>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleTapIn}
                  disabled={!selectedPaymentMethod && !selectedSubscription}
                >
                  Proceed with Tap In
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