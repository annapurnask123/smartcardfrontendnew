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
  
  const { journeys: reduxJourneys, currentJourney } = useSelector(state => state.journeys)
  const { items: stations } = useSelector(state => state.stations)
  const user = useSelector(state => state.auth.user)
  
  // Get journeys from localStorage
  const [localJourneys, setLocalJourneys] = useState([])

  useEffect(() => {
    const storedJourneys = JSON.parse(localStorage.getItem('journeys') || '[]')
    setLocalJourneys(storedJourneys)
    
    dispatch(fetchJourneys())
    dispatch(fetchStations())
  }, [dispatch])

  // Combine Redux and localStorage journeys with station name resolution
  const [resolvedJourneys, setResolvedJourneys] = useState([])

  useEffect(() => {
    const fetchJourneys = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) return

        // Fetch user journeys from multiple sources
        const [userJourneysResponse, ticketsResponse] = await Promise.all([
          stationAPI.get('/user-journeys', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          stationAPI.get('/tickets/user', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ])

        let allJourneys = []
        
        // Add user journeys
        if (userJourneysResponse.data) {
          allJourneys = [...userJourneysResponse.data]
        }
        
        // Add ticket-based journeys (including in-progress tickets)
        if (ticketsResponse.data) {
          const ticketJourneys = ticketsResponse.data
            .filter(ticket => ticket.status === 'in_progress' || ticket.tapInTime)
            .map(ticket => ({
              _id: ticket._id,
              user: ticket.userId,
              ticket: ticket._id,
              currentStation: ticket.tapInStation,
              destinationStation: ticket.tapOutStation || ticket.endStationId,
              startTime: ticket.tapInTime,
              endTime: ticket.tapOutTime,
              status: ticket.status === 'completed' ? 'completed' : 
                     ticket.status === 'in_progress' ? 'in_progress' : 'pending',
              planned_route: [],
              isTicketJourney: true,
              ticketData: ticket
            }))
          
          allJourneys = [...allJourneys, ...ticketJourneys]
        }

        // Process journeys with station name resolution
        const processedJourneys = await Promise.all(
          allJourneys.map(async (journey) => {
            // Enhanced station name resolution
            const resolveStationName = (stationId) => {
              if (!stationId) return 'Unknown Station'
              
              // Try to find station by multiple ID fields
              const station = stations.find(s => 
                s._id === stationId || 
                s.stop_id === stationId || 
                String(s._id) === String(stationId) ||
                String(s.stop_id) === String(stationId)
              )
              return station?.name || `Station ${stationId}`
            }

            // Calculate journey progress for active journeys
            let progress = 0
            if (journey.status === 'in_progress' && journey.startTime) {
              const startTime = new Date(journey.startTime)
              const now = new Date()
              const elapsed = (now - startTime) / (1000 * 60) // minutes
              progress = Math.min(elapsed / 30 * 100, 95) // Assume 30min journey, max 95%
            }

            return {
              ...journey,
              currentStationName: resolveStationName(journey.currentStation),
              destinationStationName: resolveStationName(journey.destinationStation),
              progress,
              formattedStartTime: journey.startTime ? new Date(journey.startTime).toLocaleString() : 'N/A',
              formattedEndTime: journey.endTime ? new Date(journey.endTime).toLocaleString() : 'N/A'
            }
          })
        )

        // Sort journeys - in-progress first, then by start time
        const sortedJourneys = processedJourneys.sort((a, b) => {
          if (a.status === 'in_progress' && b.status !== 'in_progress') return -1
          if (b.status === 'in_progress' && a.status !== 'in_progress') return 1
          return new Date(b.startTime || 0) - new Date(a.startTime || 0)
        })

        setResolvedJourneys(sortedJourneys)
        
        // Set current journey if there's an in-progress one
        const activeJourney = sortedJourneys.find(j => j.status === 'in_progress')
        if (activeJourney && !currentJourney) {
          dispatch(setCurrentJourney(activeJourney))
        }

      } catch (error) {
        console.error('Error fetching journeys:', error)
      }
    }

    fetchJourneys()
  }, [stations, currentJourney, dispatch])

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

  function stopLocationTracking() { }

  function startLiveUpdates() {
    const interval = setInterval(async () => {
      try {
        const updates = await fetchLiveUpdates()
        setLiveUpdates(updates)
      } catch (error) {
        console.error('Live updates error:', error)
      }
    }, 30000)
    return () => clearInterval(interval)
  }

  function stopLiveUpdates() { }

  async function fetchLiveUpdates() {
    return [
      {
        id: 1,
        trainNumber: 'T001',
        station: 'Central Station',
        status: 'Arriving in 5 minutes',
        platform: 'Platform 2',
        delay: 0,
        path: ['Station A', 'Station B', 'Central Station', 'Station C']
      },
      {
        id: 2,
        trainNumber: 'T002',
        station: 'City Center',
        status: 'Delayed by 10 minutes',
        platform: 'Platform 1',
        delay: 10,
        path: ['Station D', 'City Center', 'Station E']
      }
    ]
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

  function startJourney(journey) {
    const resolved = resolvedJourneys.find(
      j => j.id === journey.id || j.ticketId === journey.ticketId
    ) || journey;

    dispatch(setCurrentJourney(resolved))
    localStorage.setItem('currentJourney', JSON.stringify(resolved))
    setTrackingEnabled(true)
    addNotification(`Journey resumed from ${resolved.startStationName || resolved.startStation} to ${resolved.endStationName || resolved.endStation}`, 'info')
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
                      <p><strong>From:</strong> {currentJourney.startStationName || currentJourney.startStation}</p>
                      <p><strong>To:</strong> {currentJourney.endStationName || currentJourney.endStation}</p>
                    </div>
                    <div className="col-md-6">
                      <h6>Status</h6>
                      <p><strong>Status:</strong> <span className="badge bg-success">Active</span></p>
                      <p><strong>Started:</strong> {new Date(currentJourney.startTime).toLocaleString()}</p>
                      {currentJourney.trackingPath && (
                        <p><strong>Path:</strong> {currentJourney.trackingPath.join(' → ')}</p>
                      )}
                      {currentJourney.progress && (
                        <div className="progress mt-2">
                          <div className="progress-bar bg-success" role="progressbar" style={{ width: `${currentJourney.progress}%` }} aria-valuenow={currentJourney.progress} aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                      )}
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
                      {update.path && <br />}
                      {update.path && <small className="text-muted">Path: {update.path.join(' → ')}</small>}
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
              {resolvedJourneys.length === 0 ? (
                <div className="text-center py-4">
                  <i className="fas fa-route fa-2x text-muted mb-3"></i>
                  <p className="text-muted">No journey history found</p>
                </div>
              ) : (
                resolvedJourneys.slice(0, 5).map((journey, index) => (
                  <div key={journey.id || journey.ticketId || index} className="border-bottom py-2">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{journey.startStationName || journey.startStation || 'Unknown'} → {journey.endStationName || journey.endStation || 'Unknown'}</strong>
                        <br />
                        <small className="text-muted">
                          {journey.formattedStartTime}
                          {journey.actualFare && <span className="ms-2 badge bg-success">₹{journey.actualFare}</span>}
                          {journey.cardNumber && <span className="ms-2 badge bg-info">Card: {journey.cardNumber}</span>}
                          {journey.earlyDrop && <span className="ms-1 badge bg-warning">Early Drop</span>}
                        </small>
                        {journey.trackingPath && <p className="text-muted small mb-0">Path: {journey.trackingPath.join(' → ')}</p>}
                        {journey.progress && (
                          <div className="progress mt-2">
                            <div className="progress-bar bg-success" role="progressbar" style={{ width: `${journey.progress}%` }} aria-valuenow={journey.progress} aria-valuemin="0" aria-valuemax="100"></div>
                          </div>
                        )}
                      </div>
                      <div className="text-end">
                        <span className={`badge ${journey.status === 'completed' ? 'bg-success' : journey.status === 'in_progress' ? 'bg-primary' : 'bg-warning'}`}>
                          {journey.status === 'in_progress' ? 'In Progress' : journey.status}
                        </span>
                        {!currentJourney && journey.status === 'in_progress' && (
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
                ))
              )}
            </div>
          </div>
        </div>

        <div className="col-md-4">
          {/* Location Tracking & Notifications */}
          {/* Keep your existing location tracking and notifications code as-is */}
        </div>
      </div>
    </div>
  )
}

export default JourneyTrackingPage
