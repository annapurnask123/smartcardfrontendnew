import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Modal, Form, Alert, Badge, Spinner, Dropdown } from 'react-bootstrap';
import { adminAPI } from '../../api/api';

const AdminModelManagement = () => {
  const [selectedModel, setSelectedModel] = useState('users');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [formData, setFormData] = useState({});
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0
  });

  const availableModels = {
    users: { name: 'Users', icon: 'fas fa-users' },
    tickets: { name: 'Tickets', icon: 'fas fa-ticket-alt' },
    payments: { name: 'Payments', icon: 'fas fa-credit-card' },
    subscriptions: { name: 'Subscriptions', icon: 'fas fa-calendar-check' },
    virtualcards: { name: 'Virtual Cards', icon: 'fas fa-id-card' },
    transactions: { name: 'Transactions', icon: 'fas fa-exchange-alt' },
    wallets: { name: 'Wallets', icon: 'fas fa-wallet' },
    stations: { name: 'Stations', icon: 'fas fa-map-marker-alt' },
    routes: { name: 'Routes', icon: 'fas fa-route' },
    schedules: { name: 'Schedules', icon: 'fas fa-clock' },
    plans: { name: 'Subscription Plans', icon: 'fas fa-list-alt' },
    notifications: { name: 'Notifications', icon: 'fas fa-bell' },
    journeys: { name: 'User Journeys', icon: 'fas fa-road' },
    fares: { name: 'Fares', icon: 'fas fa-money-bill' },
    agencies: { name: 'Agencies', icon: 'fas fa-building' }
  };

  useEffect(() => {
    fetchItems();
  }, [selectedModel, pagination.currentPage]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getModelData(selectedModel, {
        page: pagination.currentPage,
        limit: 20
      });
      
      if (response.data && response.data.success) {
        setItems(response.data.data.items || []);
        setPagination({
          currentPage: response.data.data.page || 1,
          totalPages: response.data.data.totalPages || 1,
          total: response.data.data.total || 0
        });
      } else {
        setItems([]);
      }
    } catch (error) {
      setError(`Failed to fetch ${selectedModel}: ${error.response?.data?.message || error.message}`);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await adminAPI.updateModelItem(selectedModel, editingItem._id, formData);
      } else {
        await adminAPI.createModelItem(selectedModel, formData);
      }
      setShowModal(false);
      setEditingItem(null);
      resetForm();
      fetchItems();
    } catch (error) {
      setError(`Failed to ${editingItem ? 'update' : 'create'} ${selectedModel}: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({ ...item });
    setShowModal(true);
  };

  const handleView = (item) => {
    setViewingItem(item);
    setShowViewModal(true);
  };

  const handleDelete = async (itemId) => {
    if (window.confirm(`Are you sure you want to delete this ${selectedModel} item?`)) {
      try {
        await adminAPI.deleteModelItem(selectedModel, itemId);
        fetchItems();
      } catch (error) {
        setError(`Failed to delete ${selectedModel}: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  const resetForm = () => {
    setFormData({});
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
    resetForm();
  };

  const handleModelChange = (model) => {
    setSelectedModel(model);
    setPagination({ currentPage: 1, totalPages: 1, total: 0 });
    setItems([]);
    setError('');
  };

  const renderTableHeaders = () => {
    const commonHeaders = ['ID', 'Created', 'Actions'];
    const modelSpecificHeaders = {
      users: ['Name', 'Email', 'Role', 'Status'],
      tickets: ['Ticket ID', 'Route', 'Status', 'Price'],
      payments: ['Amount', 'Status', 'Method', 'User'],
      subscriptions: ['Plan', 'User', 'Status', 'Dates'],
      virtualcards: ['Card Number', 'User', 'Balance', 'Status'],
      transactions: ['Type', 'Amount', 'User', 'Status'],
      wallets: ['User', 'Balance', 'Status'],
      stations: ['Name', 'Code', 'Location'],
      routes: ['Name', 'From', 'To', 'Distance'],
      schedules: ['Route', 'Departure', 'Arrival'],
      plans: ['Name', 'Price', 'Duration', 'Type'],
      notifications: ['Title', 'Type', 'User', 'Read'],
      journeys: ['User', 'From', 'To', 'Status'],
      fares: ['From', 'To', 'Amount', 'Type'],
      agencies: ['Name', 'Code', 'Contact']
    };

    return [...(modelSpecificHeaders[selectedModel] || []), ...commonHeaders];
  };

  const renderTableRow = (item) => {
    const formatDate = (date) => new Date(date).toLocaleDateString();
    const formatCurrency = (amount) => `₹${amount || 0}`;

    const cellRenderers = {
      users: [
        item.name || 'N/A',
        item.email || 'N/A',
        <Badge bg={item.role === 'admin' ? 'danger' : 'primary'}>{item.role || 'user'}</Badge>,
        <Badge bg={item.isActive ? 'success' : 'secondary'}>{item.isActive ? 'Active' : 'Inactive'}</Badge>
      ],
      tickets: [
        item.ticketId || item._id?.slice(-8),
        `${item.startStationId?.name || 'Unknown'} → ${item.endStationId?.name || 'Unknown'}`,
        <Badge bg={item.status === 'completed' ? 'success' : item.status === 'cancelled' ? 'danger' : 'warning'}>{item.status}</Badge>,
        formatCurrency(item.price)
      ],
      payments: [
        formatCurrency(item.amount),
        <Badge bg={item.status === 'paid' ? 'success' : item.status === 'failed' ? 'danger' : 'warning'}>{item.status}</Badge>,
        item.paymentMethod || 'N/A',
        item.userId?.name || item.user?.name || 'N/A'
      ],
      subscriptions: [
        item.planId?.name || item.plan?.name || 'Unknown Plan',
        item.user?.name || 'N/A',
        <Badge bg={item.status === 'active' ? 'success' : 'secondary'}>{item.status}</Badge>,
        `${formatDate(item.startDate)} - ${formatDate(item.endDate)}`
      ],
      virtualcards: [
        item.cardNumber || 'N/A',
        item.user?.name || 'N/A',
        formatCurrency(item.balance),
        <Badge bg={item.isActive ? 'success' : 'secondary'}>{item.isActive ? 'Active' : 'Inactive'}</Badge>
      ]
    };

    const defaultRenderer = [
      item.name || item.title || item._id?.slice(-8) || 'N/A',
      item.type || item.status || 'N/A',
      item.amount ? formatCurrency(item.amount) : 'N/A',
      item.user?.name || item.userId?.name || 'N/A'
    ];

    const cells = cellRenderers[selectedModel] || defaultRenderer;
    
    return [
      ...cells,
      <code>{item._id?.slice(-8)}</code>,
      formatDate(item.createdAt),
      (
        <div>
          <Button variant="outline-info" size="sm" className="me-1" onClick={() => handleView(item)}>
            <i className="fas fa-eye"></i>
          </Button>
          <Button variant="outline-primary" size="sm" className="me-1" onClick={() => handleEdit(item)}>
            <i className="fas fa-edit"></i>
          </Button>
          <Button variant="outline-danger" size="sm" onClick={() => handleDelete(item._id)}>
            <i className="fas fa-trash"></i>
          </Button>
        </div>
      )
    ];
  };

  const renderFormFields = () => {
    const commonFields = ['name', 'description', 'status'];
    const modelFields = {
      users: ['name', 'email', 'phone', 'password', 'role', 'isActive'],
      tickets: ['startStationId', 'endStationId', 'price', 'status', 'paymentMethod'],
      payments: ['amount', 'status', 'paymentMethod', 'userId'],
      subscriptions: ['planId', 'userId', 'status', 'startDate', 'endDate'],
      virtualcards: ['cardNumber', 'userId', 'balance', 'isActive'],
      stations: ['name', 'code', 'location', 'latitude', 'longitude'],
      routes: ['name', 'fromStation', 'toStation', 'distance'],
      plans: ['name', 'price', 'duration', 'type', 'description'],
      notifications: ['title', 'message', 'type', 'userId'],
      fares: ['fromStation', 'toStation', 'amount', 'type']
    };

    const fields = modelFields[selectedModel] || commonFields;

    return fields.map(field => (
      <Form.Group key={field} className="mb-3">
        <Form.Label>{field.charAt(0).toUpperCase() + field.slice(1)}</Form.Label>
        {field === 'status' ? (
          <Form.Select
            value={formData[field] || ''}
            onChange={(e) => setFormData({...formData, [field]: e.target.value})}
          >
            <option value="">Select Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Form.Select>
        ) : field === 'isActive' ? (
          <Form.Check
            type="checkbox"
            checked={formData[field] || false}
            onChange={(e) => setFormData({...formData, [field]: e.target.checked})}
          />
        ) : field === 'role' ? (
          <Form.Select
            value={formData[field] || 'user'}
            onChange={(e) => setFormData({...formData, [field]: e.target.value})}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </Form.Select>
        ) : field.includes('Date') ? (
          <Form.Control
            type="date"
            value={formData[field] ? new Date(formData[field]).toISOString().split('T')[0] : ''}
            onChange={(e) => setFormData({...formData, [field]: e.target.value})}
          />
        ) : (
          <Form.Control
            type={field === 'password' ? 'password' : field === 'email' ? 'email' : field.includes('price') || field.includes('amount') || field.includes('balance') ? 'number' : 'text'}
            value={formData[field] || ''}
            onChange={(e) => setFormData({...formData, [field]: e.target.value})}
            placeholder={`Enter ${field}`}
          />
        )}
      </Form.Group>
    ));
  };

  return (
    <Container fluid className="p-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2><i className="fas fa-database me-2"></i>Model Management</h2>
            <div className="d-flex gap-2">
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary">
                  <i className={availableModels[selectedModel]?.icon}></i> {availableModels[selectedModel]?.name}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  {Object.entries(availableModels).map(([key, model]) => (
                    <Dropdown.Item key={key} onClick={() => handleModelChange(key)}>
                      <i className={model.icon}></i> {model.name}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
              <Button variant="primary" onClick={() => setShowModal(true)}>
                <i className="fas fa-plus me-2"></i>Add {availableModels[selectedModel]?.name}
              </Button>
            </div>
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
              <h5 className="mb-0">{availableModels[selectedModel]?.name} ({pagination.total})</h5>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" />
                  <p className="mt-2">Loading {selectedModel}...</p>
                </div>
              ) : (
                <Table responsive striped hover>
                  <thead>
                    <tr>
                      {renderTableHeaders().map((header, index) => (
                        <th key={index}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item._id}>
                        {renderTableRow(item).map((cell, index) => (
                          <td key={index}>{cell}</td>
                        ))}
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
            {editingItem ? 'Edit' : 'Add'} {availableModels[selectedModel]?.name}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col>
                {renderFormFields()}
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{availableModels[selectedModel]?.name} Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {viewingItem && (
            <Row>
              <Col>
                <pre>{JSON.stringify(viewingItem, null, 2)}</pre>
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

export default AdminModelManagement;
