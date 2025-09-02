import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../api/api';

const AdminLogin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await adminAPI.login({
        email: formData.email,
        password: formData.password
      });

      if (response.data.success) {
        const { token, user } = response.data.data;
        
        console.log('Login successful, received data:', { token: token ? 'Token received' : 'No token', user });
        
        // Store admin token and user info
        localStorage.setItem('adminToken', token);
        localStorage.setItem('adminUser', JSON.stringify(user));
        
        console.log('Token stored in localStorage:', localStorage.getItem('adminToken') ? 'Yes' : 'No');
        console.log('User stored in localStorage:', localStorage.getItem('adminUser'));
        
        // Navigate to admin dashboard
        navigate('/admin/dashboard');
      } else {
        setError(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error response:', error.response?.data);
      setError(error.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <Container>
        <Row className="justify-content-center">
          <Col md={6} lg={4}>
            <Card className="shadow-lg border-0" style={{ borderRadius: '12px' }}>
              <Card.Body className="p-4">
                <div className="text-center mb-4">
                  <h2 className="text-primary mb-2">Admin Portal</h2>
                  <p className="text-muted">SmartMetroCard Administration</p>
                </div>

                {error && (
                  <Alert variant="danger" className="mb-3">
                    {error}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label htmlFor="admin-email">Email</Form.Label>
                    <Form.Control
                      id="admin-email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="admin@smartmetrocard.com"
                      required
                      size="lg"
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label htmlFor="admin-password">Password</Form.Label>
                    <Form.Control
                      id="admin-password"
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      required
                      minLength={6}
                      size="lg"
                    />
                  </Form.Group>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-100"
                    disabled={loading}
                    style={{ borderRadius: '8px', fontWeight: '500' }}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Signing In...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </Form>

                <div className="text-center mt-4">
                  <small className="text-muted">
                    Authorized personnel only. All activities are logged.
                  </small>
                </div>

                <div className="text-center">
                  <Button
                    variant="link"
                    onClick={() => navigate('/admin/register')}
                    className="text-decoration-none"
                  >
                    Don't have an account? Register here
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default AdminLogin;
