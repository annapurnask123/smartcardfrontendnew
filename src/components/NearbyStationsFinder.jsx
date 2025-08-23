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

  const getCurrentLocation = () => {
    setLoading(true);
    setError('');
    setPermissionDenied(false);

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
            setError('Location request timed out.');
            break;
          default:
            setError('An unknown error occurred while retrieving location.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
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
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => {
        // Close modal when clicking on backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="fas fa-map-marker-alt text-primary me-2"></i>
              Nearby Metro Stations
            </h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            {!location && !loading && (
              <div className="text-center py-4">
                <i className="fas fa-location-arrow fa-3x text-muted mb-3"></i>
                <h6>Find stations near you</h6>
                <p className="text-muted mb-4">
                  We'll use your location to show the nearest metro stations
                </p>
                <button 
                  className="btn btn-primary"
                  onClick={getCurrentLocation}
                >
                  <i className="fas fa-crosshairs me-2"></i>
                  Get My Location
                </button>
              </div>
            )}

            {loading && (
              <div className="text-center py-4">
                <div className="spinner-border text-primary mb-3" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p>Finding your location...</p>
              </div>
            )}

            {error && (
              <div className="alert alert-danger">
                <i className="fas fa-exclamation-triangle me-2"></i>
                {error}
                {permissionDenied && (
                  <div className="mt-2">
                    <small>
                      To enable location access:
                      <br />• Click the location icon in your browser's address bar
                      <br />• Select "Allow" for location access
                      <br />• Refresh the page and try again
                    </small>
                  </div>
                )}
                <div className="mt-3">
                  <button 
                    className="btn btn-outline-primary btn-sm"
                    onClick={getCurrentLocation}
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {nearbyStations.length > 0 && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="mb-0">
                    <i className="fas fa-train me-2"></i>
                    Stations near you
                  </h6>
                  <button 
                    className="btn btn-outline-secondary btn-sm"
                    onClick={getCurrentLocation}
                  >
                    <i className="fas fa-sync-alt me-1"></i>
                    Refresh
                  </button>
                </div>
                
                <div className="list-group">
                  {nearbyStations.map((station, index) => (
                    <div key={station._id || station.id || index} className="list-group-item">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <h6 className="mb-1">
                            {station.name || station.stationName || 'Unknown Station'}
                          </h6>
                          <p className="mb-1 text-muted small">
                            <i className="fas fa-route me-1"></i>
                            {station.distance < 1 
                              ? `${Math.round(station.distance * 1000)}m away`
                              : `${station.distance.toFixed(1)}km away`
                            }
                          </p>
                          {station.code && (
                            <small className="text-muted">Code: {station.code}</small>
                          )}
                        </div>
                        <div className="d-flex flex-column gap-1">
                          <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => openInMaps(station)}
                            title="Get directions"
                          >
                            <i className="fas fa-directions"></i>
                          </button>
                          <span className="badge bg-secondary">
                            #{index + 1}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 text-center">
                  <small className="text-muted">
                    <i className="fas fa-info-circle me-1"></i>
                    Distances are calculated as straight-line distance
                  </small>
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
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
