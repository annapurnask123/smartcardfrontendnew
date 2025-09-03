import React, { useState } from "react";
import { Form, Button, Alert, Spinner, Row, Col, Card } from "react-bootstrap";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { authAPI } from "../api/api";
import metroplatform from "/assets/metroplatform.jpeg";
import { useNavigate } from "react-router-dom";




function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    phoneOtp: "",
    email: "",
    emailOtp: "",
    password: "",
    confirmPassword: "",
    userId: "",
  });

  const [loading, setLoading] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [passwordSet, setPasswordSet] = useState(false);
  const [alert, setAlert] = useState({ type: "", message: "" });

  // --- Phone OTP ---
  const sendPhoneOtp = async () => {
    try {
      setLoading(true);
      const { data } = await authAPI.requestRegisterPhoneOtp(form.phone);
      window.__register_phone_otp_hash__ = data.otpHash;
      setPhoneOtpSent(true);
      setAlert({ type: "success", message: "Phone OTP sent!" });
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message
      setAlert({ type: "danger", message: `Failed to send phone OTP: ${msg}` });
    } finally {
      setLoading(false);
    }
  };

  const verifyPhoneOtp = async () => {
    try {
      setLoading(true);
      const { data } = await authAPI.verifyPhoneOtp(
        form.phone,
        form.phoneOtp,
        window.__register_phone_otp_hash__ || ""
      );
      setForm(prev => ({ ...prev, userId: data.user._id }));
      setPhoneVerified(true);
      setAlert({ type: "success", message: "Phone verified!" });
    } catch (err) {
      setAlert({ type: "danger", message: err.response?.data?.error || err.message });
    } finally {
      setLoading(false);
    }
  };

  // --- Email OTP ---
  const sendEmailOtp = async () => {
    try {
      setLoading(true);
      const { data } = await authAPI.requestRegisterEmailOtp(form.phone, form.email);
      window.__register_email_otp_hash__ = data.otpHash;
      setEmailOtpSent(true);
      setAlert({ type: "success", message: "Email OTP sent!" });
    } catch (err) {
      setAlert({ type: "danger", message: err.response?.data?.error || err.message });
    } finally {
      setLoading(false);
    }
  };

  const verifyEmailOtp = async () => {
    try {
      setLoading(true);
      await authAPI.verifyEmailOtp(form.email, form.emailOtp, window.__register_email_otp_hash__ || "");
      setEmailVerified(true);
      setAlert({ type: "success", message: "Email verified!" });
    } catch (err) {
      setAlert({ type: "danger", message: err.response?.data?.error || err.message });
    } finally {
      setLoading(false);
    }
  };

  // --- Set Password ---
  const handleSetPassword = async () => {
    if (!form.password || !form.confirmPassword) {
      setAlert({ type: "danger", message: "Enter password and confirm password" });
      return;
    }
    try {
      setLoading(true);
      const { data } = await authAPI.setPassword(form.userId, form.password, form.confirmPassword);
      setAlert({ type: "success", message: data.message });
      setPasswordSet(true);
    } catch (err) {
      setAlert({ type: "danger", message: err.response?.data?.error || err.message });
    } finally {
      setLoading(false);
    }
  };
const handleRegister = async () => {
  if (!form.name) {
    setAlert({ type: "danger", message: "Enter full name" });
    return;
  }
  try {
    setLoading(true);
    const { data } = await authAPI.register(form.name, form.phone);
    setAlert({ type: "success", message: "Registration complete! Redirecting to login..." });

    // Navigate to login after short delay
    setTimeout(() => {
      navigate("/login");
    }, 1500);
  } catch (err) {
    setAlert({ type: "danger", message: err.response?.data?.error || err.message });
  } finally {
    setLoading(false);
  }
};


  return (
    <Row className="vh-100 g-0">
      {/* Left Image for Desktop */}
      <Col md={6} className="d-none d-md-block">
        <img
          src={metroplatform}
          alt="Metro"
          className="img-fluid vh-100 w-100"
          style={{ objectFit: "cover" }}
        />
      </Col>

      {/* Right Form */}
      <Col xs={12} md={6} className="d-flex align-items-center justify-content-center">
        <Card className="shadow m-3 w-100">
          <Card.Body style={{ maxWidth: "400px", margin: "0 auto" }}>
            <h3 className="text-center mb-4">Register</h3>
            {alert.message && <Alert variant={alert.type}>{alert.message}</Alert>}

            <Form>
              {/* Phone with +91 default */}
              <Form.Group className="mb-3">
                <Form.Label>Phone Number</Form.Label>
                <PhoneInput
                  defaultCountry="IN"
                  value={form.phone}
                  onChange={(value) => setForm({ ...form, phone: value })}
                  disabled={phoneVerified}
                  className="form-control"
                />
                {!phoneOtpSent && !phoneVerified && (
                  <div className="d-grid d-sm-flex gap-2 mt-2">
                    <Button className="flex-fill" onClick={sendPhoneOtp} disabled={!form.phone || loading}>
                      {loading ? <Spinner animation="border" size="sm" /> : "Send OTP"}
                    </Button>
                  </div>
                )}
                {phoneOtpSent && !phoneVerified && (
                  <div className="d-grid d-sm-flex gap-2 mt-2">
                    <Form.Control
                      placeholder="Enter OTP"
                      value={form.phoneOtp}
                      onChange={(e) => setForm({ ...form, phoneOtp: e.target.value })}
                    />
                    <Button
                      onClick={verifyPhoneOtp}
                      disabled={!form.phoneOtp || loading}
                    >
                      {loading ? <Spinner animation="border" size="sm" /> : "Verify OTP"}
                    </Button>
                  </div>
                )}
                {phoneVerified && <Alert variant="success" className="mt-2">Phone verified ✅</Alert>}
              </Form.Group>

              {/* Email */}
              {phoneVerified && (
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    disabled={emailVerified}
                  />
                  {!emailOtpSent && !emailVerified && (
                    <div className="d-grid d-sm-flex gap-2 mt-2">
                      <Button className="flex-fill" onClick={sendEmailOtp} disabled={!form.email || loading}>
                        {loading ? <Spinner animation="border" size="sm" /> : "Send OTP"}
                      </Button>
                    </div>
                  )}
                  {emailOtpSent && !emailVerified && (
                    <div className="d-grid d-sm-flex gap-2 mt-2">
                      <Form.Control
                        placeholder="Enter OTP"
                        value={form.emailOtp}
                        onChange={(e) => setForm({ ...form, emailOtp: e.target.value })}
                      />
                      <Button
                        onClick={verifyEmailOtp}
                        disabled={!form.emailOtp || loading}
                      >
                        {loading ? <Spinner animation="border" size="sm" /> : "Verify OTP"}
                      </Button>
                    </div>
                  )}
                  {emailVerified && <Alert variant="success" className="mt-2">Email verified ✅</Alert>}
                </Form.Group>
              )}

              {/* Password */}
              {phoneVerified && emailVerified && !passwordSet && (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label>Password</Form.Label>
                    <Form.Control
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Confirm Password</Form.Label>
                    <Form.Control
                      type="password"
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    />
                  </Form.Group>
                  <Button className="w-100" onClick={handleSetPassword} disabled={loading}>
                    {loading ? <Spinner animation="border" size="sm" /> : "Set Password"}
                  </Button>
                </>
              )}

              {/* Final Registration */}
              {phoneVerified && emailVerified && passwordSet && (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label>Full Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </Form.Group>
                  <Button className="w-100" onClick={handleRegister} disabled={loading}>
                    {loading ? <Spinner animation="border" size="sm" /> : "Complete Registration"}
                  </Button>
                </>
              )}
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}

export default RegisterPage;
