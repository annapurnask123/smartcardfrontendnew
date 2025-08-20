import { Link } from 'react-router-dom'

function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="mt-auto pt-4 pb-4 bg-body-tertiary border-top">
      <div className="container">
        <div className="row g-4">
          <div className="col-md-4">
            <h6 className="text-uppercase mb-2">SmartMetroCard</h6>
            <p className="mb-0 text-muted">Seamless metro travel with smart ticketing, cards, and subscriptions.</p>
          </div>
          <div className="col-md-4">
            <h6 className="text-uppercase mb-2">Company</h6>
            <ul className="list-unstyled mb-0">
              <li><Link className="link-underline link-underline-opacity-0" to="/about">About</Link></li>
              <li><a className="link-underline link-underline-opacity-0" href="mailto:support@smartmetro.example">Contact</a></li>
            </ul>
          </div>
          <div className="col-md-4">
            <h6 className="text-uppercase mb-2">Policies</h6>
            <ul className="list-unstyled mb-0">
              <li><Link className="link-underline link-underline-opacity-0" to="/privacy">Privacy Policy</Link></li>
              <li><Link className="link-underline link-underline-opacity-0" to="/terms">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <hr className="my-4" />
        <div className="d-flex justify-content-between small text-muted">
          <span>© {year} SmartMetroCard</span>
          <span>Made with <i className="fas fa-heart text-danger"></i></span>
        </div>
      </div>
    </footer>
  )
}

export default Footer

