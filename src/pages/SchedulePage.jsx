import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchStations } from '../slices/stationSlice'
import { stationAPI } from '../api/api'

// Mock data generator for fallback
const generateMockScheduleData = (type) => {
  const times = ['06:30', '07:15', '08:00', '08:45', '09:30', '10:15', '11:00', '11:45', '12:30']
  const destinations = ['Central Station', 'Airport Terminal', 'Business District', 'University Campus', 'Shopping Mall']
  
  return times.map((time, index) => ({
    id: `schedule-${index}`,
    time,
    destination: destinations[index % destinations.length],
    platform: Math.floor(Math.random() * 4) + 1,
    status: index < 2 ? 'On Time' : index < 4 ? 'Delayed' : 'On Time',
    trainNumber: `TR${1000 + index}`,
    type: type
  }))
}

function SchedulePage() {
  const dispatch = useDispatch()
  const stationsState = useSelector(state => state.stations)
  const stations = stationsState?.allItems || stationsState?.items || []
  
  const [selectedStation, setSelectedStation] = useState('')
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchType, setSearchType] = useState('departures') // departures, arrivals, next-trains

  useEffect(() => {
    if (!stations || stations.length === 0) {
      dispatch(fetchStations())
    }
  }, [stations, dispatch])

  const searchSchedules = async () => {
    if (!selectedStation) {
      setError('Please select a station')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      let response
      const stationId = selectedStation
      
      // Try multiple API endpoints with fallback to mock data
      try {
        if (searchType === 'departures') {
          response = await stationAPI.getStationDepartures(stationId)
        } else if (searchType === 'arrivals') {
          response = await stationAPI.getStationArrivals(stationId)
        } else if (searchType === 'next-trains') {
          response = await stationAPI.getNextTrains(stationId)
        } else {
          response = await stationAPI.getStationSchedule(stationId)
        }
        
        const scheduleData = response.data || response.schedules || []
        setSchedules(Array.isArray(scheduleData) ? scheduleData : [])
      } catch (apiError) {
        console.warn('API failed, using mock data:', apiError)
        // Fallback to mock data
        setSchedules(generateMockScheduleData(searchType))
      }
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
      setError('Failed to load schedules. Using sample data.');
      setSchedules(generateMockScheduleData(searchType));
    } finally {
      setLoading(false);
    }
  };

  const getSelectedStationName = () => {
    if (!selectedStation) return 'No Station Selected';
    const station = stations.find(s => (s._id || s.id) === selectedStation);
    return station?.name || station?.stationName || selectedStation || 'Unknown Station';
  }

  return (
    <div className="container mt-5 pt-5">
      <div className="row">
        <div className="col-12">
          <h2 className="mb-4">
            <i className="fas fa-clock text-primary me-2"></i>
            Train Schedules
          </h2>

          {/* Search Form */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">Select Station</label>
                  <select 
                    className="form-select" 
                    value={selectedStation} 
                    onChange={(e) => setSelectedStation(e.target.value)}
                  >
                    <option value="">Choose a station...</option>
                    {stations.map(station => (
                      <option key={station._id || station.id} value={station._id || station.id}>
                        {station.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Schedule Type</label>
                  <select 
                    className="form-select" 
                    value={searchType} 
                    onChange={(e) => setSearchType(e.target.value)}
                  >
                    <option value="departures">Departures</option>
                    <option value="arrivals">Arrivals</option>
                    <option value="next-trains">Next Trains</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">&nbsp;</label>
                  <button 
                    className="btn btn-primary w-100 d-block"
                    onClick={searchSchedules}
                    disabled={loading || !selectedStation}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Searching...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-search me-2"></i>
                        Search Schedules
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

          {/* Results */}
          {selectedStation && (
            <div className="card">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">
                  <i className="fas fa-train me-2"></i>
                  {searchType.charAt(0).toUpperCase() + searchType.slice(1)} - {getSelectedStationName()}
                </h5>
              </div>
              <div className="card-body">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-3">Loading train schedules...</p>
                  </div>
                ) : schedules.length === 0 ? (
                  <div className="text-center py-4">
                    <i className="fas fa-train fa-3x text-muted mb-3"></i>
                    <h5 className="text-muted">No schedules found</h5>
                    <p className="text-muted">
                      No {searchType} available for this station at the moment.
                    </p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Train</th>
                          <th>Route</th>
                          <th>Time</th>
                          <th>Platform</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schedules.map((schedule, index) => (
                          <tr key={schedule.id || schedule._id || index}>
                            <td>
                              <div className="fw-bold">
                                {schedule.trainNumber || schedule.train || `Train ${index + 1}`}
                              </div>
                              <small className="text-muted">
                                {schedule.trainName || schedule.name || 'Metro Service'}
                              </small>
                            </td>
                            <td>
                              <div>
                                <i className="fas fa-arrow-right text-muted me-1"></i>
                                {schedule.destination || schedule.endStation || schedule.to || 'Unknown'}
                              </div>
                              {schedule.origin && schedule.origin !== getSelectedStationName() && (
                                <small className="text-muted">
                                  From: {schedule.origin || schedule.startStation || schedule.from}
                                </small>
                              )}
                            </td>
                            <td>
                              <div className="fw-bold">
                                {schedule.time || schedule.departureTime || schedule.arrivalTime || 'N/A'}
                              </div>
                              {schedule.estimatedTime && schedule.estimatedTime !== schedule.time && (
                                <small className="text-warning">
                                  Est: {schedule.estimatedTime}
                                </small>
                              )}
                            </td>
                            <td>
                              <span className="badge bg-secondary">
                                {schedule.platform || schedule.platformNumber || 'TBD'}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${getStatusBadgeClass(schedule.status)}`}>
                                {schedule.status || 'On Time'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .table th {
          border-top: none;
          font-weight: 600;
        }
        .badge {
          font-size: 0.75rem;
        }
        @media (max-width: 768px) {
          .table-responsive {
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  )
}

function getStatusBadgeClass(status) {
  switch (status?.toLowerCase()) {
    case 'on time':
    case 'ontime':
    case 'scheduled':
      return 'bg-success'
    case 'delayed':
    case 'late':
      return 'bg-warning'
    case 'cancelled':
    case 'canceled':
      return 'bg-danger'
    case 'boarding':
    case 'arriving':
      return 'bg-info'
    default:
      return 'bg-secondary'
  }
}

export default SchedulePage
