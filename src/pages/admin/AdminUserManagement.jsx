import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Modal, Form, Alert, Badge, Spinner } from 'react-bootstrap';
import { adminAPI } from '../../api/api';

const AdminUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'user',
    isActive: true,
    password: ''
  });

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        search: searchTerm
      };
      const response = await adminAPI.getUsers(params);
      
      if (response.data) {
        setUsers(Array.isArray(response.data.users) ? response.data.users : response.data);
        setTotalPages(response.data.totalPages || 1);
      }
    } catch (error) {
      setError('Failed to fetch users');
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewUserDetails = async (userId) => {
    try {
      const response = await adminAPI.getUserDetails(userId);
      setViewingUser(response.data);
      setShowViewModal(true);
    } catch (error) {
      setError('Failed to fetch user details');
      console.error('Error fetching user details:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // Don't send password if it's empty during edit
        const updateData = { ...formData };
        if (!updateData.password) {
          delete updateData.password;
        }
        await adminAPI.updateUser(editingUser._id, updateData);
      } else {
        await adminAPI.createUser(formData);
      }
      setShowModal(false);
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: 'user',
        isActive: true,
        password: ''
      });
      fetchUsers();
    } catch (error) {
      setError('Failed to save user');
      console.error('Error saving user:', error);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'user',
      isActive: user.isActive !== false,
      password: ''
    });
    setShowModal(true);
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        setLoading(true);
        const response = await adminAPI.deleteUser(userId);
        
        if (response.data && response.data.success) {
          setError('');
          fetchUsers(); // Refresh the user list
        } else {
          throw new Error(response.data?.message || 'Delete failed');
        }
      } catch (error) {
        setError(`Failed to delete user: ${error.response?.data?.error || error.message}`);
        console.error('Error deleting user:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'user',
      isActive: true,
      password: ''
    });
    setEditingUser(null);
    setShowModal(false);
  };

  if (loading) {
    return (
      <Container className="mt-4 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Row>
        <Col>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h4>User Management</h4>
              <Button variant="primary" onClick={() => setShowModal(true)}>
                Add User
              </Button>
            </Card.Header>
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              
              {/* Search Bar */}
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Control
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </Col>
              </Row>

              {/* Users Table */}
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.phone || 'N/A'}</td>
                      <td>
                        <Badge bg={user.role === 'admin' ? 'danger' : 'primary'}>
                          {user.role}
                        </Badge>
                      </td>
                      <td>
                        <Badge bg={user.isActive ? 'success' : 'secondary'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        <Button
                          variant="info"
                          size="sm"
                          className="me-2"
                          onClick={() => viewUserDetails(user._id)}
                        >
                          View
                        </Button>
                        <Button
                          variant="warning"
                          size="sm"
                          className="me-2"
                          onClick={() => handleEdit(user)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(user._id)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="d-flex justify-content-center">
                  <Button
                    variant="outline-primary"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="me-2"
                  >
                    Previous
                  </Button>
                  <span className="align-self-center mx-3">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline-primary"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Add/Edit User Modal */}
      <Modal show={showModal} onHide={resetForm}>
        <Modal.Header closeButton>
          <Modal.Title>{editingUser ? 'Edit User' : 'Add New User'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label htmlFor="user-name">Name</Form.Label>
              <Form.Control
                id="user-name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label htmlFor="user-email">Email</Form.Label>
              <Form.Control
                id="user-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label htmlFor="user-phone">Phone</Form.Label>
              <Form.Control
                id="user-phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label htmlFor="user-role">Role</Form.Label>
              <Form.Select
                id="user-role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label htmlFor="user-password">Password {editingUser && '(leave blank to keep current)'}</Form.Label>
              <Form.Control
                id="user-password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required={!editingUser}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Check
                id="user-active"
                type="checkbox"
                name="isActive"
                label="Active"
                checked={formData.isActive}
                onChange={handleInputChange}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingUser ? 'Update User' : 'Create User'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* View User Details Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>User Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {viewingUser && (
            <div>
              <Row>
                <Col md={6}>
                  <h6>Basic Information</h6>
                  <p><strong>Name:</strong> {viewingUser.name}</p>
                  <p><strong>Email:</strong> {viewingUser.email}</p>
                  <p><strong>Phone:</strong> {viewingUser.phone || 'N/A'}</p>
                  <p><strong>Role:</strong> {viewingUser.role}</p>
                  <p><strong>Status:</strong> {viewingUser.isActive ? 'Active' : 'Inactive'}</p>
                  <p><strong>Created:</strong> {new Date(viewingUser.createdAt).toLocaleString()}</p>
                </Col>
                <Col md={6}>
                  <h6>Statistics</h6>
                  <p><strong>Total Cards:</strong> {viewingUser.cards?.length || 0}</p>
                  <p><strong>Total Subscriptions:</strong> {viewingUser.subscriptions?.length || 0}</p>
                  <p><strong>Total Tickets:</strong> {viewingUser.tickets?.length || 0}</p>
                  <p><strong>Total Transactions:</strong> {viewingUser.payments?.length || 0}</p>
                </Col>
              </Row>
              
              {/* Cards */}
              {viewingUser.cards && viewingUser.cards.length > 0 && (
                <div className="mt-3">
                  <h6>Cards</h6>
                  <Table size="sm" striped>
                    <thead>
                      <tr>
                        <th>Card Number</th>
                        <th>Type</th>
                        <th>Balance</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingUser.cards.map((card, index) => (
                        <tr key={index}>
                          <td>{card.cardNumber}</td>
                          <td>{card.isPrimary ? 'Primary' : 'Secondary'}</td>
                          <td>₹{card.balance}</td>
                          <td>{card.isActive ? 'Active' : 'Inactive'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}

              {/* Subscriptions */}
              {viewingUser.subscriptions && viewingUser.subscriptions.length > 0 && (
                <div className="mt-3">
                  <h6>Subscriptions</h6>
                  <Table size="sm" striped>
                    <thead>
                      <tr>
                        <th>Plan</th>
                        <th>Status</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingUser.subscriptions.map((sub, index) => (
                        <tr key={index}>
                          <td>{sub.planId?.name || 'Unknown'}</td>
                          <td>{sub.status}</td>
                          <td>{new Date(sub.startDate).toLocaleDateString()}</td>
                          <td>{new Date(sub.endDate).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </div>
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

export default AdminUserManagement;
