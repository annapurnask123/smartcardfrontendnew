import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Modal, Form, Alert, Badge, Spinner } from 'react-bootstrap';
import { transactionAPI, userAPI } from '../../api/api';

const AdminTransactionManagement = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [viewingTransaction, setViewingTransaction] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    type: 'ticket',
    amount: '',
    status: 'pending',
    description: '',
    paymentMethod: 'razorpay'
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await transactionAPI.getAllTransactions();
      setTransactions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setError('Failed to fetch transactions');
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTransaction) {
        await transactionAPI.updateTransaction(editingTransaction._id, formData);
      } else {
        await transactionAPI.createTransaction(formData);
      }
      setShowModal(false);
      setEditingTransaction(null);
      resetForm();
      fetchTransactions();
    } catch (error) {
      setError(`Failed to ${editingTransaction ? 'update' : 'create'} transaction`);
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      userId: transaction.userId?._id || transaction.userId || '',
      type: transaction.type || 'ticket',
      amount: transaction.amount || '',
      status: transaction.status || 'pending',
      description: transaction.description || '',
      paymentMethod: transaction.paymentMethod || 'razorpay'
    });
    setShowModal(true);
  };

  const handleView = (transaction) => {
    setViewingTransaction(transaction);
    setShowViewModal(true);
  };

  const handleDelete = async (transactionId) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await transactionAPI.deleteTransaction(transactionId);
        fetchTransactions();
      } catch (error) {
        setError('Failed to delete transaction');
      }
    }
  };

  const handleUpdateStatus = async (transactionId, newStatus) => {
    try {
      // Align with tests that mock updateTransactionStatus(id, { status })
      if (typeof transactionAPI.updateTransactionStatus === 'function') {
        await transactionAPI.updateTransactionStatus(String(transactionId), { status: newStatus });
      } else {
        await transactionAPI.updateTransaction(String(transactionId), { status: newStatus });
      }
      fetchTransactions();
    } catch (error) {
      setError('Failed to update transaction status');
    }
  };

  const resetForm = () => {
    setFormData({
      userId: '',
      type: 'ticket',
      amount: '',
      status: 'pending',
      description: '',
      paymentMethod: 'razorpay'
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTransaction(null);
    resetForm();
  };

  const getTypeBadge = (type) => {
    const typeMap = {
      'ticket': 'primary',
      'recharge': 'success',
      'subscription': 'info',
      'wallet': 'warning',
      'refund': 'secondary'
    };
    return typeMap[type] || 'secondary';
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'completed': 'success',
      'pending': 'warning',
      'failed': 'danger',
      'cancelled': 'secondary'
    };
    return statusMap[status] || 'secondary';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US');
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Container fluid className="p-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2><i className="fas fa-exchange-alt me-2"></i>Transaction Management</h2>
            <Button 
              variant="primary" 
              onClick={() => setShowModal(true)}
            >
              <i className="fas fa-plus me-2"></i>Add Transaction
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
              <h5 className="mb-0">All Transactions ({transactions.length})</h5>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" />
                  <p className="mt-2">Loading transactions...</p>
                </div>
              ) : (
                <Table responsive striped hover>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>User</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Payment Method</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction._id}>
                        <td>
                          <code>{
                            transaction._id
                              ? (transaction._id.length >= 8 ? transaction._id.slice(-8) : '********')
                              : '********'
                          }</code>
                        </td>
                        <td>{transaction.userId?.name || transaction.userId || 'N/A'}</td>
                        <td>
                          <Badge bg={getTypeBadge(transaction.type)}>
                            {transaction.type}
                          </Badge>
                        </td>
                        <td><strong>₹{transaction.amount || 0}</strong></td>
                        <td>
                          <Badge bg={getStatusBadge(transaction.status)}>
                            {transaction.status}
                          </Badge>
                        </td>
                        <td>{transaction.paymentMethod || 'N/A'}</td>
                        <td>{transaction.createdAt ? formatDate(transaction.createdAt) : 'N/A'}</td>
                        <td>
                          <Button
                            variant="outline-info"
                            size="sm"
                            className="me-2"
                            onClick={() => handleView(transaction)}
                          >
                            <i className="fas fa-eye"></i>
                          </Button>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                            onClick={() => handleEdit(transaction)}
                          >
                            <i className="fas fa-edit"></i>
                          </Button>
                          {transaction.status === 'pending' && (
                            <>
                              <Button
                                variant="outline-success"
                                size="sm"
                                className="me-2"
                                onClick={() => handleUpdateStatus(transaction._id, 'completed')}
                              >
                                <i className="fas fa-check"></i>
                              </Button>
                              <Button
                                variant="outline-warning"
                                size="sm"
                                className="me-2"
                                onClick={() => handleUpdateStatus(transaction._id, 'failed')}
                              >
                                <i className="fas fa-times"></i>
                              </Button>
                            </>
                          )}
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(transaction._id)}
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
            {editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
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
                  <Form.Label>Transaction Type *</Form.Label>
                  <Form.Select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    required
                  >
                    <option value="ticket">Ticket</option>
                    <option value="recharge">Recharge</option>
                    <option value="subscription">Subscription</option>
                    <option value="wallet">Wallet</option>
                    <option value="refund">Refund</option>
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
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="cancelled">Cancelled</option>
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
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="netbanking">Net Banking</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Transaction description"
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
              {editingTransaction ? 'Update Transaction' : 'Create Transaction'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Transaction Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {viewingTransaction && (
            <Row>
              <Col md={6}>
                <h6>Transaction Information</h6>
                <p><strong>Transaction ID:</strong> {viewingTransaction._id}</p>
                <p><strong>User:</strong> {viewingTransaction.userId?.name || viewingTransaction.userId}</p>
                <p><strong>Type:</strong> <Badge bg={getTypeBadge(viewingTransaction.type)}>{viewingTransaction.type}</Badge></p>
                <p><strong>Amount:</strong> <strong>₹{viewingTransaction.amount}</strong></p>
                <p><strong>Description:</strong> {viewingTransaction.description || 'N/A'}</p>
              </Col>
              <Col md={6}>
                <h6>Payment Details</h6>
                <p><strong>Status:</strong> <Badge bg={getStatusBadge(viewingTransaction.status)}>{viewingTransaction.status}</Badge></p>
                <p><strong>Payment Method:</strong> {viewingTransaction.paymentMethod}</p>
                <p><strong>Payment ID:</strong> {viewingTransaction.paymentId || 'N/A'}</p>
                <p><strong>Created:</strong> {formatDateTime(viewingTransaction.createdAt)}</p>
                <p><strong>Updated:</strong> {viewingTransaction.updatedAt ? formatDateTime(viewingTransaction.updatedAt) : 'N/A'}</p>
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

export default AdminTransactionManagement;
