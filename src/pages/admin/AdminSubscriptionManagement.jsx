import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Modal, Form, Alert, Badge, Spinner } from 'react-bootstrap';
import { subscriptionAPI, userAPI } from '../../api/api';

const AdminSubscriptionManagement = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [viewingSubscription, setViewingSubscription] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    planName: 'Family Card',
    amount: '',
    status: 'active',
    startDate: '',
    endDate: '',
    autoRenew: true
  });

  useEffect(() => {
    fetchSubscriptions();
    fetchUsers();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await subscriptionAPI.getAllSubscriptions();
      setSubscriptions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setError('Failed to fetch subscriptions');
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await userAPI.getAllUsers();
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const subscriptionData = {
        ...formData,
        amount: parseFloat(formData.amount),
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null
      };

      if (editingSubscription) {
        await subscriptionAPI.updateSubscription(editingSubscription._id, subscriptionData);
      } else {
        await subscriptionAPI.createSubscription(subscriptionData);
      }
      setShowModal(false);
      setEditingSubscription(null);
      resetForm();
      fetchSubscriptions();
    } catch (error) {
      setError(`Failed to ${editingSubscription ? 'update' : 'create'} subscription`);
    }
  };

  const handleEdit = (subscription) => {
    setEditingSubscription(subscription);
    setFormData({
      userId: subscription.userId?._id || subscription.userId || '',
      planName: subscription.planName || 'Family Card',
      amount: subscription.amount || '',
      status: subscription.status || 'active',
      startDate: subscription.startDate ? new Date(subscription.startDate).toISOString().split('T')[0] : '',
      endDate: subscription.endDate ? new Date(subscription.endDate).toISOString().split('T')[0] : '',
      autoRenew: subscription.autoRenew !== false
    });
    setShowModal(true);
  };

  const handleView = (subscription) => {
    setViewingSubscription(subscription);
    setShowViewModal(true);
  };

  const handleDelete = async (subscriptionId) => {
    if (window.confirm('Are you sure you want to delete this subscription?')) {
      try {
        await subscriptionAPI.deleteSubscription(subscriptionId);
        fetchSubscriptions();
      } catch (error) {
        setError('Failed to delete subscription');
      }
    }
  };

  const handleCancel = async (subscriptionId) => {
    if (window.confirm('Are you sure you want to cancel this subscription?')) {
      try {
        await subscriptionAPI.cancelSubscription(subscriptionId);
        fetchSubscriptions();
      } catch (error) {
        setError('Failed to cancel subscription');
      }
    }
  };

  const handleRenew = async (subscriptionId) => {
    if (window.confirm('Are you sure you want to renew this subscription?')) {
      try {
        await subscriptionAPI.renewSubscription(subscriptionId);
        fetchSubscriptions();
      } catch (error) {
        setError('Failed to renew subscription');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      userId: '',
      planName: 'Family Card',
      amount: '',
      status: 'active',
      startDate: '',
      endDate: '',
      autoRenew: true
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSubscription(null);
    resetForm();
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'active': 'success',
      'expired': 'danger',
      'cancelled': 'secondary',
      'pending': 'warning'
    };
    return statusMap[status] || 'secondary';
  };

  const getUserName = (userId) => {
    if (typeof userId === 'object' && userId?.name) {
      return userId.name;
    }
    const user = users.find(u => u._id === userId);
    return user?.name || 'Unknown User';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Container fluid className="p-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2><i className="fas fa-credit-card me-2"></i>Subscription Management</h2>
            <Button 
              variant="primary" 
              onClick={() => setShowModal(true)}
            >
              <i className="fas fa-plus me-2"></i>Add Subscription
            </Button>
          </div>
        </Col>
      </Row>

      {error && (
        <Row className="mb-3">
          <Col>
            <Alert variant="danger" dismissible onClose={() => setError('')}>
              {error}
            </Alert>
          </Col>
        </Row>
      )}

      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">All Subscriptions ({subscriptions.length})</h5>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" />
                  <p className="mt-2">Loading subscriptions...</p>
                </div>
              ) : (
                <Table responsive striped hover>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>User</th>
                      <th>Plan</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Auto Renew</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((subscription) => (
                      <tr key={subscription._id}>
                        <td>
                          <code>{subscription._id?.slice(-8) || 'N/A'}</code>
                        </td>
                        <td>{getUserName(subscription.userId)}</td>
                        <td><strong>{subscription.planName}</strong></td>
                        <td><strong>₹{subscription.amount || 0}</strong></td>
                        <td>
                          <Badge bg={getStatusBadge(subscription.status)}>
                            {subscription.status}
                          </Badge>
                        </td>
                        <td>{subscription.startDate ? formatDate(subscription.startDate) : 'N/A'}</td>
                        <td>{subscription.endDate ? formatDate(subscription.endDate) : 'N/A'}</td>
                        <td>
                          <Badge bg={subscription.autoRenew ? 'success' : 'secondary'}>
                            {subscription.autoRenew ? 'Yes' : 'No'}
                          </Badge>
                        </td>
                        <td>
                          <Button
                            variant="outline-info"
                            size="sm"
                            className="me-2"
                            onClick={() => handleView(subscription)}
                          >
                            <i className="fas fa-eye"></i>
                          </Button>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                            onClick={() => handleEdit(subscription)}
                          >
                            <i className="fas fa-edit"></i>
                          </Button>
                          {subscription.status === 'active' && (
                            <Button
                              variant="outline-warning"
                              size="sm"
                              className="me-2"
                              onClick={() => handleCancel(subscription._id)}
                            >
                              <i className="fas fa-ban"></i>
                            </Button>
                          )}
                          {(subscription.status === 'expired' || subscription.status === 'cancelled') && (
                            <Button
                              variant="outline-success"
                              size="sm"
                              className="me-2"
                              onClick={() => handleRenew(subscription._id)}
                            >
                              <i className="fas fa-redo"></i>
                            </Button>
                          )}
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(subscription._id)}
                          >
                            <i className="fas fa-trash"></i>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingSubscription ? 'Edit Subscription' : 'Add New Subscription'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>User *</Form.Label>
                  <Form.Select
                    value={formData.userId}
                    onChange={(e) => setFormData({...formData, userId: e.target.value})}
                    required
                  >
                    <option value="">Select User</option>
                    {users.map(user => (
                      <option key={user._id} value={user._id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Plan Name</Form.Label>
                  <Form.Select
                    value={formData.planName}
                    onChange={(e) => setFormData({...formData, planName: e.target.value})}
                  >
                    <option value="Family Card">Family Card</option>
                    <option value="Individual Card">Individual Card</option>
                    <option value="Student Card">Student Card</option>
                    <option value="Senior Card">Senior Card</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Amount (₹) *</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    required
                    placeholder="0.00"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="pending">Pending</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>End Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    label="Auto Renew"
                    checked={formData.autoRenew}
                    onChange={(e) => setFormData({...formData, autoRenew: e.target.checked})}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingSubscription ? 'Update Subscription' : 'Create Subscription'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Subscription Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {viewingSubscription && (
            <Row>
              <Col md={6}>
                <h6>Subscription Information</h6>
                <p><strong>Subscription ID:</strong> {viewingSubscription._id}</p>
                <p><strong>User:</strong> {getUserName(viewingSubscription.userId)}</p>
                <p><strong>Plan Name:</strong> {viewingSubscription.planName}</p>
                <p><strong>Amount:</strong> ₹{viewingSubscription.amount}</p>
              </Col>
              <Col md={6}>
                <h6>Status & Dates</h6>
                <p><strong>Status:</strong> <Badge bg={getStatusBadge(viewingSubscription.status)}>{viewingSubscription.status}</Badge></p>
                <p><strong>Start Date:</strong> {viewingSubscription.startDate ? formatDateTime(viewingSubscription.startDate) : 'N/A'}</p>
                <p><strong>End Date:</strong> {viewingSubscription.endDate ? formatDateTime(viewingSubscription.endDate) : 'N/A'}</p>
                <p><strong>Auto Renew:</strong> <Badge bg={viewingSubscription.autoRenew ? 'success' : 'secondary'}>{viewingSubscription.autoRenew ? 'Yes' : 'No'}</Badge></p>
                <p><strong>Created:</strong> {formatDateTime(viewingSubscription.createdAt)}</p>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminSubscriptionManagement;
