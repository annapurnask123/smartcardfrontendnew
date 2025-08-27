import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Modal, Form, Alert, Badge, Spinner } from 'react-bootstrap';
import { routeAPI, stationAPI } from '../../api/api';

const AdminRouteManagement = () => {
  const [routes, setRoutes] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    startStationId: '',
    endStationId: '',
    distance: '',
    estimatedTime: '',
    isActive: true
  });

  useEffect(() => {
    fetchRoutes();
    fetchStations();
  }, []);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const response = await routeAPI.getAllRoutes();
      setRoutes(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setError('Failed to fetch routes');
      console.error('Error fetching routes:', error);
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
      const routeData = {
        ...formData,
        distance: parseFloat(formData.distance),
        estimatedTime: parseInt(formData.estimatedTime)
      };

      if (editingRoute) {
        await routeAPI.updateRoute(editingRoute._id, routeData);
      } else {
        await routeAPI.createRoute(routeData);
      }
      setShowModal(false);
      setEditingRoute(null);
      resetForm();
      fetchRoutes();
    } catch (error) {
      setError(`Failed to ${editingRoute ? 'update' : 'create'} route`);
    }
  };

  const handleEdit = (route) => {
    setEditingRoute(route);
    setFormData({
      name: route.name || '',
      startStationId: route.startStationId?._id || route.startStationId || '',
      endStationId: route.endStationId?._id || route.endStationId || '',
      distance: route.distance || '',
      estimatedTime: route.estimatedTime || '',
      isActive: route.isActive !== false
    });
    setShowModal(true);
  };

  const handleDelete = async (routeId) => {
    if (window.confirm('Are you sure you want to delete this route?')) {
      try {
        await routeAPI.deleteRoute(routeId);
        fetchRoutes();
      } catch (error) {
        setError('Failed to delete route');
      }
    }
  };

  const handleToggleStatus = async (routeId, currentStatus) => {
    try {
      await routeAPI.updateRoute(routeId, { isActive: !currentStatus });
      fetchRoutes();
    } catch (error) {
      setError('Failed to update route status');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      startStationId: '',
      endStationId: '',
      distance: '',
      estimatedTime: '',
      isActive: true
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRoute(null);
    resetForm();
  };

  const getStationName = (stationId) => {
    if (typeof stationId === 'object' && stationId?.name) {
      return stationId.name;
    }
    const station = stations.find(s => s._id === stationId);
    return station?.name || 'Unknown Station';
  };

  return (
    <Container fluid className="p-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2><i className="fas fa-route me-2"></i>Route Management</h2>
            <Button 
              variant="primary" 
              onClick={() => setShowModal(true)}
            >
              <i className="fas fa-plus me-2"></i>Add Route
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
              <h5 className="mb-0">All Routes ({routes.length})</h5>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" />
                  <p className="mt-2">Loading routes...</p>
                </div>
              ) : (
                <Table responsive striped hover>
                  <thead>
                    <tr>
                      <th>Route Name</th>
                      <th>Start Station</th>
                      <th>End Station</th>
                      <th>Distance</th>
                      <th>Est. Time</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routes.map((route) => (
                      <tr key={route._id}>
                        <td><strong>{route.name}</strong></td>
                        <td>{getStationName(route.startStationId)}</td>
                        <td>{getStationName(route.endStationId)}</td>
                        <td>{route.distance} km</td>
                        <td>{route.estimatedTime} min</td>
                        <td>
                          <Badge bg={route.isActive ? 'success' : 'danger'}>
                            {route.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                            onClick={() => handleEdit(route)}
                          >
                            <i className="fas fa-edit"></i>
                          </Button>
                          <Button
                            variant={route.isActive ? "outline-warning" : "outline-success"}
                            size="sm"
                            className="me-2"
                            onClick={() => handleToggleStatus(route._id, route.isActive)}
                          >
                            <i className={`fas fa-${route.isActive ? 'ban' : 'check'}`}></i>
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(route._id)}
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
            {editingRoute ? 'Edit Route' : 'Add New Route'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Route Name *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    placeholder="Enter route name"
                  />
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
                  <Form.Label>Distance (km)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.1"
                    value={formData.distance}
                    onChange={(e) => setFormData({...formData, distance: e.target.value})}
                    placeholder="Enter distance in km"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Estimated Time (minutes)</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.estimatedTime}
                    onChange={(e) => setFormData({...formData, estimatedTime: e.target.value})}
                    placeholder="Enter estimated time"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    label="Active Route"
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
              {editingRoute ? 'Update Route' : 'Create Route'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default AdminRouteManagement;
