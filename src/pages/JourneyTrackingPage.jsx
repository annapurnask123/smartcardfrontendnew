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
import { stationAPI } from '../api/api'

function JourneyTrackingPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [currentLocation, setCurrentLocation] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [trackingEnabled, setTrackingEnabled] = useState(false)
  
  const { 
    journeys, 
    currentJourney, 
    stationSequence, 
    currentStationIndex,
    tracking 
  } = useSelector(state => state.journeys)
  
  const { items: stations } = useSelector(state => state.stations)
  const user = useSelector(state => state.auth.user)

  useEffect(() => {
    dispatch(fetchJourneys())
    dispatch(fetchStations())
  }, [dispatch])

  useEffect(() => {
    // Check for active journey in localStorage on component mount
    const storedJourney = JSON.parse(localStorage.getItem('currentJourney') || 'null')
    if (storedJourney && storedJourney.status === 'in_progress') {
      dispatch(setCurrentJourney(storedJourney))
      initializeStationSequence(storedJourney)
      setTrackingEnabled(true)
    }
  }, [dispatch])

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
  }

  // Filter and sort journeys
  const activeJourneys = journeys.filter(j => j.status === 'in_progress')
  const completedJourneys = journeys
    .filter(j => j.status === 'completed')
    .sort((a, b) => new Date(b.endTime) - new Date(a.endTime))
    .slice(0, 5) // Show only 5 most recent

  return (
    <div className="container mt-5 pt-5">
      <h2><i className="fas fa-map-marked-alt me-2"></i>Journey Tracking</h2>
      
      <div className="row">
        <div className="col-md-8">
          {/* Current Journey */}
          <div className="card mb-4">
            <div className="card-header">
              <h5>Current Journey</h5>
            </div>
            <div className="card-body">
              {currentJourney ? (
                <div>
                  <div className="row">
                    <div className="col-md-6">
                      <h6>Route</h6>
                      <p><strong>From:</strong> {currentJourney.startStation}</p>
                      <p><strong>To:</strong> {currentJourney.endStation}</p>
                      {stationSequence.length > 0 && (
                        <div className="mt-3">
                          <h6>Route Path</h6>
                          <div className="route-path">
                            {stationSequence.map((stationId, index) => {
                              const station = stations.find(s => 
                                s._id === stationId || s.stop_id === stationId || s.name === stationId
                              )
                              return (
                                <div 
                                  key={index} 
                                  className={`d-flex align-items-center ${index <= currentStationIndex ? 'text-success' : 'text-muted'}`}
                                >
                                  <div className={`me-2 ${index <= currentStationIndex ? 'text-success' : 'text-secondary'}`}>
                                    {index <= currentStationIndex ? '✓' : '○'}
                                  </div>
                                  <div>
                                    {station?.name || `Station ${stationId}`}
                                    {index === currentStationIndex && <span className="badge bg-primary ms-2">Current</span>}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <h6>Status</h6>
                      <p><strong>Status:</strong> <span className="badge bg-success">Active</span></p>
                      <p><strong>Started:</strong> {new Date(currentJourney.startTime).toLocaleString()}</p>
                      {currentJourney.progress > 0 && (
                        <div className="mt-3">
                          <strong>Progress:</strong>
                          <div className="progress mt-2">
                            <div 
                              className="progress-bar bg-success" 
                              role="progressbar" 
                              style={{ width: `${currentJourney.progress}%` }} 
                              aria-valuenow={currentJourney.progress} 
                              aria-valuemin="0" 
                              aria-valuemax="100"
                            >
                              {Math.round(currentJourney.progress)}%
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <button className="btn btn-danger mt-3" onClick={endJourney}>
                    <i className="fas fa-stop-circle me-2"></i>End Journey
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-muted">No active journey</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigate('/book')}
                  >
                    <i className="fas fa-ticket-alt me-2"></i>Book a Ticket
                  </button>
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
                        <strong>{journey.startStation} → {journey.endStation}</strong>
                        <br />
                        <small className="text-muted">
                          Started: {new Date(journey.startTime).toLocaleString()}
                        </small>
                        {journey.progress > 0 && (
                          <div className="progress mt-2" style={{height: '8px', width: '200px'}}>
                            <div 
                              className="progress-bar bg-primary" 
                              role="progressbar" 
                              style={{ width: `${journey.progress}%` }} 
                            />
                          </div>
                        )}
                      </div>
                      <div className="text-end">
                        <span className="badge bg-primary">In Progress</span>
                        {!currentJourney && (
                          <button 
                            className="btn btn-sm btn-primary ms-2"
                            onClick={() => startJourney(journey)}
                          >
                            Resume
                          </button>
                        )}
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
                          {new Date(journey.startTime).toLocaleString()} - {new Date(journey.endTime).toLocaleString()}
                          {journey.fare && <span className="ms-2 badge bg-success">₹{journey.fare}</span>}
                          {journey.distance && <span className="ms-2 badge bg-info">{journey.distance}</span>}
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
        </div>

        <div className="col-md-4">
          {/* Notifications Panel */}
          <div className="card mb-4">
            <div className="card-header">
              <h5>Notifications</h5>
            </div>
            <div className="card-body" style={{maxHeight: '300px', overflowY: 'auto'}}>
              {notifications.length === 0 ? (
                <p className="text-muted">No notifications</p>
              ) : (
                notifications.map(notification => (
                  <div 
                    key={notification.id} 
                    className={`alert alert-${notification.type === 'error' ? 'danger' : notification.type === 'success' ? 'success' : 'info'} py-2 mb-2`}
                  >
                    <div className="d-flex justify-content-between">
                      <span>{notification.message}</span>
                      <small>{new Date(notification.timestamp).toLocaleTimeString()}</small>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Current Location */}
          <div className="card">
            <div className="card-header">
              <h5>Current Location</h5>
            </div>
            <div className="card-body">
              {currentLocation ? (
                <div>
                  <p><strong>Latitude:</strong> {currentLocation.lat.toFixed(6)}</p>
                  <p><strong>Longitude:</strong> {currentLocation.lng.toFixed(6)}</p>
                  <p><strong>Last Updated:</strong> {new Date(currentLocation.timestamp).toLocaleTimeString()}</p>
                </div>
              ) : (
                <p className="text-muted">Location not available</p>
              )}
              <div className="form-check form-switch">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  checked={trackingEnabled}
                  onChange={(e) => setTrackingEnabled(e.target.checked)}
                />
                <label className="form-check-label">
                  Enable Tracking
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default JourneyTrackingPage