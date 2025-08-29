import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Modal, Form, Alert, Badge, Spinner } from 'react-bootstrap';
import { cardAPI, userAPI } from '../../api/api';

const AdminCardManagement = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [viewingCard, setViewingCard] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    cardNumber: '',
    cardType: 'primary',
    balance: '',
    isActive: true,
    expiryDate: ''
  });

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const response = await cardAPI.getAllCards();
      setCards(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setError('Failed to fetch cards');
      console.error('Error fetching cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCard) {
        await cardAPI.updateCard(editingCard._id, formData);
      } else {
        await cardAPI.createCard(formData);
      }
      setShowModal(false);
      setEditingCard(null);
      resetForm();
      fetchCards();
    } catch (error) {
      setError(`Failed to ${editingCard ? 'update' : 'create'} card`);
    }
  };

  const handleEdit = (card) => {
    setEditingCard(card);
    setFormData({
      userId: card.userId?._id || card.userId || '',
      cardNumber: card.cardNumber || '',
      cardType: card.cardType || 'primary',
      balance: card.balance || '',
      isActive: card.isActive !== false,
      expiryDate: card.expiryDate ? new Date(card.expiryDate).toISOString().split('T')[0] : ''
    });
    setShowModal(true);
  };

  const handleView = (card) => {
    setViewingCard(card);
    setShowViewModal(true);
  };

  const handleDelete = async (cardId) => {
    if (window.confirm('Are you sure you want to delete this card?')) {
      try {
        await cardAPI.deleteCard(cardId);
        fetchCards();
      } catch (error) {
        setError('Failed to delete card');
      }
    }
  };

  const handleRecharge = async (cardId) => {
    const amount = prompt('Enter recharge amount (₹):');
    if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
      try {
        await cardAPI.rechargeCard(cardId, { amount: parseFloat(amount) });
        fetchCards();
      } catch (error) {
        setError('Failed to recharge card');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      userId: '',
      cardNumber: '',
      cardType: 'primary',
      balance: '',
      isActive: true,
      expiryDate: ''
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCard(null);
    resetForm();
  };

  const getCardTypeBadge = (type) => {
    const typeMap = {
      'primary': 'primary',
      'secondary': 'secondary',
      'family': 'info'
    };
    return typeMap[type] || 'secondary';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US');
  };

  const generateCardNumber = () => {
    const cardNumber = '4000' + Math.random().toString().slice(2, 14);
    setFormData({...formData, cardNumber});
  };

  return (
    <Container fluid className="p-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2><i className="fas fa-id-card me-2"></i>Virtual Card Management</h2>
            <Button 
              variant="primary" 
              onClick={() => setShowModal(true)}
            >
              <i className="fas fa-plus me-2"></i>Add Card
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
              <h5 className="mb-0">All Virtual Cards ({cards.length})</h5>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" />
                  <p className="mt-2">Loading cards...</p>
                </div>
              ) : (
                <Table responsive striped hover>
                  <thead>
                    <tr>
                      <th>Card Number</th>
                      <th>User</th>
                      <th>Type</th>
                      <th>Balance</th>
                      <th>Status</th>
                      <th>Expiry</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cards.map((card) => (
                      <tr key={card._id}>
                        <td>
                          <code>****{card.cardNumber?.slice(-4) || '0000'}</code>
                        </td>
                        <td>{card.userId?.name || card.userId || 'N/A'}</td>
                        <td>
                          <Badge bg={getCardTypeBadge(card.cardType)}>
                            {card.cardType}
                          </Badge>
                        </td>
                        <td><strong>₹{card.balance || 0}</strong></td>
                        <td>
                          <Badge bg={card.isActive ? 'success' : 'danger'}>
                            {card.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td>{card.expiryDate ? formatDate(card.expiryDate) : 'N/A'}</td>
                        <td>
                          <Button
                            variant="outline-info"
                            size="sm"
                            className="me-2"
                            onClick={() => handleView(card)}
                          >
                            <i className="fas fa-eye"></i>
                          </Button>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                            onClick={() => handleEdit(card)}
                          >
                            <i className="fas fa-edit"></i>
                          </Button>
                          <Button
                            variant="outline-success"
                            size="sm"
                            className="me-2"
                            onClick={() => handleRecharge(card._id)}
                          >
                            <i className="fas fa-plus-circle"></i>
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(card._id)}
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
            {editingCard ? 'Edit Card' : 'Add New Card'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="userId">
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
                <Form.Group className="mb-3" controlId="cardNumber">
                  <Form.Label>Card Number *</Form.Label>
                  <div className="d-flex">
                    <Form.Control
                      type="text"
                      value={formData.cardNumber}
                      onChange={(e) => setFormData({...formData, cardNumber: e.target.value})}
                      required
                      placeholder="Enter card number"
                    />
                    <Button
                      variant="outline-secondary"
                      className="ms-2"
                      type="button"
                      onClick={generateCardNumber}
                    >
                      Generate
                    </Button>
                  </div>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="cardType">
                  <Form.Label>Card Type</Form.Label>
                  <Form.Select
                    value={formData.cardType}
                    onChange={(e) => setFormData({...formData, cardType: e.target.value})}
                  >
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                    <option value="family">Family</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="initialBalance">
                  <Form.Label>Initial Balance (₹)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={formData.balance}
                    onChange={(e) => setFormData({...formData, balance: e.target.value})}
                    placeholder="0.00"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Expiry Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    label="Active Card"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
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
              {editingCard ? 'Update Card' : 'Create Card'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Card Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {viewingCard && (
            <Row>
              <Col md={6}>
                <h6>Basic Information</h6>
                <p><strong>Card ID:</strong> {viewingCard._id}</p>
                <p><strong>Card Number:</strong> <code>{viewingCard.cardNumber}</code></p>
                <p><strong>User:</strong> {viewingCard.userId?.name || viewingCard.userId}</p>
                <p><strong>Type:</strong> <Badge bg={getCardTypeBadge(viewingCard.cardType)}>{viewingCard.cardType}</Badge></p>
              </Col>
              <Col md={6}>
                <h6>Card Summary</h6>
                <p><strong>Balance:</strong> ₹{viewingCard.balance || 0}</p>
                <p><strong>Status:</strong> <Badge bg={viewingCard.isActive ? 'success' : 'danger'}>{viewingCard.isActive ? 'Active' : 'Inactive'}</Badge></p>
                <p><strong>Expiry Date:</strong> {viewingCard.expiryDate ? formatDate(viewingCard.expiryDate) : 'N/A'}</p>
                <p><strong>Created:</strong> {formatDate(viewingCard.createdAt)}</p>
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

export default AdminCardManagement;
