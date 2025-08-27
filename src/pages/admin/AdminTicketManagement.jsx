import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Modal, Form, Alert, Badge, Spinner } from 'react-bootstrap';
import { ticketAPI, stationAPI, userAPI } from '../../api/api';

const AdminTicketManagement = () => {
  const [tickets, setTickets] = useState([]);
  const [stations, setStations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [viewingTicket, setViewingTicket] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    startStationId: '',
    endStationId: '',
    totalFare: '',
    status: 'pending',
    validUntil: ''
  });

  useEffect(() => {
    fetchTickets();
    fetchStations();
    fetchUsers();
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
      const ticketData = {
        ...formData,
        totalFare: parseFloat(formData.totalFare),
        validUntil: formData.validUntil ? new Date(formData.validUntil).toISOString() : null
      };

      if (editingTicket) {
        await ticketAPI.updateTicket(editingTicket._id, ticketData);
      } else {
        await ticketAPI.createTicket(ticketData);
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
      userId: ticket.userId?._id || ticket.userId || '',
      startStationId: ticket.startStationId?._id || ticket.startStationId || '',
      endStationId: ticket.endStationId?._id || ticket.endStationId || '',
      totalFare: ticket.totalFare || '',
      status: ticket.status || 'pending',
      validUntil: ticket.validUntil ? new Date(ticket.validUntil).toISOString().split('T')[0] : ''
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
        await ticketAPI.deleteTicket(ticketId);
        fetchTickets();
      } catch (error) {
        setError('Failed to delete ticket');
      }
    }
  };

  const handleUpdateStatus = async (ticketId, newStatus) => {
    try {
      await ticketAPI.updateTicket(ticketId, { status: newStatus });
      fetchTickets();
    } catch (error) {
      setError('Failed to update ticket status');
    }
  };

  const resetForm = () => {
    setFormData({
      userId: '',
      startStationId: '',
      endStationId: '',
      totalFare: '',
      status: 'pending',
      validUntil: ''
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTicket(null);
    resetForm();
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'pending': 'warning',
      'in_progress': 'primary',
      'completed': 'success',
      'cancelled': 'danger'
    };
    return statusMap[status] || 'secondary';
  };

  const getStationName = (stationId) => {
    if (typeof stationId === 'object' && stationId?.name) {
      return stationId.name;
    }
    const station = stations.find(s => s._id === stationId);
    return station?.name || 'Unknown Station';
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
                      <th>ID</th>
                      <th>User</th>
                      <th>Route</th>
                      <th>Fare</th>
                      <th>Status</th>
                      <th>Valid Until</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket) => (
                      <tr key={ticket._id}>
                        <td>
                          <code>{ticket._id?.slice(-8) || 'N/A'}</code>
                        </td>
                        <td>{getUserName(ticket.userId)}</td>
                        <td>
                          {getStationName(ticket.startStationId)} → {getStationName(ticket.endStationId)}
                        </td>
                        <td><strong>₹{ticket.totalFare || 0}</strong></td>
                        <td>
                          <Badge bg={getStatusBadge(ticket.status)}>
                            {ticket.status}
                          </Badge>
                        </td>
                        <td>{ticket.validUntil ? formatDate(ticket.validUntil) : 'N/A'}</td>
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
                          {ticket.status === 'pending' && (
                            <>
                              <Button
                                variant="outline-success"
                                size="sm"
                                className="me-2"
                                onClick={() => handleUpdateStatus(ticket._id, 'in_progress')}
                              >
                                <i className="fas fa-play"></i>
                              </Button>
                              <Button
                                variant="outline-warning"
                                size="sm"
                                className="me-2"
                                onClick={() => handleUpdateStatus(ticket._id, 'cancelled')}
                              >
                                <i className="fas fa-ban"></i>
                              </Button>
                            </>
                          )}
                          {ticket.status === 'in_progress' && (
                            <Button
                              variant="outline-success"
                              size="sm"
                              className="me-2"
                              onClick={() => handleUpdateStatus(ticket._id, 'completed')}
                            >
                              <i className="fas fa-check"></i>
                            </Button>
                          )}
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
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
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
                  <Form.Label>Total Fare (₹) *</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={formData.totalFare}
                    onChange={(e) => setFormData({...formData, totalFare: e.target.value})}
                    required
                    placeholder="0.00"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Valid Until</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({...formData, validUntil: e.target.value})}
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
                <h6>Ticket Information</h6>
                <p><strong>Ticket ID:</strong> {viewingTicket._id}</p>
                <p><strong>User:</strong> {getUserName(viewingTicket.userId)}</p>
                <p><strong>Route:</strong> {getStationName(viewingTicket.startStationId)} → {getStationName(viewingTicket.endStationId)}</p>
                <p><strong>Total Fare:</strong> ₹{viewingTicket.totalFare}</p>
              </Col>
              <Col md={6}>
                <h6>Status & Dates</h6>
                <p><strong>Status:</strong> <Badge bg={getStatusBadge(viewingTicket.status)}>{viewingTicket.status}</Badge></p>
                <p><strong>Created:</strong> {formatDateTime(viewingTicket.createdAt)}</p>
                <p><strong>Valid Until:</strong> {viewingTicket.validUntil ? formatDateTime(viewingTicket.validUntil) : 'N/A'}</p>
                <p><strong>QR Code:</strong> {viewingTicket.qrCode ? 'Generated' : 'Not Available'}</p>
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
