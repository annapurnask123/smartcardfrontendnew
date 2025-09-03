import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Table, Badge, Spinner, Alert } from 'react-bootstrap';
import { adminAPI } from '../../api/api';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [paymentAnalytics, setPaymentAnalytics] = useState(null);
  const [dateRange, setDateRange] = useState([new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()]);
  const [analyticsFilter, setAnalyticsFilter] = useState('monthly');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    fetchSystemHealth();
    fetchPaymentAnalytics();
  }, []);

  useEffect(() => {
    fetchPaymentAnalytics();
  }, [dateRange, analyticsFilter]);

  const fetchDashboardData = async () => {
    try {
      const response = await adminAPI.getDashboardStats();
      setDashboardData(response.data);
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error('Dashboard data error:', err);
    }
  };

  const fetchSystemHealth = async () => {
    try {
      const response = await adminAPI.getSystemHealth();
      setSystemHealth(response.data);
    } catch (err) {
      console.error('System health error:', err);
    }
  };

  const fetchPaymentAnalytics = async () => {
    try {
      const params = {
        startDate: dateRange[0].toISOString().split('T')[0],
        endDate: dateRange[1].toISOString().split('T')[0],
        period: analyticsFilter
      };
      const response = await adminAPI.getPaymentAnalytics(params);
      setPaymentAnalytics(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch payment analytics');
      console.error('Payment analytics error:', err);
      setLoading(false);
    }
  };

  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
  };

  const handleFilterChange = (value) => {
    setAnalyticsFilter(value);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <Spinner animation="border" size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  const revenueData = paymentAnalytics?.monthlyRevenue?.map(item => ({
    month: item._id,
    revenue: item.totalRevenue,
    transactions: item.totalTransactions
  })) || [];

  const ticketStatusData = dashboardData?.data?.ticketStats ? [
    { type: 'Pending', value: dashboardData.data.ticketStats.pending },
    { type: 'Booked', value: dashboardData.data.ticketStats.booked },
    { type: 'In Progress', value: dashboardData.data.ticketStats.inProgress },
    { type: 'Completed', value: dashboardData.data.ticketStats.completed },
    { type: 'Cancelled', value: dashboardData.data.ticketStats.cancelled }
  ] : [];

  const userGrowthData = dashboardData?.data?.userGrowth?.map(item => ({
    month: item._id,
    users: item.count
  })) || [];

  return (
    <div style={{ padding: '24px', background: '#f8f9fa', minHeight: '100vh' }}>
      <Container fluid>
        <h2 className="mb-4">Admin Dashboard</h2>
        
        {/* Key Metrics */}
        <Row className="mb-4">
          <Col xs={12} sm={6} md={3} className="mb-3">
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="text-center">
                <div className="text-success mb-2">
                  <i className="fas fa-users fa-2x"></i>
                </div>
                <h3 className="text-success">{dashboardData?.data?.overview?.totalUsers || 0}</h3>
                <p className="text-muted mb-0">Total Users</p>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} md={3} className="mb-3">
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="text-center">
                <div className="text-primary mb-2">
                  <i className="fas fa-ticket-alt fa-2x"></i>
                </div>
                <h3 className="text-primary">{dashboardData?.data?.overview?.totalTickets || 0}</h3>
                <p className="text-muted mb-0">Total Tickets</p>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} md={3} className="mb-3">
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="text-center">
                <div className="text-danger mb-2">
                  <i className="fas fa-rupee-sign fa-2x"></i>
                </div>
                <h3 className="text-danger">₹{dashboardData?.data?.overview?.totalRevenue || 0}</h3>
                <p className="text-muted mb-0">Total Revenue</p>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} md={3} className="mb-3">
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="text-center">
                <div className="text-warning mb-2">
                  <i className="fas fa-chart-line fa-2x"></i>
                </div>
                <h3 className="text-warning">{dashboardData?.data?.overview?.totalActiveSubscriptions || 0}</h3>
                <p className="text-muted mb-0">Active Subscriptions</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* System Health */}
        {systemHealth && (
          <Row className="mb-4">
            <Col md={4} className="mb-3">
              <Card className="h-100 border-0 shadow-sm">
                <Card.Header className="bg-transparent">
                  <h6 className="mb-0">
                    <i className="fas fa-database me-2"></i>
                    Database Status
                  </h6>
                </Card.Header>
                <Card.Body>
                  <p className="mb-1">
                    <strong>Status: </strong>
                    <Badge bg={systemHealth.database?.status === 'connected' ? 'success' : 'danger'}>
                      {systemHealth.database?.status || 'Unknown'}
                    </Badge>
                  </p>
                  <p className="mb-0">
                    <strong>Collections: </strong>
                    {systemHealth.database?.collections || 0}
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} className="mb-3">
              <Card className="h-100 border-0 shadow-sm">
                <Card.Header className="bg-transparent">
                  <h6 className="mb-0">
                    <i className="fas fa-heart me-2"></i>
                    Server Health
                  </h6>
                </Card.Header>
                <Card.Body>
                  <p className="mb-1">
                    <strong>Uptime: </strong>
                    {Math.floor((systemHealth.server?.uptime || 0) / 3600)}h
                  </p>
                  <p className="mb-0">
                    <strong>Memory: </strong>
                    {((systemHealth.server?.memoryUsage?.used || 0) / 1024 / 1024).toFixed(2)} MB
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} className="mb-3">
              <Card className="h-100 border-0 shadow-sm">
                <Card.Header className="bg-transparent">
                  <h6 className="mb-0">
                    <i className="fas fa-server me-2"></i>
                    API Status
                  </h6>
                </Card.Header>
                <Card.Body>
                  <p className="mb-1">
                    <strong>Response Time: </strong>
                    <Badge bg="success">Good</Badge>
                  </p>
                  <p className="mb-0">
                    <strong>Last Check: </strong>
                    {new Date().toLocaleTimeString()}
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {/* Analytics Controls */}
        <Row className="mb-4">
          <Col>
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <div className="d-flex align-items-center gap-3">
                  <strong>Analytics Period:</strong>
                  <Form.Control
                    type="date"
                    style={{ width: 'auto' }}
                    value={dateRange[0].toISOString().split('T')[0]}
                    onChange={(e) => setDateRange([new Date(e.target.value), dateRange[1]])}
                  />
                  <span>to</span>
                  <Form.Control
                    type="date"
                    style={{ width: 'auto' }}
                    value={dateRange[1].toISOString().split('T')[0]}
                    onChange={(e) => setDateRange([dateRange[0], new Date(e.target.value)])}
                  />
                  <Form.Select style={{ width: 'auto' }} value={analyticsFilter} onChange={(e) => setAnalyticsFilter(e.target.value)}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </Form.Select>
                  <Button variant="primary" onClick={fetchPaymentAnalytics}>
                    Refresh
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Charts */}
        <Row className="mb-4">
          <Col xs={12} lg={6}>
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-transparent">
                <h5 className="mb-0">Revenue Trend</h5>
              </Card.Header>
              <Card.Body>
                {/* Revenue Trend Chart */}
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} lg={6}>
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-transparent">
                <h5 className="mb-0">User Growth</h5>
              </Card.Header>
              <Card.Body>
                {/* User Growth Chart */}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Recent Activity */}
        <Row>
          <Col>
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-transparent">
                <h5 className="mb-0">Recent Activity</h5>
              </Card.Header>
              <Card.Body>
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>User</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData?.data?.recentTransactions?.slice(0, 10).map((transaction, index) => (
                      <tr key={index}>
                        <td>
                          <Badge bg="secondary">{transaction.type}</Badge>
                        </td>
                        <td>₹{transaction.amount}</td>
                        <td>{transaction.userId}</td>
                        <td>{new Date(transaction.createdAt).toLocaleDateString()}</td>
                      </tr>
                    )) || (
                      <tr>
                        <td colSpan="4" className="text-center text-muted">
                          No recent transactions
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default AdminDashboard;
