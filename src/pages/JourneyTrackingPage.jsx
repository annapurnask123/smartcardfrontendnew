import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { 
  fetchJourneys, 
  setCurrentJourney, 
  updateJourneyProgress,
  completeJourney,
  fetchStationSequence
} from '../slices/journeySlice'
import { fetchStations } from '../slices/stationSlice'
import { stationAPI, cardAPI } from '../api/api'

function JourneyTrackingPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [currentLocation, setCurrentLocation] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [trackingEnabled, setTrackingEnabled] = useState(false)
  const [cardJourneys, setCardJourneys] = useState([])
  const [loading, setLoading] = useState(false)
  const [trainPosition, setTrainPosition] = useState(0)
  const [currentStationIndex, setCurrentStationIndex] = useState(0)
  const [journeyStations, setJourneyStations] = useState([])
  const [animationActive, setAnimationActive] = useState(false)
  const [timeToNextStation, setTimeToNextStation] = useState(60)
  
  const { 
    journeys, 
    currentJourney, 
    stationSequence, 
    tracking 
  } = useSelector(state => state.journeys)
  
  const { items: stations } = useSelector(state => state.stations)
  const user = useSelector(state => state.auth.user)

  useEffect(() => {
    dispatch(fetchJourneys())
    dispatch(fetchStations())
    fetchCardJourneys()
  }, [dispatch])

  // Fetch card journeys from virtual cards
  const fetchCardJourneys = async () => {
    try {
      setLoading(true)
      if (!user?.id && !user?._id) return

      const response = await cardAPI.getUserCards(user.id || user._id)
      const cards = response.data || []
      
      // Extract all journeys from all cards
      let allCardJourneys = []
      cards.forEach(card => {
        if (card.journeys && Array.isArray(card.journeys)) {
          const cardJourneysWithMeta = card.journeys.map(journey => ({
            ...journey,
            cardId: card._id || card.id,
            cardNumber: card.cardNumber,
            source: 'card',
            _id: `card-${card._id || card.id}-${journey.startedAt || Date.now()}`,
            status: journey.endTime ? 'completed' : 'in_progress',
            startTime: journey.startedAt,
            endTime: journey.endTime,
            startStation: journey.startStationName || journey.startStationId,
            endStation: journey.endStationName || journey.endStationId,
            fare: journey.fare || 0
          }))
          allCardJourneys = [...allCardJourneys, ...cardJourneysWithMeta]
        }

        // Add current journey if exists
        if (card.currentJourney) {
          allCardJourneys.push({
            ...card.currentJourney,
            cardId: card._id || card.id,
            cardNumber: card.cardNumber,
            source: 'card',
            _id: `card-current-${card._id || card.id}`,
            status: 'in_progress',
            startTime: card.currentJourney.startedAt,
            startStation: card.currentJourney.startStationName || card.currentJourney.startStationId,
            endStation: null,
            fare: 0
          })
        }
      })

      setCardJourneys(allCardJourneys)
    } catch (error) {
      console.error('Failed to fetch card journeys:', error)
      addNotification('Failed to load card journeys', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (trackingEnabled && currentJourney) {
      startLocationTracking()
      startJourneyUpdates()
    }
    return () => {
      stopLocationTracking()
      stopJourneyUpdates()
    }
  }, [trackingEnabled, currentJourney])

  useEffect(() => {
    if (animationActive) {
      const interval = setInterval(() => {
        if (timeToNextStation > 0) {
          setTimeToNextStation(timeToNextStation - 1)
        } else {
          setTimeToNextStation(60)
          setTrainPosition(trainPosition + 1)
          setCurrentStationIndex(currentStationIndex + 1)
        }
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [animationActive, timeToNextStation, trainPosition, currentStationIndex])

  // Initialize station sequence for a journey
  const initializeStationSequence = async (journey) => {
    if (!journey.startStation || !journey.endStation) return
    
    try {
      await dispatch(fetchStationSequence({
        startStationId: journey.startStation,
        endStationId: journey.endStation
      })).unwrap()
      
      // Find current position in the sequence
      const currentIndex = stationSequence.findIndex(
        id => id === journey.startStation || id === journey.currentStation
      )
      
      if (currentIndex >= 0) {
        // Update journey with initial progress
        const progress = (currentIndex / (stationSequence.length - 1)) * 100
        const updatedJourney = {
          ...journey,
          progress,
          currentStationIndex: currentIndex
        }
        
        dispatch(updateJourneyProgress(updatedJourney))
        localStorage.setItem('currentJourney', JSON.stringify(updatedJourney))
        
        setJourneyStations(stationSequence)
        setTrainPosition(currentIndex)
        setCurrentStationIndex(currentIndex)
        setAnimationActive(true)
      }
    } catch (error) {
      console.error('Error initializing station sequence:', error)
      addNotification('Error loading route information', 'error')
    }
  }

  function startLocationTracking() {
    if ('geolocation' in navigator) {
      navigator.geolocation.watchPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: new Date().toISOString()
          })
          checkNearbyStations(position.coords)
        },
        (error) => {
          console.error('Location tracking error:', error)
          addNotification('Location tracking failed', 'error')
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      )
    }
  }

  function stopLocationTracking() {
    // Clean up geolocation watchers if needed
  }

  function startJourneyUpdates() {
    const interval = setInterval(async () => {
      if (currentJourney && stationSequence.length > 0 && tracking) {
        await simulateJourneyProgress()
      }
    }, 30000) // Update every 30 seconds
    
    return () => clearInterval(interval)
  }

  function stopJourneyUpdates() {
    // Clean up intervals
  }

  const simulateJourneyProgress = async () => {
    // Move to next station if not at the end
    if (currentStationIndex < stationSequence.length - 1) {
      const nextIndex = currentStationIndex + 1
      
      // Update progress
      const progress = (nextIndex / (stationSequence.length - 1)) * 100
      
      // Update the current journey with new position
      const updatedJourney = {
        ...currentJourney,
        currentStation: stationSequence[nextIndex],
        progress,
        currentStationIndex: nextIndex
      }
      
      await dispatch(updateJourneyProgress(updatedJourney))
      localStorage.setItem('currentJourney', JSON.stringify(updatedJourney))
      
      // Get station name
      const station = stations.find(s => 
        s._id === stationSequence[nextIndex] || 
        s.stop_id === stationSequence[nextIndex] ||
        s.name === stationSequence[nextIndex]
      )
      
      if (station) {
        addNotification(`Arrived at ${station.name}`, 'info')
      }
      
      // If reached destination, complete the journey
      if (nextIndex === stationSequence.length - 1) {
        addNotification('Arrived at destination', 'success')
        await endJourney()
      }
    }
  }

  function checkNearbyStations(coords) {
    stations.forEach(station => {
      if (station.lat && station.lng) {
        const distance = calculateDistance(
          coords.latitude, coords.longitude,
          station.lat, station.lng
        )
        if (distance < 0.5) {
          addNotification(`Near ${station.name} - Ready to tap in/out`, 'info')
        }
      }
    })
  }

  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) ** 2
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  function addNotification(message, type = 'info') {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toISOString()
    }
    setNotifications(prev => [notification, ...prev.slice(0, 9)])
  }

  async function startJourney(journey) {
    // Convert completed journey to in_progress format
    const activeJourney = {
      ...journey,
      status: 'in_progress',
      currentStation: journey.startStation,
      progress: 0,
      currentStationIndex: 0
    }
    
    dispatch(setCurrentJourney(activeJourney))
    localStorage.setItem('currentJourney', JSON.stringify(activeJourney))
    
    // Initialize station sequence for this journey
    await initializeStationSequence(activeJourney)
    
    setTrackingEnabled(true)
    addNotification(`Journey started from ${journey.startStation} to ${journey.endStation}`, 'info')
  }

  async function endJourney() {
    if (currentJourney) {
      try {
        // Update the journey with completion details
        const completedJourney = {
          ...currentJourney,
          status: 'completed',
          endTime: new Date().toISOString()
        }
        
        await dispatch(completeJourney(completedJourney)).unwrap()
        addNotification('Journey completed successfully', 'success')
      } catch (error) {
        console.error('Error completing journey:', error)
        addNotification('Error completing journey', 'error')
      }
    }
    
    dispatch(setCurrentJourney(null))
    localStorage.removeItem('currentJourney')
    setTrackingEnabled(false)
    setAnimationActive(false)
  }

  // Filter and sort journeys
  const allJourneys = [...journeys, ...cardJourneys]
  const activeJourneys = allJourneys.filter(j => j.status === 'in_progress')
  const completedJourneys = allJourneys
    .filter(j => j.status === 'completed')
    .sort((a, b) => new Date(b.endTime || b.startTime) - new Date(a.endTime || a.startTime))
    .slice(0, 10) // Show 10 most recent

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="mb-0">
              <i className="fas fa-route me-2"></i>
              Journey Tracking
            </h2>
            <div className="d-flex gap-2">
              <button 
                className="btn btn-outline-primary btn-sm"
                onClick={fetchCardJourneys}
                disabled={loading}
              >
                <i className="fas fa-sync-alt me-1"></i>
                Refresh Card Journeys
              </button>
            </div>
          </div>

          {/* Animated Train Journey Tracking */}
          {animationActive && journeyStations.length > 0 && (
            <div className="card mb-4 border-primary">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">
                  <i className="fas fa-train me-2"></i>
                  Live Journey Progress
                </h5>
              </div>
              <div className="card-body">
                {/* Journey Info */}
                <div className="row mb-4">
                  <div className="col-md-6">
                    <h6>Current Journey</h6>
                    <p className="mb-1">
                      <strong>From:</strong> {journeyStations[0]?.name || 'Start Station'}
                    </p>
                    <p className="mb-1">
                      <strong>To:</strong> {journeyStations[journeyStations.length - 1]?.name || 'End Station'}
                    </p>
                    <p className="mb-0">
                      <strong>Stations Remaining:</strong> {journeyStations.length - currentStationIndex - 1}
                    </p>
                  </div>
                  <div className="col-md-6">
                    <h6>Next Station</h6>
                    <p className="mb-1">
                      <strong>Arriving at:</strong> {journeyStations[currentStationIndex + 1]?.name || 'Destination'}
                    </p>
                    <p className="mb-0">
                      <strong>Time to arrival:</strong> 
                      <span className="badge bg-info ms-2">
                        {Math.floor(timeToNextStation / 60)}:{(timeToNextStation % 60).toString().padStart(2, '0')}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Animated Train Track */}
                <div className="train-track-container mb-4">
                  <div className="train-track">
                    {/* Track Line */}
                    <div className="track-line"></div>
                    
                    {/* Station Markers */}
                    {journeyStations.map((station, index) => (
                      <div 
                        key={station._id || station.stop_id || index}
                        className={`station-marker ${index <= currentStationIndex ? 'passed' : ''} ${index === currentStationIndex ? 'current' : ''}`}
                        style={{ left: `${(index / (journeyStations.length - 1)) * 100}%` }}
                      >
                        <div className="station-dot"></div>
                        <div className="station-name">
                          {station.name || `Station ${index + 1}`}
                        </div>
                        {index === currentStationIndex && (
                          <div className="current-indicator">
                            <i className="fas fa-map-marker-alt"></i>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* Animated Train */}
                    <div 
                      className="train-icon"
                      style={{ 
                        left: `${(currentStationIndex / (journeyStations.length - 1)) * 100}%`,
                        transition: 'left 1s ease-in-out'
                      }}
                    >
                      <i className="fas fa-subway"></i>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="progress mb-3" style={{ height: '8px' }}>
                  <div 
                    className="progress-bar bg-success progress-bar-striped progress-bar-animated"
                    style={{ width: `${((currentStationIndex + 1) / journeyStations.length) * 100}%` }}
                  ></div>
                </div>
                
                <div className="text-center">
                  <small className="text-muted">
                    Progress: {currentStationIndex + 1} of {journeyStations.length} stations
                  </small>
                </div>

                {/* Journey Controls */}
                <div className="text-center mt-3">
                  <button 
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      setAnimationActive(false)
                      addNotification('Journey tracking stopped', 'info')
                    }}
                  >
                    <i className="fas fa-stop me-1"></i>
                    Stop Tracking
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {notifications.length > 0 && (
            <div className="notifications-container mb-4">
              {notifications.map(notification => (
                <div 
                  key={notification.id}
                  className={`alert alert-${notification.type === 'error' ? 'danger' : notification.type === 'success' ? 'success' : 'info'} alert-dismissible fade show`}
                >
                  <i className={`fas fa-${notification.type === 'error' ? 'exclamation-triangle' : notification.type === 'success' ? 'check-circle' : 'info-circle'} me-2`}></i>
                  {notification.message}
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                  ></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Journeys */}
      {activeJourneys.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">
            <h5>Active Journeys</h5>
          </div>
          <div className="card-body">
            {activeJourneys.map((journey) => (
              <div key={journey._id} className="border-bottom py-2">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>{journey.startStation} → {journey.endStation || 'In Progress'}</strong>
                    <br />
                    <small className="text-muted">
                      Started: {new Date(journey.startTime).toLocaleString()}
                      {journey.source === 'card' && (
                        <span className="badge bg-info ms-2">Card: {journey.cardNumber}</span>
                      )}
                      {journey.source !== 'card' && (
                        <span className="badge bg-success ms-2">Ticket</span>
                      )}
                    </small>
                  </div>
                  <div className="text-end">
                    <span className="badge bg-primary">In Progress</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Journey History */}
      <div className="card">
        <div className="card-header">
          <h5>Recent Journeys</h5>
        </div>
        <div className="card-body">
          {completedJourneys.length === 0 ? (
            <div className="text-center py-4">
              <i className="fas fa-route fa-2x text-muted mb-3"></i>
              <p className="text-muted">No journey history found</p>
            </div>
          ) : (
            completedJourneys.map((journey) => (
              <div key={journey._id} className="border-bottom py-2">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>{journey.startStation} → {journey.endStation}</strong>
                    <br />
                    <small className="text-muted">
                      {new Date(journey.startTime).toLocaleString()} - {journey.endTime ? new Date(journey.endTime).toLocaleString() : 'In Progress'}
                      {journey.fare && <span className="ms-2 badge bg-success">₹{journey.fare}</span>}
                      {journey.source === 'card' && (
                        <span className="badge bg-info ms-2">Card: {journey.cardNumber}</span>
                      )}
                      {journey.source !== 'card' && (
                        <span className="badge bg-success ms-2">Ticket</span>
                      )}
                    </small>
                  </div>
                  <div className="text-end">
                    <span className="badge bg-success">Completed</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CSS Styles for Train Animation */}
      <style jsx>{`
        .train-track-container {
          padding: 40px 20px;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 10px;
          position: relative;
          overflow: hidden;
        }

        .train-track {
          position: relative;
          height: 80px;
          margin: 20px 0;
        }

        .track-line {
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #6c757d 0%, #495057 50%, #6c757d 100%);
          transform: translateY(-50%);
          border-radius: 2px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .track-line::before {
          content: '';
          position: absolute;
          top: -2px;
          left: 0;
          right: 0;
          height: 8px;
          background: repeating-linear-gradient(
            90deg,
            transparent 0px,
            transparent 15px,
            #495057 15px,
            #495057 25px
          );
          border-radius: 4px;
        }

        .station-marker {
          position: absolute;
          top: 0;
          transform: translateX(-50%);
          text-align: center;
          z-index: 2;
        }

        .station-dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #6c757d;
          border: 3px solid #fff;
          margin: 0 auto 8px;
          position: relative;
          top: 32px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          transition: all 0.3s ease;
        }

        .station-marker.passed .station-dot {
          background: #28a745;
          transform: scale(1.1);
        }

        .station-marker.current .station-dot {
          background: #007bff;
          animation: pulse 2s infinite;
          transform: scale(1.2);
        }

        .station-name {
          font-size: 11px;
          font-weight: 600;
          color: #495057;
          background: rgba(255,255,255,0.9);
          padding: 4px 8px;
          border-radius: 12px;
          white-space: nowrap;
          max-width: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          margin-top: 8px;
        }

        .station-marker.current .station-name {
          background: #007bff;
          color: white;
          font-weight: 700;
        }

        .current-indicator {
          position: absolute;
          top: 15px;
          left: 50%;
          transform: translateX(-50%);
          color: #007bff;
          font-size: 18px;
          animation: bounce 1s infinite;
        }

        .train-icon {
          position: absolute;
          top: 20px;
          transform: translateX(-50%);
          z-index: 3;
          font-size: 24px;
          color: #dc3545;
          background: white;
          padding: 8px;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(220,53,69,0.4);
          animation: trainMove 1s ease-in-out;
        }

        @keyframes pulse {
          0% { transform: scale(1.2); box-shadow: 0 2px 6px rgba(0,123,255,0.3); }
          50% { transform: scale(1.3); box-shadow: 0 4px 12px rgba(0,123,255,0.6); }
          100% { transform: scale(1.2); box-shadow: 0 2px 6px rgba(0,123,255,0.3); }
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateX(-50%) translateY(0); }
          40% { transform: translateX(-50%) translateY(-8px); }
          60% { transform: translateX(-50%) translateY(-4px); }
        }

        @keyframes trainMove {
          0% { transform: translateX(-50%) scale(1); }
          50% { transform: translateX(-50%) scale(1.1); }
          100% { transform: translateX(-50%) scale(1); }
        }

        .notifications-container .alert {
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .progress-bar-animated {
          animation: progress-bar-stripes 1s linear infinite;
        }

        @keyframes progress-bar-stripes {
          0% { background-position: 1rem 0; }
          100% { background-position: 0 0; }
        }
      `}</style>
    </div>
  )
}

export default JourneyTrackingPage