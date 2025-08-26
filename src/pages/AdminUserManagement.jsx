import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Modal, Badge, Spinner, Alert, Tabs, Tab } from 'react-bootstrap';
import { adminAPI } from '../api/api';

const AdminUserManagement = () => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetailsVisible, setUserDetailsVisible] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [pagination.current, pagination.pageSize, searchTerm]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchTerm
      };
      const response = await adminAPI.getUsers(params);
      
      // Add null checks and default values
      const userData = response.data || {};
      setUsers(userData.users || []);
      setPagination(prev => ({
        ...prev,
        total: userData.total || 0
      }));
    } catch (error) {
      console.error('Fetch users error:', error);
      // Set empty array on error to prevent map error
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId) => {
    setDetailsLoading(true);
    try {
      const response = await adminAPI.getUserDetails(userId);
      setUserDetails(response.data || {});
    } catch (error) {
      console.error('Fetch user details error:', error);
      setUserDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchUsers();
  };

  const handleViewUser = async (user) => {
    setSelectedUser(user);
    setUserDetailsVisible(true);
    await fetchUserDetails(user._id || user.id);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div style={{ padding: '24px', background: '#f8f9fa', minHeight: '100vh' }}>
      <Container fluid>
        <h2 className="mb-4">User Management</h2>
        
        <Card className="mb-4 border-0 shadow-sm">
          <Card.Body>
            <Row className="align-items-center">
              <Col md={8}>
                <Form onSubmit={handleSearch} className="d-flex">
                  <Form.Control
                    type="text"
                    placeholder="Search users by name, email, or phone"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="me-2"
                  />
                  <Button type="submit" variant="outline-primary">
                    <i className="fas fa-search"></i>
                  </Button>
                </Form>
              </Col>
              <Col md={4} className="text-end">
                <Button variant="primary" onClick={fetchUsers}>
                  <i className="fas fa-sync-alt me-2"></i>
                  Refresh
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <Card className="border-0 shadow-sm">
          <Card.Body>
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" />
                <p className="mt-2">Loading users...</p>
              </div>
            ) : (
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="text-center py-4">
                        <Spinner animation="border" size="sm" className="me-2" />
                        Loading users...
                      </td>
                    </tr>
                  ) : users && users.length > 0 ? (
                    users.map((user) => (
                      <tr key={user._id || user.id}>
                        <td>
                          <code>{(user._id || user.id || '').slice(-8)}</code>
                        </td>
                        <td>{user.name || 'N/A'}</td>
                        <td>{user.email || 'N/A'}</td>
                        <td>{user.phoneNumber || 'N/A'}</td>
                        <td>
                          <Badge bg={user.isActive ? 'success' : 'secondary'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</td>
                        <td>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleViewUser(user)}
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center py-4 text-muted">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            )}

            {/* Pagination */}
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div>
                Showing {Math.min((pagination.current - 1) * pagination.pageSize + 1, pagination.total)} to{' '}
                {Math.min(pagination.current * pagination.pageSize, pagination.total)} of {pagination.total} users
              </div>
              <div>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="me-2"
                  disabled={pagination.current <= 1}
                  onClick={() => setPagination(prev => ({ ...prev, current: prev.current - 1 }))}
                >
                  Previous
                </Button>
                <span className="mx-2">
                  Page {pagination.current} of {Math.ceil(pagination.total / pagination.pageSize) || 1}
                </span>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="ms-2"
                  disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
                  onClick={() => setPagination(prev => ({ ...prev, current: prev.current + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* User Details Modal */}
        <Modal
          show={userDetailsVisible}
          onHide={() => setUserDetailsVisible(false)}
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>User Details</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {detailsLoading ? (
              <div className="text-center py-4">
                <Spinner animation="border" />
                <p className="mt-2">Loading user details...</p>
              </div>
            ) : userDetails && selectedUser ? (
              <Tabs defaultActiveKey="profile">
                <Tab eventKey="profile" title="Profile">
                  <div className="mt-3">
                    <Row>
                      <Col md={6}>
                        <p><strong>Name:</strong> {selectedUser.name}</p>
                        <p><strong>Email:</strong> {selectedUser.email}</p>
                        <p><strong>Phone:</strong> {selectedUser.phoneNumber}</p>
                      </Col>
                      <Col md={6}>
                        <p>
                          <strong>Role:</strong>{' '}
                          <Badge bg={selectedUser.role === 'admin' ? 'danger' : 'primary'}>
                            {selectedUser.role?.toUpperCase()}
                          </Badge>
                        </p>
                        <p>
                          <strong>Status:</strong>{' '}
                          <Badge bg={selectedUser.isActive ? 'success' : 'secondary'}>
                            {selectedUser.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </p>
                        <p><strong>Joined:</strong> {formatDate(selectedUser.createdAt)}</p>
                      </Col>
                    </Row>
                  </div>
                </Tab>

                <Tab eventKey="statistics" title="Statistics">
                  <div className="mt-3">
                    <Row>
                      <Col md={3} className="mb-3">
                        <Card className="text-center border-0 bg-light">
                          <Card.Body>
                            <i className="fas fa-ticket-alt fa-2x text-primary mb-2"></i>
                            <h4>{userDetails.tickets?.length || 0}</h4>
                            <small className="text-muted">Total Tickets</small>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={3} className="mb-3">
                        <Card className="text-center border-0 bg-light">
                          <Card.Body>
                            <i className="fas fa-credit-card fa-2x text-success mb-2"></i>
                            <h4>{userDetails.subscriptions?.filter(s => s.status === 'active').length || 0}</h4>
                            <small className="text-muted">Active Subscriptions</small>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={3} className="mb-3">
                        <Card className="text-center border-0 bg-light">
                          <Card.Body>
                            <i className="fas fa-id-card fa-2x text-info mb-2"></i>
                            <h4>{userDetails.cards?.length || 0}</h4>
                            <small className="text-muted">Virtual Cards</small>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={3} className="mb-3">
                        <Card className="text-center border-0 bg-light">
                          <Card.Body>
                            <i className="fas fa-wallet fa-2x text-warning mb-2"></i>
                            <h4>₹{userDetails.wallet?.balance || 0}</h4>
                            <small className="text-muted">Wallet Balance</small>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>
                  </div>
                </Tab>

                <Tab eventKey="tickets" title="Tickets">
                  <div className="mt-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {userDetails.tickets?.length > 0 ? (
                      userDetails.tickets.slice(0, 10).map((ticket, index) => (
                        <Card key={index} className="mb-2 border-0 bg-light">
                          <Card.Body className="py-2">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <strong>{ticket.startStationName} → {ticket.endStationName}</strong>
                                <div className="small text-muted">
                                  ₹{ticket.totalFare} • {formatDate(ticket.createdAt)}
                                </div>
                              </div>
                              <Badge bg={
                                ticket.status === 'completed' ? 'success' :
                                ticket.status === 'in_progress' ? 'primary' :
                                ticket.status === 'cancelled' ? 'danger' : 'warning'
                              }>
                                {ticket.status}
                              </Badge>
                            </div>
                          </Card.Body>
                        </Card>
                      ))
                    ) : (
                      <p className="text-muted text-center py-3">No tickets found</p>
                    )}
                  </div>
                </Tab>

                <Tab eventKey="transactions" title="Transactions">
                  <div className="mt-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {userDetails.transactions?.length > 0 ? (
                      userDetails.transactions.slice(0, 10).map((transaction, index) => (
                        <Card key={index} className="mb-2 border-0 bg-light">
                          <Card.Body className="py-2">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <strong>{transaction.type.toUpperCase()}</strong>
                                <div className="small text-muted">
                                  {new Date(transaction.createdAt).toLocaleDateString()} {new Date(transaction.createdAt).toLocaleTimeString()}
                                </div>
                              </div>
                              <div className="text-end">
                                <div><strong>₹{transaction.amount}</strong></div>
                                <Badge bg={transaction.status === 'completed' ? 'success' : 'warning'}>
                                  {transaction.status}
                                </Badge>
                              </div>
                            </div>
                          </Card.Body>
                        </Card>
                      ))
                    ) : (
                      <p className="text-muted text-center py-3">No transactions found</p>
                    )}
                  </div>
                </Tab>
              </Tabs>
            ) : null}
          </Modal.Body>
        </Modal>
      </Container>
    </div>
  );
};

export default AdminUserManagement;
