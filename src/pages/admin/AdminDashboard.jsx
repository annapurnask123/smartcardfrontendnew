import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Spinner, Alert } from 'react-bootstrap';
import { adminAPI } from '../../api/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, healthResponse] = await Promise.all([
        adminAPI.getDashboardStats(),
        adminAPI.getSystemHealth()
      ]);
      
      setStats(statsResponse.data);
      setHealth(healthResponse.data);
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container fluid className="p-4">
        <div className="text-center py-5">
          <Spinner animation="border" />
          <p className="mt-2">Loading dashboard...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="p-4">
      <Row className="mb-4">
        <Col>
          <h2><i className="fas fa-tachometer-alt me-2"></i>Admin Dashboard</h2>
          <p className="text-muted">Tapido System Overview</p>
        </Col>
      </Row>

      {error && (
        <Row className="mb-3">
          <Col>
            <Alert variant="danger">{error}</Alert>
          </Col>
        </Row>
      )}

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <i className="fas fa-users fa-2x text-primary mb-2"></i>
              <h3 className="mb-1">{stats?.totalUsers || 0}</h3>
              <p className="text-muted mb-0">Total Users</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <i className="fas fa-ticket-alt fa-2x text-success mb-2"></i>
              <h3 className="mb-1">{stats?.totalTickets || 0}</h3>
              <p className="text-muted mb-0">Total Tickets</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <i className="fas fa-rupee-sign fa-2x text-warning mb-2"></i>
              <h3 className="mb-1">₹{stats?.totalRevenue || 0}</h3>
              <p className="text-muted mb-0">Total Revenue</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <i className="fas fa-credit-card fa-2x text-info mb-2"></i>
              <h3 className="mb-1">{stats?.activeSubscriptions || 0}</h3>
              <p className="text-muted mb-0">Active Subscriptions</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* System Health */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header>
              <h5 className="mb-0">
                <i className="fas fa-heartbeat me-2"></i>System Health
              </h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={4} className="mb-3">
                  <div className="d-flex align-items-center">
                    <i className={`fas fa-circle me-2 ${health?.database ? 'text-success' : 'text-danger'}`}></i>
                    <span>Database: {health?.database ? 'Connected' : 'Disconnected'}</span>
                  </div>
                </Col>
                <Col md={4} className="mb-3">
                  <div className="d-flex align-items-center">
                    <i className={`fas fa-circle me-2 ${health?.server ? 'text-success' : 'text-danger'}`}></i>
                    <span>Server: {health?.server ? 'Running' : 'Down'}</span>
                  </div>
                </Col>
                <Col md={4} className="mb-3">
                  <div className="d-flex align-items-center">
                    <i className="fas fa-clock me-2 text-info"></i>
                    <span>Uptime: {health?.uptime || 'N/A'}</span>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Activity */}
      <Row>
        <Col md={6} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Header>
              <h5 className="mb-0">
                <i className="fas fa-chart-line me-2"></i>Recent Tickets
              </h5>
            </Card.Header>
            <Card.Body>
              {stats?.recentTickets?.length > 0 ? (
                stats.recentTickets.map((ticket, index) => (
                  <div key={index} className="d-flex justify-content-between align-items-center mb-2">
                    <div>
                      <strong>{ticket.startStation} → {ticket.endStation}</strong>
                      <br />
                      <small className="text-muted">{ticket.user}</small>
                    </div>
                    <div className="text-end">
                      <div>₹{ticket.fare}</div>
                      <small className="text-muted">{new Date(ticket.createdAt).toLocaleDateString()}</small>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted">No recent tickets</p>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Header>
              <h5 className="mb-0">
                <i className="fas fa-exchange-alt me-2"></i>Recent Transactions
              </h5>
            </Card.Header>
            <Card.Body>
              {stats?.recentTransactions?.length > 0 ? (
                stats.recentTransactions.map((transaction, index) => (
                  <div key={index} className="d-flex justify-content-between align-items-center mb-2">
                    <div>
                      <strong>{transaction.type.toUpperCase()}</strong>
                      <br />
                      <small className="text-muted">{transaction.user}</small>
                    </div>
                    <div className="text-end">
                      <div>₹{transaction.amount}</div>
                      <small className="text-muted">{new Date(transaction.createdAt).toLocaleDateString()}</small>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted">No recent transactions</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AdminDashboard;
