import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';

function NearbyStationsFinder({ show, onClose }) {
  const [location, setLocation] = useState(null);
  const [nearbyStations, setNearbyStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);

  const stationsState = useSelector(state => state.stations);
  const stations = stationsState?.allItems || stationsState?.items || [];

  useEffect(() => {
    // Add event listener for escape key
    const handleEscKey = (e) => {
      if (e.keyCode === 27) onClose();
    };
    
    if (show) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [show, onClose]);

  const getCurrentLocation = () => {
    setLoading(true);
    setError('');
    setPermissionDenied(false);
    setNearbyStations([]);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setLocation(userLocation);
        findNearbyStations(userLocation);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLoading(false);
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setPermissionDenied(true);
            setError('Location access denied. Please enable location services and try again.');
            break;
          case error.POSITION_UNAVAILABLE:
            setError('Location information is unavailable.');
            break;
          case error.TIMEOUT:
            setError('Location request timed out. Please try again.');
            break;
          default:
            setError('An unknown error occurred while retrieving location.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  const findNearbyStations = (userLocation) => {
    try {
      // Calculate distances to all stations
      const stationsWithDistance = stations.map(station => {
        // Use mock coordinates if real coordinates aren't available
        const stationLat = station.location?.coordinates?.[1] || 
                          station.latitude || 
                          (12.9716 + (Math.random() - 0.5) * 0.1); // Bangalore area
        const stationLng = station.location?.coordinates?.[0] || 
                          station.longitude || 
                          (77.5946 + (Math.random() - 0.5) * 0.1);

        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          stationLat,
          stationLng
        );

        return {
          ...station,
          distance: distance,
          coordinates: {
            latitude: stationLat,
            longitude: stationLng
          }
        };
      });

      // Sort by distance and take closest 10
      const nearby = stationsWithDistance
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10);

      setNearbyStations(nearby);
    } catch (err) {
      console.error('Error finding nearby stations:', err);
      setError('Failed to find nearby stations');
    } finally {
      setLoading(false);
    }
  };

  // Haversine formula to calculate distance between two points
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in kilometers
    return d;
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
  };

  const openInMaps = (station) => {
    const { latitude, longitude } = station.coordinates;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=walking`;
    window.open(url, '_blank');
  };

  if (!show) return null;

  return (
    <div 
      className="modal fade show d-block" 
      style={{ 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        backdropFilter: 'blur(3px)',
        zIndex: 1050 
      }}
      tabIndex="-1"
      role="dialog"
      aria-labelledby="nearbyStationsModalLabel"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content shadow-lg border-0">
          <div className="modal-header bg-gradient-primary text-white">
            <h5 className="modal-title fw-bold" id="nearbyStationsModalLabel">
              <i className="fas fa-map-marker-alt me-2"></i>
              Nearby Metro Stations
            </h5>
            <button 
              type="button" 
              className="btn-close btn-close-white"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          
          <div className="modal-body p-4">
            {!location && !loading && nearbyStations.length === 0 && (
              <div className="text-center py-5">
                <div className="mb-4">
                  <i className="fas fa-location-arrow fa-4x text-primary opacity-75"></i>
                </div>
                <h5 className="fw-bold mb-3">Find Stations Near You</h5>
                <p className="text-muted mb-4">
                  Allow location access to discover the nearest metro stations to your current position
                </p>
                <button 
                  className="btn btn-primary btn-lg px-4 py-2 rounded-pill fw-semibold"
                  onClick={getCurrentLocation}
                >
                  <i className="fas fa-crosshairs me-2"></i>
                  Detect My Location
                </button>
                
                <div className="mt-4">
                  <small className="text-muted">
                    <i className="fas fa-info-circle me-1"></i>
                    Your location is only used to find nearby stations and is not stored
                  </small>
                </div>
              </div>
            )}

            {loading && (
              <div className="text-center py-5">
                <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}} role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h6 className="fw-semibold">Locating you...</h6>
                <p className="text-muted small">Please allow location access when prompted</p>
              </div>
            )}

            {error && (
              <div className="alert alert-warning border-0 rounded-3 shadow-sm">
                <div className="d-flex align-items-center">
                  <i className="fas fa-exclamation-circle fa-lg text-warning me-3"></i>
                  <div className="flex-grow-1">
                    <h6 className="alert-heading fw-semibold mb-1">Location Access Needed</h6>
                    <p className="mb-2">{error}</p>
                    {permissionDenied && (
                      <div className="bg-light p-3 rounded-2 mt-2">
                        <small className="d-block mb-1 fw-semibold">To enable location access:</small>
                        <small className="d-block">• Click the location icon in your browser's address bar</small>
                        <small className="d-block">• Select "Allow" for location access</small>
                        <small className="d-block">• Refresh the page and try again</small>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 text-end">
                  <button 
                    className="btn btn-outline-primary btn-sm rounded-pill px-3"
                    onClick={getCurrentLocation}
                  >
                    <i className="fas fa-redo me-1"></i>
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {nearbyStations.length > 0 && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div>
                    <h6 className="fw-bold mb-1 text-dark">
                      <i className="fas fa-train-subway text-primary me-2"></i>
                      Stations Near Your Location
                    </h6>
                    <small className="text-muted">
                      Sorted by distance from your current position
                    </small>
                  </div>
                  <button 
                    className="btn btn-outline-primary btn-sm rounded-pill"
                    onClick={getCurrentLocation}
                    title="Refresh location"
                  >
                    <i className="fas fa-sync-alt me-1"></i>
                    Refresh
                  </button>
                </div>
                
                <div className="stations-list">
                  {nearbyStations.map((station, index) => (
                    <div 
                      key={station._id || station.id || index} 
                      className="card border-0 shadow-sm mb-3 station-card"
                    >
                      <div className="card-body p-3">
                        <div className="d-flex align-items-center">
                          <div className="station-rank me-3">
                            <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center"
                                 style={{width: '36px', height: '36px'}}>
                              <span className="fw-bold">{index + 1}</span>
                            </div>
                          </div>
                          
                          <div className="flex-grow-1 me-3">
                            <h6 className="card-title fw-semibold mb-1 text-dark">
                              {station.name || station.stationName || 'Unknown Station'}
                            </h6>
                            <div className="d-flex flex-wrap align-items-center text-muted small">
                              <span className="me-3">
                                <i className="fas fa-route me-1 text-primary"></i>
                                {station.distance < 1 
                                  ? `${Math.round(station.distance * 1000)}m away`
                                  : `${station.distance.toFixed(1)}km away`
                                }
                              </span>
                              {station.code && (
                                <span className="badge bg-light text-dark border">
                                  Code: {station.code}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="station-actions">
                            <button
                              className="btn btn-primary btn-sm rounded-pill px-3"
                              onClick={() => openInMaps(station)}
                              title="Get directions"
                            >
                              <i className="fas fa-directions me-1"></i>
                              Directions
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 text-center">
                  <div className="bg-light p-3 rounded-3">
                    <small className="text-muted">
                      <i className="fas fa-info-circle me-1 text-primary"></i>
                      Distances are calculated as straight-line distance. Actual walking distance may vary.
                    </small>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="modal-footer border-top-0 bg-light">
            <button 
              type="button" 
              className="btn btn-outline-secondary rounded-pill px-4"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NearbyStationsFinder;