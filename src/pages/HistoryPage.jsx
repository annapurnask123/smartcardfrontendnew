import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { userJourneyAPI, ticketAPI } from '../api/api'

function HistoryPage() {
  const [journeys, setJourneys] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const user = useSelector(s => s.auth.user) || JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => {
    async function fetchJourneys() {
      try {
        setLoading(true)
        const userId = user?.id || user?._id
        
        let allJourneys = []
        
        // 1. Get journeys from localStorage
        try {
          const localJourneys = JSON.parse(localStorage.getItem('journeys') || '[]')
          const currentJourney = JSON.parse(localStorage.getItem('currentJourney') || 'null')
          
          if (Array.isArray(localJourneys)) {
            allJourneys = [...localJourneys]
          }
          
          if (currentJourney) {
            allJourneys.push({
              ...currentJourney,
              status: 'in_progress',
              source: 'localStorage'
            })
          }
        } catch (e) {
          console.log('No local journeys found')
        }
        
        // 2. Get journeys from backend user-journeys API
        if (userId) {
          try {
            const { data } = await userJourneyAPI.getUserJourneys(userId)
            const backendJourneys = Array.isArray(data) ? data : data?.items || []
            allJourneys = [...allJourneys, ...backendJourneys.map(j => ({ ...j, source: 'backend' }))]
          } catch (error) {
            console.log('Backend user journeys failed:', error)
          }
        }
        
        // 3. Get journeys from tickets (completed tickets have journey data)
        if (userId) {
          try {
            const { data } = await ticketAPI.getUserTickets(userId)
            const tickets = Array.isArray(data) ? data : data?.items || []
            
            const ticketJourneys = tickets
              .filter(ticket => ticket.status === 'completed' || ticket.status === 'in_progress')
              .map(ticket => ({
                id: `ticket-${ticket.ticketId || ticket._id}`,
                startStation: ticket.startStationName || ticket.startStation || 'Unknown',
                endStation: ticket.endStationName || ticket.endStation || 'Unknown',
                status: ticket.status,
                fare: ticket.price || ticket.fare || 0,
                date: ticket.createdAt || ticket.bookingDate,
                startTime: ticket.tapInTime || ticket.createdAt,
                endTime: ticket.tapOutTime || ticket.completedAt,
                source: 'tickets'
              }))
            
            allJourneys = [...allJourneys, ...ticketJourneys]
          } catch (error) {
            console.log('Ticket journeys failed:', error)
          }
        }
        
        // 4. Fallback: try to get all journeys from backend
        try {
          const { data } = await userJourneyAPI.getAllJourneys()
          const fallbackJourneys = Array.isArray(data) ? data : data?.items || []
          if (fallbackJourneys.length > 0) {
            allJourneys = [...allJourneys, ...fallbackJourneys.map(j => ({ ...j, source: 'fallback' }))]
          }
        } catch (error) {
          console.log('Fallback journeys failed:', error)
        }
        
        // Remove duplicates and sort by date
        const uniqueJourneys = []
        const seen = new Set()
        
        allJourneys.forEach(journey => {
          const key = `${journey.startStation}-${journey.endStation}-${journey.date || journey.createdAt}`
          if (!seen.has(key)) {
            seen.add(key)
            uniqueJourneys.push(journey)
          }
        })
        
        // Sort by date (newest first)
        uniqueJourneys.sort((a, b) => {
          const dateA = new Date(a.date || a.createdAt || 0)
          const dateB = new Date(b.date || b.createdAt || 0)
          return dateB - dateA
        })
        
        setJourneys(uniqueJourneys)
        
        if (uniqueJourneys.length === 0) {
          setError('')
        }
        
      } catch (error) {
        console.error('Failed to fetch journeys:', error)
        setError('Failed to load journey history')
      } finally {
        setLoading(false)
      }
    }
    fetchJourneys()
  }, [user])

  const recentJourneys = journeys.slice(0, 5)
  const allJourneys = journeys

  if (loading) {
    return (
      <div className="container mt-5 pt-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading journey history...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mt-5 pt-5">
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="container mt-5 pt-5">
      <div className="row">
        <div className="col-12">
          <h2 className="mb-4">
            <i className="fas fa-history text-primary me-2"></i>
            Journey History
          </h2>

          {/* Recent Journeys Section */}
          <div className="row mb-5">
            <div className="col-12">
              <h4 className="mb-4">
                <i className="fas fa-clock text-warning me-2"></i>
                Recent Journeys
              </h4>
              {recentJourneys.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-route fa-3x text-muted mb-3"></i>
                  <h5 className="text-muted">No recent journeys</h5>
                  <p className="text-muted">Start your first journey to see it here!</p>
                </div>
              ) : (
                <div className="row">
                  {recentJourneys.map((journey, index) => (
                    <div key={journey.id || `recent-${index}`} className="col-lg-4 col-md-6 mb-3">
                      <div className="card border-0 shadow-sm hover-lift">
                        <div className="card-body">
                          <div className="d-flex align-items-center mb-3">
                            <div className="journey-icon me-3">
                              <i className={`fas fa-${getJourneyIcon(journey.status)} fa-2x ${getJourneyColor(journey.status)}`}></i>
                            </div>
                            <div>
                              <h6 className="card-title mb-1">
                                {journey.startStation || 'Unknown'} → {journey.endStation || 'Unknown'}
                              </h6>
                              <span className={`badge ${getStatusBadgeClass(journey.status)}`}>
                                {journey.status || 'Unknown'}
                              </span>
                            </div>
                          </div>
                          <div className="row text-muted small">
                            <div className="col-6">
                              <i className="fas fa-calendar me-1"></i>
                              {formatDate(journey.date || journey.createdAt)}
                            </div>
                            <div className="col-6 text-end">
                              <i className="fas fa-rupee-sign me-1"></i>
                              {journey.fare || 0}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* All Journeys Section */}
          <div className="row">
            <div className="col-12">
              <h4 className="mb-4">
                <i className="fas fa-list text-info me-2"></i>
                All Journeys
              </h4>
              {allJourneys.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-route fa-3x text-muted mb-3"></i>
                  <h5 className="text-muted">No journeys found</h5>
                  <p className="text-muted">Your journey history will appear here</p>
                </div>
              ) : (
                <div className="card border-0 shadow">
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Route</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Fare</th>
                            <th>Duration</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allJourneys.map((journey, index) => (
                            <tr key={journey.id || `journey-${index}`}>
                              <td>
                                <div className="d-flex align-items-center">
                                  <div className="journey-icon-small me-2">
                                    <i className={`fas fa-${getJourneyIcon(journey.status)} ${getJourneyColor(journey.status)}`}></i>
                                  </div>
                                  <div>
                                    <div className="fw-bold">
                                      {journey.startStation || 'Unknown'} → {journey.endStation || 'Unknown'}
                                    </div>
                                    <small className="text-muted">
                                      {journey.startTime && journey.endTime ? 
                                        `${journey.startTime} - ${journey.endTime}` : 
                                        'Time not available'
                                      }
                                    </small>
                                  </div>
                                </div>
                              </td>
                              <td>{formatDate(journey.date || journey.createdAt)}</td>
                              <td>
                                <span className={`badge ${getStatusBadgeClass(journey.status)}`}>
                                  {journey.status || 'Unknown'}
                                </span>
                              </td>
                              <td className="fw-bold">₹{journey.fare || 0}</td>
                              <td>{calculateDuration(journey.startTime, journey.endTime)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {allJourneys.length > 0 && (
            <div className="text-center mt-4">
              <small className="text-muted">
                Showing {allJourneys.length} journeys
              </small>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .journey-icon {
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(0,0,0,0.05);
        }
        .journey-icon-small {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(0,0,0,0.05);
        }
        .hover-lift {
          transition: transform 0.2s ease-in-out;
        }
        .hover-lift:hover {
          transform: translateY(-2px);
        }
        @media (max-width: 768px) {
          .table-responsive {
            font-size: 0.9rem;
          }
          .journey-icon {
            width: 40px;
            height: 40px;
          }
          .journey-icon i {
            font-size: 1.5rem !important;
          }
          .journey-icon-small {
            width: 25px;
            height: 25px;
          }
          .journey-icon-small i {
            font-size: 0.8rem !important;
          }
        }
      `}</style>
    </div>
  )
}

function getJourneyIcon(status) {
  switch (status?.toLowerCase()) {
    case 'completed': return 'check-circle'
    case 'in_progress': 
    case 'inprogress': return 'play-circle'
    case 'cancelled': return 'times-circle'
    case 'pending': return 'clock'
    default: return 'route'
  }
}

function getJourneyColor(status) {
  switch (status?.toLowerCase()) {
    case 'completed': return 'text-success'
    case 'in_progress': 
    case 'inprogress': return 'text-warning'
    case 'cancelled': return 'text-danger'
    case 'pending': return 'text-info'
    default: return 'text-primary'
  }
}

function getStatusBadgeClass(status) {
  switch (status?.toLowerCase()) {
    case 'completed': return 'bg-success'
    case 'in_progress': 
    case 'inprogress': return 'bg-warning'
    case 'cancelled': return 'bg-danger'
    case 'pending': return 'bg-info'
    default: return 'bg-secondary'
  }
}

function formatDate(dateString) {
  if (!dateString) return 'Unknown'
  
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  } catch {
    return dateString
  }
}

function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return 'N/A'
  
  try {
    const start = new Date(startTime)
    const end = new Date(endTime)
    const diffMs = end - start
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffMins < 60) return `${diffMins}m`
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    return `${hours}h ${mins}m`
  } catch {
    return 'N/A'
  }
}

export default HistoryPage
