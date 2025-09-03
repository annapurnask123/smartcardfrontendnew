import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Modal, Form, Alert, Badge, Spinner } from 'react-bootstrap';
import { adminAPI, subscriptionPlanAPI } from '../../api/api';

const AdminSubscriptionManagement = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [viewingSubscription, setViewingSubscription] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formData, setFormData] = useState({
    userId: '',
    planId: '',
    status: 'active',
    startDate: '',
    endDate: '',
    autoRenew: true
  });

  useEffect(() => {
    fetchSubscriptions();
    fetchPlans();
  }, [currentPage, searchTerm, statusFilter]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 20,
        search: searchTerm,
        status: statusFilter
      };
      const response = await adminAPI.getAllSubscriptions(params);
      
      if (response.data && response.data.success) {
        setSubscriptions(Array.isArray(response.data.subscriptions) ? response.data.subscriptions : []);
        setTotalPages(response.data.pagination?.totalPages || 1);
      } else {
        setSubscriptions([]);
      }
    } catch (error) {
      setError('Failed to fetch subscriptions');
      console.error('Error fetching subscriptions:', error);
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await subscriptionPlanAPI.getAll();
      setPlans(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSubscription) {
        await adminAPI.updateSubscription(editingSubscription._id, formData);
      } else {
        await adminAPI.createSubscription(formData);
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
      planId: subscription.planId?._id || subscription.planId || '',
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

  const handleCancel = async (subscriptionId) => {
    if (window.confirm('Are you sure you want to cancel this subscription?')) {
      try {
        await adminAPI.cancelSubscription(subscriptionId);
        fetchSubscriptions();
      } catch (error) {
        setError('Failed to cancel subscription');
      }
    }
  };

  const handleRenew = async (subscriptionId) => {
    if (window.confirm('Are you sure you want to renew this subscription?')) {
      try {
        await adminAPI.renewSubscription(subscriptionId);
        fetchSubscriptions();
      } catch (error) {
        setError('Failed to renew subscription');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      userId: '',
      planId: '',
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

  const getPlanName = (planId) => {
    const plan = plans.find(p => p._id === planId);
    return plan ? plan.name : 'Unknown Plan';
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'active': 'success',
      'expired': 'warning',
      'cancelled': 'danger',
      'pending': 'info'
    };
    return statusMap[status] || 'secondary';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
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
                      <th>User</th>
                      <th>Plan</th>
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
                        <td>{subscription.userId?.name || subscription.userId || 'N/A'}</td>
                        <td><strong>{getPlanName(subscription.planId)}</strong></td>
                        <td>
                          <Badge bg={getStatusBadge(subscription.status)}>
                            {subscription.status}
                          </Badge>
                        </td>
                        <td>{formatDate(subscription.startDate)}</td>
                        <td>{formatDate(subscription.endDate)}</td>
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
                          {subscription.status === 'expired' && (
                            <Button
                              variant="outline-success"
                              size="sm"
                              className="me-2"
                              onClick={() => handleRenew(subscription._id)}
                            >
                              <i className="fas fa-redo"></i>
                            </Button>
                          )}
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
                  <Form.Label>User ID *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.userId}
                    onChange={(e) => setFormData({...formData, userId: e.target.value})}
                    required
                    placeholder="Enter User ID"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Plan *</Form.Label>
                  <Form.Select
                    value={formData.planId}
                    onChange={(e) => setFormData({...formData, planId: e.target.value})}
                    required
                  >
                    <option value="">Select Plan</option>
                    {plans.map(plan => (
                      <option key={plan._id} value={plan._id}>
                        {plan.name} - ₹{plan.price}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row>
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
              <Col md={6}>
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
                <h6>Basic Information</h6>
                <p><strong>ID:</strong> {viewingSubscription._id}</p>
                <p><strong>User:</strong> {viewingSubscription.userId?.name || viewingSubscription.userId}</p>
                <p><strong>Plan:</strong> {getPlanName(viewingSubscription.planId)}</p>
                <p><strong>Status:</strong> <Badge bg={getStatusBadge(viewingSubscription.status)}>{viewingSubscription.status}</Badge></p>
              </Col>
              <Col md={6}>
                <h6>Subscription Details</h6>
                <p><strong>Start Date:</strong> {formatDate(viewingSubscription.startDate)}</p>
                <p><strong>End Date:</strong> {formatDate(viewingSubscription.endDate)}</p>
                <p><strong>Auto Renew:</strong> <Badge bg={viewingSubscription.autoRenew ? 'success' : 'secondary'}>{viewingSubscription.autoRenew ? 'Yes' : 'No'}</Badge></p>
                <p><strong>Created:</strong> {formatDate(viewingSubscription.createdAt)}</p>
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
