import { Link } from 'react-router-dom'

function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="mt-auto pt-5 pb-4 bg-dark text-light">
      <div className="container">
        <div className="row g-4">
          <div className="col-lg-4 col-md-6">
            <div className="footer-brand mb-4">
              <div className="d-flex align-items-center mb-3">
                <i className="fas fa-train fa-2x text-primary me-3"></i>
                <h5 className="mb-0 fw-bold">SmartMetroCard</h5>
              </div>
              <p className="text-muted mb-3">
                Revolutionizing urban transportation with smart ticketing, virtual cards, and seamless metro travel experiences.
              </p>
              <div className="social-links">
                <a href="#" className="btn btn-outline-light btn-sm me-2" title="Facebook">
                  <i className="fab fa-facebook-f"></i>
                </a>
                <a href="#" className="btn btn-outline-light btn-sm me-2" title="Twitter">
                  <i className="fab fa-twitter"></i>
                </a>
                <a href="#" className="btn btn-outline-light btn-sm me-2" title="Instagram">
                  <i className="fab fa-instagram"></i>
                </a>
                <a href="#" className="btn btn-outline-light btn-sm" title="LinkedIn">
                  <i className="fab fa-linkedin-in"></i>
                </a>
              </div>
            </div>
          </div>
          
          <div className="col-lg-2 col-md-6">
            <h6 className="text-uppercase mb-3 fw-bold">Services</h6>
            <ul className="list-unstyled">
              <li className="mb-2">
                <Link to="/tickets" className="text-muted text-decoration-none footer-link">
                  <i className="fas fa-ticket-alt me-2"></i>Book Tickets
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/cards" className="text-muted text-decoration-none footer-link">
                  <i className="fas fa-credit-card me-2"></i>Virtual Cards
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/plans" className="text-muted text-decoration-none footer-link">
                  <i className="fas fa-crown me-2"></i>Subscription Plans
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/schedules" className="text-muted text-decoration-none footer-link">
                  <i className="fas fa-clock me-2"></i>Train Schedules
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/journey" className="text-muted text-decoration-none footer-link">
                  <i className="fas fa-route me-2"></i>Journey Tracking
                </Link>
              </li>
            </ul>
          </div>
          
          <div className="col-lg-2 col-md-6">
            <h6 className="text-uppercase mb-3 fw-bold">Support</h6>
            <ul className="list-unstyled">
              <li className="mb-2">
                <a href="mailto:support@smartmetro.com" className="text-muted text-decoration-none footer-link">
                  <i className="fas fa-envelope me-2"></i>Email Support
                </a>
              </li>
              <li className="mb-2">
                <a href="tel:+91-1800-123-4567" className="text-muted text-decoration-none footer-link">
                  <i className="fas fa-phone me-2"></i>24/7 Helpline
                </a>
              </li>
              <li className="mb-2">
                <Link to="/faq" className="text-muted text-decoration-none footer-link">
                  <i className="fas fa-question-circle me-2"></i>FAQ
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/help" className="text-muted text-decoration-none footer-link">
                  <i className="fas fa-life-ring me-2"></i>Help Center
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/feedback" className="text-muted text-decoration-none footer-link">
                  <i className="fas fa-comment me-2"></i>Feedback
                </Link>
              </li>
            </ul>
          </div>
          
          <div className="col-lg-2 col-md-6">
            <h6 className="text-uppercase mb-3 fw-bold">Company</h6>
            <ul className="list-unstyled">
              <li className="mb-2">
                <Link to="/about" className="text-muted text-decoration-none footer-link">
                  <i className="fas fa-info-circle me-2"></i>About Us
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/careers" className="text-muted text-decoration-none footer-link">
                  <i className="fas fa-briefcase me-2"></i>Careers
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/press" className="text-muted text-decoration-none footer-link">
                  <i className="fas fa-newspaper me-2"></i>Press
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/partners" className="text-muted text-decoration-none footer-link">
                  <i className="fas fa-handshake me-2"></i>Partners
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/contact" className="text-muted text-decoration-none footer-link">
                  <i className="fas fa-map-marker-alt me-2"></i>Contact
                </Link>
              </li>
            </ul>
          </div>
          
          <div className="col-lg-2 col-md-6">
            <h6 className="text-uppercase mb-3 fw-bold">Legal</h6>
            <ul className="list-unstyled">
              <li className="mb-2">
                <Link to="/privacy" className="text-muted text-decoration-none footer-link">
                  <i className="fas fa-shield-alt me-2"></i>Privacy Policy
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/terms" className="text-muted text-decoration-none footer-link">
                  <i className="fas fa-file-contract me-2"></i>Terms of Service
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/refund" className="text-muted text-decoration-none footer-link">
                  <i className="fas fa-undo me-2"></i>Refund Policy
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/cookies" className="text-muted text-decoration-none footer-link">
                  <i className="fas fa-cookie-bite me-2"></i>Cookie Policy
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/accessibility" className="text-muted text-decoration-none footer-link">
                  <i className="fas fa-universal-access me-2"></i>Accessibility
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <hr className="my-4 border-secondary" />
        
        <div className="row align-items-center">
          <div className="col-md-6">
            <div className="d-flex align-items-center">
              <span className="text-muted me-3">© {year} SmartMetroCard. All rights reserved.</span>
              <div className="d-flex gap-2">
                <img src="https://img.shields.io/badge/SSL-Secure-brightgreen" alt="SSL Secure" />
                <img src="https://img.shields.io/badge/Payment-PCI%20Compliant-blue" alt="PCI Compliant" />
              </div>
            </div>
          </div>
          <div className="col-md-6 text-md-end">
            <div className="d-flex justify-content-md-end gap-3">
              <span className="text-muted">
                <i className="fas fa-globe me-1"></i>
                English (IN)
              </span>
              <span className="text-muted">
                <i className="fas fa-map-marker-alt me-1"></i>
                India
              </span>
              <span className="text-muted">
                Made with <i className="fas fa-heart text-danger"></i> for commuters
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .footer-link {
          color: #adb5bd !important;
          text-decoration: none;
          transition: color 0.3s ease;
        }
        
        .footer-link:hover {
          color: #fff !important;
          text-decoration: none;
        }
        
        .social-links a {
          transition: all 0.3s ease;
        }
        
        .social-links a:hover {
          background-color: #007bff !important;
          border-color: #007bff !important;
          transform: translateY(-2px);
        }
        
        footer a {
          transition: color 0.3s ease;
        }
        
        footer a:hover {
          color: #fff !important;
          text-decoration: none;
        }
        
        @media (max-width: 768px) {
          .footer-brand {
            text-align: center;
          }
          
          .social-links {
            justify-content: center;
          }
        }
      `}</style>
    </footer>
  )
}

export default Footer

