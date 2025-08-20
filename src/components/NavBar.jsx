import { Link } from 'react-router-dom'

function NavBar() {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary fixed-top">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/home">
          <i className="fas fa-train me-2"></i>SmartMetroCard
        </Link>
      </div>
    </nav>
  )
}

export default NavBar

