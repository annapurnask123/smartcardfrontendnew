import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Modal, Form, Alert, Badge, Spinner } from 'react-bootstrap';
import { stationAPI } from '../../api/api';

const AdminStationManagement = () => {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStation, setEditingStation] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    coordinates: { lat: '', lng: '' },
    address: '',
    isActive: true
  });

  useEffect(() => {
    fetchStations();
  }, []);

  const fetchStations = async () => {
    try {
      setLoading(true);
      const response = await stationAPI.getAllStations();
      setStations(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setError('Failed to fetch stations');
      console.error('Error fetching stations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const stationData = {
        ...formData,
        coordinates: {
          lat: parseFloat(formData.coordinates.lat),
          lng: parseFloat(formData.coordinates.lng)
        }
      };

      if (editingStation) {
        await stationAPI.updateStation(editingStation._id, stationData);
      } else {
        await stationAPI.createStation(stationData);
      }
      setShowModal(false);
      setEditingStation(null);
      resetForm();
      fetchStations();
    } catch (error) {
      setError(`Failed to ${editingStation ? 'update' : 'create'} station`);
    }
  };

  const handleEdit = (station) => {
    setEditingStation(station);
    setFormData({
      name: station.name || '',
      code: station.code || '',
      coordinates: {
        lat: station.coordinates?.lat || '',
        lng: station.coordinates?.lng || ''
      },
      address: station.address || '',
      isActive: station.isActive !== false
    });
    setShowModal(true);
  };

  const handleDelete = async (stationId) => {
    if (window.confirm('Are you sure you want to delete this station?')) {
      try {
        await stationAPI.deleteStation(stationId);
        fetchStations();
      } catch (error) {
        setError('Failed to delete station');
      }
    }
  };

  const handleToggleStatus = async (stationId, currentStatus) => {
    try {
      await stationAPI.updateStation(stationId, { isActive: !currentStatus });
      fetchStations();
    } catch (error) {
      setError('Failed to update station status');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      coordinates: { lat: '', lng: '' },
      address: '',
      isActive: true
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingStation(null);
    resetForm();
  };

  return (
    <Container fluid className="p-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2><i className="fas fa-map-marker-alt me-2"></i>Station Management</h2>
            <Button 
              variant="primary" 
              onClick={() => setShowModal(true)}
            >
              <i className="fas fa-plus me-2"></i>Add Station
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
              <h5 className="mb-0">All Stations ({stations.length})</h5>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" />
                  <p className="mt-2">Loading stations...</p>
                </div>
              ) : (
                <Table responsive striped hover>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Code</th>
                      <th>Coordinates</th>
                      <th>Address</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stations.map((station) => (
                      <tr key={station._id}>
                        <td><strong>{station.name}</strong></td>
                        <td><code>{station.code}</code></td>
                        <td>
                          {station.coordinates ? 
                            `${station.coordinates.lat}, ${station.coordinates.lng}` : 
                            'N/A'
                          }
                        </td>
                        <td>{station.address || 'N/A'}</td>
                        <td>
                          <Badge bg={station.isActive ? 'success' : 'danger'}>
                            {station.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                            onClick={() => handleEdit(station)}
                          >
                            <i className="fas fa-edit"></i>
                          </Button>
                          <Button
                            variant={station.isActive ? "outline-warning" : "outline-success"}
                            size="sm"
                            className="me-2"
                            onClick={() => handleToggleStatus(station._id, station.isActive)}
                          >
                            <i className={`fas fa-${station.isActive ? 'ban' : 'check'}`}></i>
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(station._id)}
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
            {editingStation ? 'Edit Station' : 'Add New Station'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Station Name *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    placeholder="Enter station name"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Station Code *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    required
                    placeholder="Enter station code"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Latitude</Form.Label>
                  <Form.Control
                    type="number"
                    step="any"
                    value={formData.coordinates.lat}
                    onChange={(e) => setFormData({
                      ...formData, 
                      coordinates: {...formData.coordinates, lat: e.target.value}
                    })}
                    placeholder="Enter latitude"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Longitude</Form.Label>
                  <Form.Control
                    type="number"
                    step="any"
                    value={formData.coordinates.lng}
                    onChange={(e) => setFormData({
                      ...formData, 
                      coordinates: {...formData.coordinates, lng: e.target.value}
                    })}
                    placeholder="Enter longitude"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label>Address</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Enter station address"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    label="Active Station"
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
              {editingStation ? 'Update Station' : 'Create Station'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default AdminStationManagement;
