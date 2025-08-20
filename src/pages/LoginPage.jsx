import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import { loginSuccess } from '../slices/authSlice'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI } from '../api/api'
import metroplatform from "../../public/assets/metroplatform.jpeg"
import PhoneInput from "react-phone-number-input"
import "react-phone-number-input/style.css"

function LoginPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [isOtp, setIsOtp] = useState(false)
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [verifyLoading, setVerifyLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (isOtp) {
      alert('Please use Verify button to login with OTP')
      return
    }
    try {
      setLoading(true)
      const { data } = await authAPI.loginWithPassword(phone, password)
      dispatch(loginSuccess({ user: data.user, token: data.token }))
      navigate('/home')
    } catch (err) {
      alert(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function sendOtp() {
    if (!phone) return alert('Enter phone number')
    try {
      setOtpLoading(true)
      const { data } = await authAPI.requestLoginOtp(phone)
      window.__login_otp_hash__ = data.otpHash
      alert('OTP sent successfully')
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send OTP')
    } finally {
      setOtpLoading(false)
    }
  }

  async function handleVerifyOtp() {
    if (!otp) return alert('Enter OTP first')
    try {
      setVerifyLoading(true)
      const { data: verify } = await authAPI.verifyLoginOtp(
        phone,
        otp,
        window.__login_otp_hash__ || ''
      )
      dispatch(loginSuccess({ user: verify.user, token: verify.token }))
      navigate('/home')
    } catch (err) {
      alert(err.response?.data?.message || 'OTP verification failed')
    } finally {
      setVerifyLoading(false)
    }
  }

  return (
    <div className="container-fluid p-0" style={{ minHeight: '100vh' }}>
      <div className="row g-0" style={{ minHeight: '100vh' }}>
        {/* Left Side Image (only on desktop) */}
        <div
          className="col-md-6 d-none d-md-flex align-items-center justify-content-center"
          style={{
            background: `url(${metroplatform}) center center / cover no-repeat`,
            minHeight: '100vh'
          }}
        ></div>

        {/* Right Side Form */}
        <div className="col-md-6 d-flex align-items-center justify-content-center">
          <div className="w-100" style={{ maxWidth: 400, padding: '2rem' }}>
            <div className="card shadow-lg border-0">
              <div className="card-header bg-primary text-white text-center py-3">
                <h4 className="mb-0">
                  <i className="fas fa-sign-in-alt me-2"></i> Login
                </h4>
              </div>
              <div className="card-body p-4">
                {/* Toggle Password / OTP */}
                <div className="btn-group w-100 mb-3" role="group" aria-label="Login method">
                  <input
                    type="radio"
                    className="btn-check"
                    name="loginMethod"
                    id="passwordLogin"
                    checked={!isOtp}
                    onChange={() => setIsOtp(false)}
                  />
                  <label className="btn btn-outline-primary" htmlFor="passwordLogin">
                    Login with Password
                  </label>
                  <input
                    type="radio"
                    className="btn-check"
                    name="loginMethod"
                    id="otpLogin"
                    checked={isOtp}
                    onChange={() => setIsOtp(true)}
                  />
                  <label className="btn btn-outline-primary" htmlFor="otpLogin">
                    Login with OTP
                  </label>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit}>
                  {/* Phone Input */}
                  <div className="mb-3">
                    <label className="form-label">Phone Number</label>
                    <div className={`d-flex ${isOtp ? 'flex-column flex-sm-row gap-2' : ''}`}>
                      <div className="flex-fill d-flex align-items-center">
                        <span className="input-group-text me-2 d-none d-sm-inline"><i className="fas fa-phone"></i></span>
                        <div className="flex-fill">
                          <PhoneInput
                            international
                            defaultCountry="IN"
                            value={phone}
                            onChange={setPhone}
                            className="form-control"
                            placeholder="Enter phone number"
                            required
                            disabled={otpLoading}
                          />
                        </div>
                      </div>
                      {isOtp && (
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={sendOtp}
                          disabled={!phone || otpLoading}
                        >
                          {otpLoading ? (
                            <span className="spinner-border spinner-border-sm"></span>
                          ) : (
                            'Send OTP'
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Password Login */}
                  {!isOtp && (
                    <div className="mb-3">
                      <label className="form-label">Password</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="fas fa-lock"></i>
                        </span>
                        <input
                          type="password"
                          className="form-control"
                          placeholder="Enter password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* OTP Login */}
                  {isOtp && (
                    <div className="mb-3">
                      <label className="form-label">Enter OTP</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="fas fa-key"></i>
                        </span>
                        <input
                          type="text"
                          className="form-control"
                          maxLength={6}
                          placeholder="6-digit OTP"
                          value={otp}
                          onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={handleVerifyOtp}
                          disabled={!otp || verifyLoading}
                        >
                          {verifyLoading ? (
                            <span className="spinner-border spinner-border-sm"></span>
                          ) : (
                            'Verify'
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  {!isOtp && (
                    <button
                      type="submit"
                      className="btn btn-primary w-100"
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="spinner-border spinner-border-sm me-2"></span>
                      ) : (
                        <i className="fas fa-sign-in-alt me-2"></i>
                      )}
                      Login
                    </button>
                  )}
                </form>

                {/* Register Link */}
                <div className="text-center mt-3">
                  <p>
                    Don't have an account?{' '}
                    <Link to="/register">Register here</Link>
                  </p>
                </div>
              </div>
            </div>
          </div>{' '}
        </div>
      </div>
    </div>
  )
}

export default LoginPage
