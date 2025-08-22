import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { scheduleAPI, stationAPI } from '../api/api'
import { fetchStations } from '../slices/stationSlice'

function SchedulesPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  
  const stationsState = useSelector(state => state.stations)
  const stations = stationsState?.allItems || stationsState?.items || []

  useEffect(() => {
    if (!stations || stations.length === 0) {
      dispatch(fetchStations())
    }
  }, [stations, dispatch])

  useEffect(() => {
    fetchSchedules()
  }, [])

  async function fetchSchedules() {
    try {
      setLoading(true)
      const { data } = await scheduleAPI.getSchedules()
      setSchedules(Array.isArray(data) ? data : data?.items || [])
    } catch (err) {
      setError('Failed to load schedules')
    } finally {
      setLoading(false)
    }
  }

  function getStationName(stationId) {
    if (!stationId) return 'Unknown Station'
    const station = stations.find(s => 
      (s.id || s._id || s.code || s.stationId || s.station_id) === stationId ||
      (s.name && s.name.toLowerCase().includes(stationId.toLowerCase())) ||
      (s.code && s.code.toLowerCase() === stationId.toLowerCase())
    )
    return station?.name || station?.title || station?.displayName || station?.stationName || stationId
  }

  function handleSelectTrain(schedule) {
    setSelectedSchedule(schedule)
  }

  function handleBookTicket(schedule) {
    // Navigate to booking with selected train info
    navigate('/book', { 
      state: { 
        selectedSchedule: schedule,
        sourceId: schedule.startStationId,
        destinationId: schedule.endStationId
      } 
    })
  }

  if (loading) return <div className="container mt-5 pt-5">Loading schedules...</div>
  if (error) return <div className="container mt-5 pt-5 text-danger">{error}</div>

  return (
    <div className="container mt-5 pt-5">
      <h2><i className="fas fa-train me-2"></i>Train Schedules</h2>
      
      <div className="row">
        <div className="col-md-8">
          <div className="card">
            <div className="card-header">
              <h5>Available Trains</h5>
            </div>
            <div className="card-body">
              {schedules.map(schedule => (
                <div key={schedule.id || schedule._id} className="border-bottom py-3">
                  <div className="row align-items-center">
                    <div className="col-md-3">
                      <h6 className="mb-1">Train {schedule.trainNumber}</h6>
                      <small className="text-muted">{schedule.trainName}</small>
                    </div>
                    <div className="col-md-4">
                      <div className="d-flex justify-content-between">
                        <div>
                          <strong>{getStationName(schedule.startStationId)}</strong>
                          <br />
                          <small className="text-muted">{schedule.departureTime}</small>
                        </div>
                        <div className="text-center">
                          <i className="fas fa-arrow-right text-muted"></i>
                        </div>
                        <div className="text-end">
                          <strong>{getStationName(schedule.endStationId)}</strong>
                          <br />
                          <small className="text-muted">{schedule.arrivalTime}</small>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-2">
                      <span className="badge bg-success">{schedule.status || 'On Time'}</span>
                    </div>
                    <div className="col-md-3">
                      <button 
                        className="btn btn-primary btn-sm me-2"
                        onClick={() => handleSelectTrain(schedule)}
                      >
                        Select
                      </button>
                      <button 
                        className="btn btn-success btn-sm"
                        onClick={() => handleBookTicket(schedule)}
                      >
                        Book
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {schedules.length === 0 && (
                <p className="text-muted">No schedules available</p>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-4">
          {selectedSchedule && (
            <div className="card">
              <div className="card-header">
                <h5>Selected Train Details</h5>
              </div>
              <div className="card-body">
                <h6>Train {selectedSchedule.trainNumber}</h6>
                <p className="text-muted">{selectedSchedule.trainName}</p>
                
                <div className="mb-3">
                  <strong>Route:</strong>
                  <div className="mt-2">
                    <div className="d-flex justify-content-between">
                      <span>{getStationName(selectedSchedule.startStationId)}</span>
                      <span>{selectedSchedule.departureTime}</span>
                    </div>
                    <div className="text-center text-muted">
                      <i className="fas fa-arrow-down"></i>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>{getStationName(selectedSchedule.endStationId)}</span>
                      <span>{selectedSchedule.arrivalTime}</span>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <strong>Duration:</strong> {selectedSchedule.duration || 'N/A'}
                </div>

                <div className="mb-3">
                  <strong>Status:</strong> 
                  <span className={`badge ms-2 ${selectedSchedule.status === 'On Time' ? 'bg-success' : 'bg-warning'}`}>
                    {selectedSchedule.status || 'On Time'}
                  </span>
                </div>

                <div className="mb-3">
                  <strong>Platform:</strong> {selectedSchedule.platform || 'TBD'}
                </div>

                <button 
                  className="btn btn-success w-100"
                  onClick={() => handleBookTicket(selectedSchedule)}
                >
                  <i className="fas fa-ticket-alt me-2"></i>Book Ticket
                </button>
              </div>
            </div>
          )}

          <div className="card mt-3">
            <div className="card-header">
              <h5>Station Information</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <strong>Total Stations:</strong> {stations.length}
              </div>
              <div className="mb-3">
                <strong>Active Trains:</strong> {schedules.filter(s => s.status === 'On Time').length}
              </div>
              <button 
                className="btn btn-outline-primary btn-sm"
                onClick={() => navigate('/routes')}
              >
                View All Routes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SchedulesPage