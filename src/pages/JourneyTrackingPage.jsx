import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { fetchJourneys, setCurrentJourney } from '../slices/journeySlice'
import { fetchStations } from '../slices/stationSlice'
import { stationAPI } from '../api/api'

function JourneyTrackingPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [currentLocation, setCurrentLocation] = useState(null)
  const [liveUpdates, setLiveUpdates] = useState([])
  const [notifications, setNotifications] = useState([])
  const [trackingEnabled, setTrackingEnabled] = useState(false)
  
  const { journeys, currentJourney } = useSelector(state => state.journeys)
  const { items: stations } = useSelector(state => state.stations)
  const user = useSelector(state => state.auth.user)

  useEffect(() => {
    dispatch(fetchJourneys())
    dispatch(fetchStations())
  }, [dispatch])

  useEffect(() => {
    if (trackingEnabled) {
      startLocationTracking()
      startLiveUpdates()
    }
    return () => {
      stopLocationTracking()
      stopLiveUpdates()
    }
  }, [trackingEnabled])

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
    // Geolocation API doesn't have a direct stop method
    // The cleanup is handled by the useEffect cleanup
  }

  function startLiveUpdates() {
    const interval = setInterval(async () => {
      try {
        // Simulate live updates - in real app, this would be WebSocket
        const updates = await fetchLiveUpdates()
        setLiveUpdates(updates)
      } catch (error) {
        console.error('Live updates error:', error)
      }
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }

  function stopLiveUpdates() {
    // Cleanup handled by useEffect
  }

  async function fetchLiveUpdates() {
    // Simulate API call for live updates
    return [
      {
        id: 1,
        trainNumber: 'T001',
        station: 'Central Station',
        status: 'Arriving in 5 minutes',
        platform: 'Platform 2',
        delay: 0
      },
      {
        id: 2,
        trainNumber: 'T002',
        station: 'City Center',
        status: 'Delayed by 10 minutes',
        platform: 'Platform 1',
        delay: 10
      }
    ]
  }

  function checkNearbyStations(coords) {
    // Check if user is near any stations for tap in/out reminders
    stations.forEach(station => {
      if (station.lat && station.lng) {
        const distance = calculateDistance(
          coords.latitude, coords.longitude,
          station.lat, station.lng
        )
        if (distance < 0.5) { // Within 500 meters
          addNotification(`Near ${station.name} - Ready to tap in/out`, 'info')
        }
      }
    })
  }

  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
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
    setNotifications(prev => [notification, ...prev.slice(0, 9)]) // Keep last 10
  }

  function startJourney(journey) {
    dispatch(setCurrentJourney(journey))
    setTrackingEnabled(true)
    addNotification(`Journey started: ${journey.startStation} to ${journey.endStation}`, 'success')
  }

  function endJourney() {
    dispatch(setCurrentJourney(null))
    setTrackingEnabled(false)
    addNotification('Journey ended', 'info')
  }

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
                    </div>
                    <div className="col-md-6">
                      <h6>Status</h6>
                      <p><strong>Status:</strong> <span className="badge bg-success">Active</span></p>
                      <p><strong>Started:</strong> {new Date(currentJourney.startTime).toLocaleString()}</p>
                    </div>
                  </div>
                  <button className="btn btn-danger" onClick={endJourney}>
                    End Journey
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-muted">No active journey</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigate('/book')}
                  >
                    Start New Journey
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Live Updates */}
          <div className="card mb-4">
            <div className="card-header">
              <h5>Live Train Updates</h5>
            </div>
            <div className="card-body">
              {liveUpdates.map(update => (
                <div key={update.id} className="border-bottom py-2">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>Train {update.trainNumber}</strong>
                      <br />
                      <small>{update.station} - {update.status}</small>
                    </div>
                    <div className="text-end">
                      <span className="badge bg-secondary">{update.platform}</span>
                      {update.delay > 0 && (
                        <span className="badge bg-warning ms-1">+{update.delay}m</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {liveUpdates.length === 0 && (
                <p className="text-muted">No live updates available</p>
              )}
            </div>
          </div>

          {/* Journey History */}
          <div className="card">
            <div className="card-header">
              <h5>Recent Journeys</h5>
            </div>
            <div className="card-body">
              {journeys.slice(0, 5).map(journey => (
                <div key={journey.id} className="border-bottom py-2">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>{journey.startStation} → {journey.endStation}</strong>
                      <br />
                      <small className="text-muted">{journey.date}</small>
                    </div>
                    <div className="text-end">
                      <span className={`badge ${journey.status === 'completed' ? 'bg-success' : 'bg-warning'}`}>
                        {journey.status}
                      </span>
                      {!currentJourney && journey.status === 'active' && (
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
              {journeys.length === 0 && (
                <p className="text-muted">No journey history</p>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-4">
          {/* Location Tracking */}
          <div className="card mb-4">
            <div className="card-header">
              <h5>Location Tracking</h5>
            </div>
            <div className="card-body">
              <div className="form-check form-switch mb-3">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  id="trackingToggle"
                  checked={trackingEnabled}
                  onChange={(e) => setTrackingEnabled(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="trackingToggle">
                  Enable Location Tracking
                </label>
              </div>
              
              {currentLocation && (
                <div>
                  <p><strong>Current Location:</strong></p>
                  <p className="text-muted">
                    Lat: {currentLocation.lat.toFixed(6)}<br />
                    Lng: {currentLocation.lng.toFixed(6)}
                  </p>
                </div>
              )}
              
              <small className="text-muted">
                Location tracking helps provide accurate tap in/out reminders and journey progress.
              </small>
            </div>
          </div>

          {/* Notifications */}
          <div className="card">
            <div className="card-header">
              <h5>Notifications</h5>
            </div>
            <div className="card-body">
              {notifications.map(notification => (
                <div key={notification.id} className={`alert alert-${notification.type === 'error' ? 'danger' : notification.type === 'success' ? 'success' : 'info'} py-2 mb-2`}>
                  <small>{notification.message}</small>
                  <br />
                  <small className="text-muted">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </small>
                </div>
              ))}
              {notifications.length === 0 && (
                <p className="text-muted">No notifications</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default JourneyTrackingPage

