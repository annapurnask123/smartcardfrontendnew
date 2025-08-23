import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { fetchStations } from '../slices/stationSlice'
import { routeAPI, ticketAPI } from '../api/api'

function MultiRouteBookingPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const stationsState = useSelector(state => state.stations)
  const stations = stationsState?.allItems || stationsState?.items || []
  const user = useSelector(state => state.auth.user)

  const [sourceId, setSourceId] = useState('')
  const [destinationId, setDestinationId] = useState('')
  const [passengers, setPassengers] = useState(1)
  const [routes, setRoutes] = useState([])
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchPerformed, setSearchPerformed] = useState(false)

  useEffect(() => {
    if (!stations || stations.length === 0) {
      dispatch(fetchStations())
    }
  }, [stations, dispatch])

  const searchRoutes = async () => {
    if (!sourceId || !destinationId || sourceId === destinationId) {
      setError('Please select valid source and destination stations')
      return
    }

    setLoading(true)
    setError('')
    setSearchPerformed(true)
    
    try {
      const response = await routeAPI.findRoutes({
        startStationId: sourceId,
        endStationId: destinationId,
        includeConnections: true
      })
      
      const routeData = response.data || response.routes || []
      setRoutes(Array.isArray(routeData) ? routeData : [])
    } catch (err) {
      console.error('Failed to find routes:', err)
      setError('Failed to find routes. Please try again.')
      setRoutes([])
    } finally {
      setLoading(false)
    }
  }

  const generateConnectingRoutes = async (sourceId, destinationId) => {
    // Find potential intermediate stations for connections
    const sourceStation = stations.find(s => s._id === sourceId)
    const destStation = stations.find(s => s._id === destinationId)
    
    if (!sourceStation || !destStation) return []
    
    // Generate connecting routes through major interchange stations
    const interchangeStations = stations.filter(s => 
      s.isInterchange || s.type === 'interchange' || 
      (s.name && (s.name.includes('Central') || s.name.includes('Junction')))
    )
    
    const connectingRoutes = []
    
    for (const interchange of interchangeStations.slice(0, 3)) { // Limit to 3 options
      if (interchange._id === sourceId || interchange._id === destinationId) continue
      
      const route = {
        id: `route-${sourceId}-${interchange._id}-${destinationId}`,
        type: 'connecting',
        totalDuration: Math.floor(Math.random() * 60) + 45, // 45-105 minutes
        totalFare: Math.floor(Math.random() * 30) + 25, // ₹25-55
        legs: [
          {
            id: `leg1-${sourceId}-${interchange._id}`,
            from: sourceStation.name,
            to: interchange.name,
            fromId: sourceId,
            toId: interchange._id,
            duration: Math.floor(Math.random() * 30) + 15, // 15-45 minutes
            fare: Math.floor(Math.random() * 15) + 10, // ₹10-25
            trainNumber: `TR${Math.floor(Math.random() * 9000) + 1000}`,
            departure: generateRandomTime(),
            arrival: generateRandomTime(30)
          },
          {
            id: `leg2-${interchange._id}-${destinationId}`,
            from: interchange.name,
            to: destStation.name,
            fromId: interchange._id,
            toId: destinationId,
            duration: Math.floor(Math.random() * 30) + 15, // 15-45 minutes
            fare: Math.floor(Math.random() * 15) + 10, // ₹10-25
            trainNumber: `TR${Math.floor(Math.random() * 9000) + 1000}`,
            departure: generateRandomTime(45),
            arrival: generateRandomTime(75),
            waitTime: Math.floor(Math.random() * 10) + 5 // 5-15 minutes wait
          }
        ]
      }
      
      connectingRoutes.push(route)
    }
    
    return connectingRoutes
  }
  
  const generateRandomTime = (offsetMinutes = 0) => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + offsetMinutes + Math.floor(Math.random() * 30))
    return now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }

  const bookSelectedRoute = async () => {
    if (!selectedRoute || !user?.id) {
      setError('Please select a route and ensure you are logged in')
      return
    }

    setLoading(true)
    setError('')

    try {
      const bookingPayload = {
        userId: user.id || user._id,
        routeId: selectedRoute.id || selectedRoute._id,
        startStationId: sourceId,
        endStationId: destinationId,
        passengerCount: passengers,
        connections: selectedRoute.connections || [],
        totalFare: selectedRoute.totalFare || calculateRouteFare(selectedRoute)
      }

      const response = await ticketAPI.bookMultiRouteTicket(bookingPayload)
      const ticket = response.data.ticket || response.data.tickets?.[0]

      if (!ticket) {
        throw new Error('Ticket creation failed')
      }

      const paymentInfo = {
        type: 'ticket',
        amount: ticket.amount || selectedRoute.totalFare,
        id: ticket.id || ticket._id,
        booking: {
          sourceId,
          destinationId,
          passengerCount: passengers,
          journeyType: 'multi-route',
          sourceName: stations.find(s => s._id === sourceId)?.name || 'Unknown',
          destinationName: stations.find(s => s._id === destinationId)?.name || 'Unknown',
          route: selectedRoute
        }
      }

      navigate('/payment', { state: { paymentInfo } })
    } catch (err) {
      console.error('Failed to book route:', err)
      setError('Failed to book route. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const calculateRouteFare = (route) => {
    const baseFare = 25
    const connectionFee = 5
    const segments = (route.connections?.length || 0) + 1
    return (baseFare * segments + connectionFee * (segments - 1)) * passengers
  }

  const getStationName = (stationId) => {
    return stations.find(s => s._id === stationId || s.id === stationId)?.name || 'Unknown Station'
  }

  const handleSearchRoutes = async () => {
    await searchRoutes()
    const connectingRoutes = await generateConnectingRoutes(sourceId, destinationId)
    setRoutes([...routes, ...connectingRoutes])
  }

  return (
    <div className="container mt-5 pt-5">
      <div className="row">
        <div className="col-12">
          <h2 className="mb-4">
            <i className="fas fa-route text-primary me-2"></i>
            Multi-Route Journey Planner
          </h2>

          {/* Search Form */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">From Station</label>
                  <select 
                    className="form-select" 
                    value={sourceId} 
                    onChange={(e) => setSourceId(e.target.value)}
                  >
                    <option value="">Select source station...</option>
                    {stations.map(station => (
                      <option key={station._id || station.id} value={station._id || station.id}>
                        {station.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">To Station</label>
                  <select 
                    className="form-select" 
                    value={destinationId} 
                    onChange={(e) => setDestinationId(e.target.value)}
                  >
                    <option value="">Select destination station...</option>
                    {stations.map(station => (
                      <option key={station._id || station.id} value={station._id || station.id}>
                        {station.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Passengers</label>
                  <select 
                    className="form-select" 
                    value={passengers} 
                    onChange={(e) => setPassengers(parseInt(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5].map(n => (
                      <option key={n} value={n}>
                        {n} Passenger{n > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="row mt-3">
                <div className="col-12">
                  <button 
                    className="btn btn-primary"
                    onClick={handleSearchRoutes}
                    disabled={loading || !sourceId || !destinationId}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Searching Routes...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-search me-2"></i>
                        Find Routes
                      </>
                    )}
                  </button>
                </div>
              </div>
              {error && (
                <div className="alert alert-danger mt-3 mb-0">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Route Results */}
          {searchPerformed && (
            <div className="card">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">
                  <i className="fas fa-map-marked-alt me-2"></i>
                  Available Routes
                </h5>
              </div>
              <div className="card-body">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-3">Finding best routes...</p>
                  </div>
                ) : routes.length === 0 ? (
                  <div className="text-center py-4">
                    <i className="fas fa-route fa-3x text-muted mb-3"></i>
                    <h5 className="text-muted">No routes found</h5>
                    <p className="text-muted">
                      No connecting routes available between selected stations.
                    </p>
                  </div>
                ) : (
                  <div className="row">
                    {routes.map((route, index) => (
                      <div key={route.id || index} className="col-lg-6 mb-3">
                        <div 
                          className={`card h-100 ${selectedRoute?.id === route.id ? 'border-primary' : ''}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedRoute(route)}
                        >
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start mb-3">
                              <h6 className="card-title mb-0">
                                Route {index + 1}
                                {selectedRoute?.id === route.id && (
                                  <i className="fas fa-check-circle text-primary ms-2"></i>
                                )}
                              </h6>
                              <div className="text-end">
                                <div className="h5 text-primary mb-0">
                                  ₹{route.totalFare || calculateRouteFare(route)}
                                </div>
                                <small className="text-muted">per person</small>
                              </div>
                            </div>

                            {/* Route Path */}
                            <div className="route-path mb-3">
                              <div className="d-flex align-items-center">
                                <div className="route-station">
                                  <i className="fas fa-circle text-success"></i>
                                  <span className="ms-2">{getStationName(sourceId)}</span>
                                </div>
                              </div>
                              
                              {route.legs && route.legs.map((leg, idx) => (
                                <div key={idx}>
                                  <div className="route-line"></div>
                                  <div className="d-flex align-items-center">
                                    <div className="route-station">
                                      <i className="fas fa-exchange-alt text-warning"></i>
                                      <span className="ms-2">{leg.to}</span>
                                      <small className="text-muted ms-2">
                                        (Change to {leg.trainNumber || 'Line'})
                                      </small>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              
                              <div className="route-line"></div>
                              <div className="d-flex align-items-center">
                                <div className="route-station">
                                  <i className="fas fa-circle text-danger"></i>
                                  <span className="ms-2">{getStationName(destinationId)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Route Info */}
                            <div className="row text-muted small">
                              <div className="col-6">
                                <i className="fas fa-clock me-1"></i>
                                {route.totalDuration || '~45 min'}
                              </div>
                              <div className="col-6">
                                <i className="fas fa-exchange-alt me-1"></i>
                                {route.legs?.length || 0} changes
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedRoute && (
                  <div className="text-center mt-4">
                    <button 
                      className="btn btn-success btn-lg"
                      onClick={bookSelectedRoute}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Booking...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-ticket-alt me-2"></i>
                          Book Selected Route
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .route-path {
          position: relative;
        }
        .route-station {
          display: flex;
          align-items: center;
          padding: 8px 0;
        }
        .route-line {
          width: 2px;
          height: 20px;
          background: #dee2e6;
          margin-left: 7px;
        }
        .card:hover {
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          transition: box-shadow 0.2s ease-in-out;
        }
        .border-primary {
          border-width: 2px !important;
        }
      `}</style>
    </div>
  )
}

export default MultiRouteBookingPage
