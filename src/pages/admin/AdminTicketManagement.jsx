import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Modal, Form, Alert, Badge, Spinner } from 'react-bootstrap';
import { ticketAPI, stationAPI, userAPI } from '../../api/api';

const AdminTicketManagement = () => {
  const [tickets, setTickets] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [viewingTicket, setViewingTicket] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [formData, setFormData] = useState({
    startStationId: '',
    endStationId: '',
    price: '',
    status: 'active',
    paymentMethod: 'razorpay',
    userId: ''
  });

  useEffect(() => {
    fetchTickets();
    fetchStations();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await ticketAPI.getAllTickets();
      setTickets(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setError('Failed to fetch tickets');
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStations = async () => {
    try {
      const response = await stationAPI.getAllStations();
      setStations(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching stations:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTicket) {
        await ticketAPI.updateTicket(editingTicket._id, formData);
      } else {
        await ticketAPI.bookTicket(formData);
      }
      setShowModal(false);
      setEditingTicket(null);
      resetForm();
      fetchTickets();
    } catch (error) {
      setError(`Failed to ${editingTicket ? 'update' : 'create'} ticket`);
    }
  };

  const handleEdit = (ticket) => {
    setEditingTicket(ticket);
    setFormData({
      startStationId: ticket.startStationId?._id || ticket.startStationId || '',
      endStationId: ticket.endStationId?._id || ticket.endStationId || '',
      price: ticket.price || '',
      status: ticket.status || 'active',
      paymentMethod: ticket.paymentMethod || 'razorpay',
      userId: ticket.userId?._id || ticket.userId || ''
    });
    setShowModal(true);
  };

  const handleView = (ticket) => {
    setViewingTicket(ticket);
    setShowViewModal(true);
  };

  const handleDelete = async (ticketId) => {
    if (window.confirm('Are you sure you want to delete this ticket?')) {
      try {
        await ticketAPI.cancelTicket(ticketId);
        fetchTickets();
      } catch (error) {
        setError('Failed to delete ticket');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      startStationId: '',
      endStationId: '',
      price: '',
      status: 'active',
      paymentMethod: 'razorpay',
      userId: ''
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTicket(null);
    resetForm();
  };

  const getStationName = (stationId) => {
    const station = stations.find(s => s._id === stationId);
    return station ? station.name : 'Unknown Station';
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'active': 'primary',
      'in_progress': 'warning',
      'completed': 'success',
      'cancelled': 'danger',
      'expired': 'secondary'
    };
    return statusMap[status] || 'secondary';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Container fluid className="p-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2><i className="fas fa-ticket-alt me-2"></i>Ticket Management</h2>
            <Button 
              variant="primary" 
              onClick={() => setShowModal(true)}
            >
              <i className="fas fa-plus me-2"></i>Add Ticket
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
              <h5 className="mb-0">All Tickets ({tickets.length})</h5>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" />
                  <p className="mt-2">Loading tickets...</p>
                </div>
              ) : (
                <Table responsive striped hover>
                  <thead>
                    <tr>
                      <th>Ticket ID</th>
                      <th>Route</th>
                      <th>User</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket) => (
                      <tr key={ticket._id}>
                        <td><code>{ticket.ticketId || ticket._id}</code></td>
                        <td>
                          <div>
                            <i className="fas fa-circle text-success me-1"></i>
                            {getStationName(ticket.startStationId)}
                          </div>
                          <div>
                            <i className="fas fa-circle text-danger me-1"></i>
                            {getStationName(ticket.endStationId)}
                          </div>
                        </td>
                        <td>{ticket.userId?.name || ticket.userId || 'N/A'}</td>
                        <td><strong>₹{ticket.price}</strong></td>
                        <td>
                          <Badge bg={getStatusBadge(ticket.status)}>
                            {ticket.status}
                          </Badge>
                        </td>
                        <td>{formatDate(ticket.createdAt)}</td>
                        <td>
                          <Button
                            variant="outline-info"
                            size="sm"
                            className="me-2"
                            onClick={() => handleView(ticket)}
                          >
                            <i className="fas fa-eye"></i>
                          </Button>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                            onClick={() => handleEdit(ticket)}
                          >
                            <i className="fas fa-edit"></i>
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(ticket._id)}
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
            {editingTicket ? 'Edit Ticket' : 'Add New Ticket'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Station *</Form.Label>
                  <Form.Select
                    value={formData.startStationId}
                    onChange={(e) => setFormData({...formData, startStationId: e.target.value})}
                    required
                  >
                    <option value="">Select Start Station</option>
                    {stations.map(station => (
                      <option key={station._id} value={station._id}>
                        {station.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>End Station *</Form.Label>
                  <Form.Select
                    value={formData.endStationId}
                    onChange={(e) => setFormData({...formData, endStationId: e.target.value})}
                    required
                  >
                    <option value="">Select End Station</option>
                    {stations.map(station => (
                      <option key={station._id} value={station._id}>
                        {station.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Price (₹) *</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    required
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
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="expired">Expired</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Payment Method</Form.Label>
                  <Form.Select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                  >
                    <option value="razorpay">Razorpay</option>
                    <option value="wallet">Wallet</option>
                    <option value="subscription">Subscription</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>User ID</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.userId}
                    onChange={(e) => setFormData({...formData, userId: e.target.value})}
                    placeholder="Enter User ID"
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
              {editingTicket ? 'Update Ticket' : 'Create Ticket'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Ticket Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {viewingTicket && (
            <Row>
              <Col md={6}>
                <h6>Basic Information</h6>
                <p><strong>Ticket ID:</strong> {viewingTicket.ticketId || viewingTicket._id}</p>
                <p><strong>Status:</strong> <Badge bg={getStatusBadge(viewingTicket.status)}>{viewingTicket.status}</Badge></p>
                <p><strong>Price:</strong> ₹{viewingTicket.price}</p>
                <p><strong>Payment Method:</strong> {viewingTicket.paymentMethod}</p>
              </Col>
              <Col md={6}>
                <h6>Journey Details</h6>
                <p><strong>From:</strong> {getStationName(viewingTicket.startStationId)}</p>
                <p><strong>To:</strong> {getStationName(viewingTicket.endStationId)}</p>
                <p><strong>Created:</strong> {formatDate(viewingTicket.createdAt)}</p>
                {viewingTicket.tapInTime && <p><strong>Tap In:</strong> {formatDate(viewingTicket.tapInTime)}</p>}
                {viewingTicket.tapOutTime && <p><strong>Tap Out:</strong> {formatDate(viewingTicket.tapOutTime)}</p>}
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

export default AdminTicketManagement;
