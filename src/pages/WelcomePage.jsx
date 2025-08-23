import React from 'react';
import { Link, useNavigate } from "react-router-dom";
import Button from "react-bootstrap/Button";
// Use public directory URL directly - no import needed for public assets

function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div
      className="min-vh-100 d-flex flex-column"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(/assets/metro.jpeg)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Navbar */}
      <nav
        className="navbar navbar-expand-lg navbar-dark bg-transparent w-100"
        style={{ zIndex: 1000 }}
      >
        <div className="container-fluid px-4 d-flex justify-content-between align-items-center">
          <span className="fw-bold fs-4 text-white">Tapido<i
            className="fas fa-train ms-2"
            style={{ fontSize: "2rem", color: "#f6faffff" }}
          ></i></span>

          {/* Right side profile icon with Login */}
          <div className="dropdown">
            <button className="btn btn-outline-light dropdown-toggle" data-bs-toggle="dropdown">
              <i className="fas fa-user-circle"></i>
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
              <li>
                <Link className="dropdown-item" to="/login">
                  <i className="fas fa-sign-in-alt me-2"></i>Login
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center">
        <div className="mb-4">
          <i
            className="fas fa-train"
            style={{ fontSize: "6rem", color: "#fff" }}
          ></i>
        </div>
        <h1 className="display-4 text-white mb-3">SmartMetroCard</h1>
        <p className="lead text-white mb-5">
          "Ride the metro, skip the chaos — fast, simple, and seamless."
        </p>

        {/* ✅ Centered Buttons with Colors */}
        <div className="d-flex gap-3">
          <Button
            style={{ backgroundColor: "#007bff", border: "none" }} // Blue
            size="lg"
            onClick={() => navigate("/login")}
          >
            Login
          </Button>
          <Button
            style={{ backgroundColor: "#28a745", border: "none" }} // Green
            size="lg"
            onClick={() => navigate("/register")}
          >
            Register
          </Button>
        </div>
      </div>
    </div>
  );
}

export default WelcomePage;

