import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Modal, Badge, Spinner, Alert, Tabs, Tab, Dropdown } from 'react-bootstrap';
import { adminAPI } from '../api/api';

const AdminModelManagement = () => {
  const [selectedModel, setSelectedModel] = useState('users');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDetailsVisible, setItemDetailsVisible] = useState(false);
  const [itemDetails, setItemDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const models = [
    { key: 'users', label: 'Users', icon: 'fas fa-users' },
    { key: 'tickets', label: 'Tickets', icon: 'fas fa-ticket-alt' },
    { key: 'payments', label: 'Payments', icon: 'fas fa-credit-card' },
    { key: 'subscriptions', label: 'Subscriptions', icon: 'fas fa-calendar-check' },
    { key: 'virtualcards', label: 'Virtual Cards', icon: 'fas fa-id-card' },
    { key: 'transactions', label: 'Transactions', icon: 'fas fa-exchange-alt' },
    { key: 'wallets', label: 'Wallets', icon: 'fas fa-wallet' },
    { key: 'stations', label: 'Stations', icon: 'fas fa-map-marker-alt' },
    { key: 'routes', label: 'Routes', icon: 'fas fa-route' },
    { key: 'schedules', label: 'Schedules', icon: 'fas fa-clock' },
    { key: 'plans', label: 'Subscription Plans', icon: 'fas fa-list-alt' },
    { key: 'notifications', label: 'Notifications', icon: 'fas fa-bell' },
    { key: 'journeys', label: 'User Journeys', icon: 'fas fa-map-signs' },
    { key: 'fares', label: 'Fares', icon: 'fas fa-dollar-sign' },
    { key: 'agencies', label: 'Agencies', icon: 'fas fa-building' }
  ];

  useEffect(() => {
    fetchData();
  }, [selectedModel, pagination.current, pagination.pageSize, searchTerm]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchTerm
      };
      const response = await adminAPI.getModelData(selectedModel, params);
      
      const responseData = response.data || {};
      setData(responseData.items || []);
      setPagination(prev => ({
        ...prev,
        total: responseData.total || 0
      }));
    } catch (error) {
      console.error('Fetch data error:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchItemDetails = async (itemId) => {
    setDetailsLoading(true);
    try {
      const response = await adminAPI.getModelItem(selectedModel, itemId);
      setItemDetails(response.data || {});
    } catch (error) {
      console.error('Fetch item details error:', error);
      setItemDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleViewItem = async (item) => {
    setSelectedItem(item);
    setItemDetailsVisible(true);
    await fetchItemDetails(item._id || item.id);
  };

  const handleDeleteItem = async (item) => {
    if (window.confirm(`Are you sure you want to delete this ${selectedModel.slice(0, -1)}?`)) {
      try {
        await adminAPI.deleteModelItem(selectedModel, item._id || item.id);
        fetchData();
        alert('Item deleted successfully');
      } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete item');
      }
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchData();
  };

  const renderTableHeaders = () => {
    const headerMap = {
      users: ['ID', 'Name', 'Email', 'Phone', 'Role', 'Status', 'Actions'],
      tickets: ['ID', 'User', 'Source', 'Destination', 'Status', 'Amount', 'Actions'],
      payments: ['ID', 'User', 'Amount', 'Status', 'Method', 'Date', 'Actions'],
      subscriptions: ['ID', 'User', 'Plan', 'Status', 'Start Date', 'End Date', 'Actions'],
      virtualcards: ['ID', 'User', 'Card Number', 'Status', 'Balance', 'Created', 'Actions'],
      transactions: ['ID', 'User', 'Type', 'Amount', 'Status', 'Date', 'Actions'],
      wallets: ['ID', 'User', 'Balance', 'Status', 'Last Updated', 'Actions'],
      stations: ['ID', 'Name', 'Code', 'Location', 'Status', 'Actions'],
      routes: ['ID', 'Name', 'Short Name', 'Type', 'Status', 'Actions'],
      schedules: ['ID', 'Route', 'Departure', 'Arrival', 'Status', 'Actions'],
      plans: ['ID', 'Name', 'Price', 'Duration', 'Features', 'Status', 'Actions'],
      notifications: ['ID', 'User', 'Title', 'Type', 'Status', 'Date', 'Actions'],
      journeys: ['ID', 'User', 'Source', 'Destination', 'Status', 'Date', 'Actions'],
      fares: ['ID', 'From', 'To', 'Amount', 'Type', 'Actions'],
      agencies: ['ID', 'Name', 'Code', 'Contact', 'Status', 'Actions']
    };

    return headerMap[selectedModel] || ['ID', 'Data', 'Actions'];
  };

  const renderTableRow = (item) => {
    const commonId = item._id || item.id || 'N/A';
    
    switch (selectedModel) {
      case 'users':
        return (
          <tr key={commonId}>
            <td><code>{commonId.slice(-8)}</code></td>
            <td>{item.name || 'N/A'}</td>
            <td>{item.email || 'N/A'}</td>
            <td>{item.phoneNumber || 'N/A'}</td>
            <td>
              <Badge bg={item.role === 'admin' ? 'danger' : 'primary'}>
                {(item.role || 'user').toUpperCase()}
              </Badge>
            </td>
            <td>
              <Badge bg={item.isActive ? 'success' : 'secondary'}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </td>
            <td>{renderActions(item)}</td>
          </tr>
        );
      
      case 'tickets':
        return (
          <tr key={commonId}>
            <td><code>{commonId.slice(-8)}</code></td>
            <td>{item.user?.name || item.userId || 'N/A'}</td>
            <td>{item.sourceStation?.name || item.source || 'N/A'}</td>
            <td>{item.destinationStation?.name || item.destination || 'N/A'}</td>
            <td>
              <Badge bg={getStatusColor(item.status)}>
                {(item.status || 'pending').toUpperCase()}
              </Badge>
            </td>
            <td>₹{item.amount || 0}</td>
            <td>{renderActions(item)}</td>
          </tr>
        );
      
      case 'payments':
        return (
          <tr key={commonId}>
            <td><code>{commonId.slice(-8)}</code></td>
            <td>{item.user?.name || item.userId || 'N/A'}</td>
            <td>₹{item.amount || 0}</td>
            <td>
              <Badge bg={getStatusColor(item.status)}>
                {(item.status || 'pending').toUpperCase()}
              </Badge>
            </td>
            <td>{item.paymentMethod || 'N/A'}</td>
            <td>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}</td>
            <td>{renderActions(item)}</td>
          </tr>
        );
      
      default:
        return (
          <tr key={commonId}>
            <td><code>{commonId.slice(-8)}</code></td>
            <td>{JSON.stringify(item).slice(0, 100)}...</td>
            <td>{renderActions(item)}</td>
          </tr>
        );
    }
  };

  const renderActions = (item) => (
    <div className="d-flex gap-2">
      <Button
        variant="outline-primary"
        size="sm"
        onClick={() => handleViewItem(item)}
      >
        <i className="fas fa-eye"></i>
      </Button>
      <Button
        variant="outline-danger"
        size="sm"
        onClick={() => handleDeleteItem(item)}
      >
        <i className="fas fa-trash"></i>
      </Button>
    </div>
  );

  const getStatusColor = (status) => {
    const statusColors = {
      active: 'success',
      inactive: 'secondary',
      pending: 'warning',
      completed: 'success',
      failed: 'danger',
      cancelled: 'secondary',
      paid: 'success',
      unpaid: 'warning'
    };
    return statusColors[status?.toLowerCase()] || 'secondary';
  };

  return (
    <Container fluid className="p-4">
      <Row>
        <Col>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h4 className="mb-0">
                <i className="fas fa-database me-2"></i>
                Model Management
              </h4>
              <Dropdown>
                <Dropdown.Toggle variant="primary" size="sm">
                  <i className={models.find(m => m.key === selectedModel)?.icon}></i>
                  {' '}
                  {models.find(m => m.key === selectedModel)?.label}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  {models.map(model => (
                    <Dropdown.Item
                      key={model.key}
                      onClick={() => setSelectedModel(model.key)}
                      active={selectedModel === model.key}
                    >
                      <i className={`${model.icon} me-2`}></i>
                      {model.label}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Card.Header>

            <Card.Body>
              {/* Search */}
              <Form onSubmit={handleSearch} className="mb-3">
                <Row>
                  <Col md={8}>
                    <Form.Control
                      type="text"
                      placeholder={`Search ${selectedModel}...`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </Col>
                  <Col md={4}>
                    <Button type="submit" variant="outline-primary" className="w-100">
                      <i className="fas fa-search me-2"></i>
                      Search
                    </Button>
                  </Col>
                </Row>
              </Form>

              {/* Data Table */}
              <Table responsive striped hover>
                <thead className="table-dark">
                  <tr>
                    {renderTableHeaders().map((header, index) => (
                      <th key={index}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={renderTableHeaders().length} className="text-center py-4">
                        <Spinner animation="border" size="sm" className="me-2" />
                        Loading {selectedModel}...
                      </td>
                    </tr>
                  ) : data && data.length > 0 ? (
                    data.map(renderTableRow)
                  ) : (
                    <tr>
                      <td colSpan={renderTableHeaders().length} className="text-center py-4 text-muted">
                        No {selectedModel} found
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>

              {/* Pagination */}
              <div className="d-flex justify-content-between align-items-center mt-3">
                <div>
                  Showing {Math.min((pagination.current - 1) * pagination.pageSize + 1, pagination.total)} to{' '}
                  {Math.min(pagination.current * pagination.pageSize, pagination.total)} of {pagination.total} {selectedModel}
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
        </Col>
      </Row>

      {/* Item Details Modal */}
      <Modal
        show={itemDetailsVisible}
        onHide={() => setItemDetailsVisible(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedModel.slice(0, -1).toUpperCase()} Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {detailsLoading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
              <p className="mt-2">Loading details...</p>
            </div>
          ) : itemDetails ? (
            <pre className="bg-light p-3 rounded" style={{ maxHeight: '400px', overflow: 'auto' }}>
              {JSON.stringify(itemDetails, null, 2)}
            </pre>
          ) : (
            <Alert variant="warning">No details available</Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setItemDetailsVisible(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminModelManagement;
