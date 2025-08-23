import { Link } from 'react-router-dom'
import { useState } from 'react'
import NearbyStationsFinder from './NearbyStationsFinder'

function NavBar() {
  const [showNearbyStations, setShowNearbyStations] = useState(false)

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary fixed-top">
        <div className="container-fluid">
          <Link className="navbar-brand" to="/home">
            <i className="fas fa-train me-2"></i>SmartMetroCard
          </Link>
          
          <div className="d-flex">
            <button 
              className="btn btn-outline-light btn-sm me-2"
              onClick={() => setShowNearbyStations(true)}
              title="Find nearby stations"
            >
              <i className="fas fa-map-marker-alt me-1"></i>
              <span className="d-none d-md-inline">Find Stations</span>
            </button>
          </div>
        </div>
      </nav>
      
      <NearbyStationsFinder 
        show={showNearbyStations} 
        onClose={() => setShowNearbyStations(false)} 
      />
    </>
  )
}

export default NavBar

