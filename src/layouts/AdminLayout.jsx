import React, { useState } from 'react';
import { Container, Row, Col, Nav, Navbar, Dropdown, Button } from 'react-bootstrap';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';

const AdminLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  const menuItems = [
    {
      path: '/admin/dashboard',
      icon: 'fas fa-tachometer-alt',
      label: 'Dashboard'
    },
    {
      path: '/admin/users',
      icon: 'fas fa-users',
      label: 'Users'
    },
    {
      path: '/admin/stations',
      icon: 'fas fa-subway',
      label: 'Stations'
    },
    {
      path: '/admin/routes',
      icon: 'fas fa-route',
      label: 'Routes'
    },
    {
      path: '/admin/tickets',
      icon: 'fas fa-ticket-alt',
      label: 'Tickets'
    },
    {
      path: '/admin/subscriptions',
      icon: 'fas fa-credit-card',
      label: 'Subscriptions'
    },
    {
      path: '/admin/cards',
      icon: 'fas fa-id-card',
      label: 'Virtual Cards'
    },
    {
      path: '/admin/transactions',
      icon: 'fas fa-exchange-alt',
      label: 'Transactions'
    },
    {
      path: '/admin/analytics',
      icon: 'fas fa-chart-bar',
      label: 'Analytics'
    }
  ];

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <div 
        className="bg-dark text-white d-flex flex-column"
        style={{ 
          width: sidebarCollapsed ? '80px' : '250px',
          transition: 'width 0.3s ease'
        }}
      >
        {/* Sidebar Header */}
        <div className="p-3 border-bottom border-secondary">
          <h5 className="mb-0 text-center">
            {sidebarCollapsed ? 'SMC' : 'SmartMetro Admin'}
          </h5>
        </div>

        {/* Navigation Menu */}
        <Nav className="flex-column mt-3">
          {menuItems.map((item) => (
            <Nav.Link
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`text-white px-3 py-2 d-flex align-items-center ${
                location.pathname === item.path ? 'bg-primary' : ''
              }`}
              style={{ cursor: 'pointer' }}
            >
              <i className={`${item.icon} me-2`}></i>
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Nav.Link>
          ))}
        </Nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow-1 d-flex flex-column">
        {/* Top Header */}
        <Navbar bg="white" className="border-bottom px-3 shadow-sm">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="me-3"
          >
            <i className={`fas ${sidebarCollapsed ? 'fa-bars' : 'fa-times'}`}></i>
          </Button>

          <Navbar.Brand className="mb-0">
            {/* Dynamic page title based on current route */}
            {location.pathname === '/admin/dashboard' && 'Dashboard'}
            {location.pathname === '/admin/users' && 'Users'}
            {location.pathname === '/admin/stations' && 'Stations'}
            {location.pathname === '/admin/routes' && 'Routes'}
            {location.pathname === '/admin/tickets' && 'Tickets'}
            {location.pathname === '/admin/subscriptions' && 'Subscriptions'}
            {location.pathname === '/admin/cards' && 'Virtual Cards'}
            {location.pathname === '/admin/transactions' && 'Transactions'}
            {location.pathname === '/admin/analytics' && 'Analytics'}
          </Navbar.Brand>

          <div className="ms-auto d-flex align-items-center">
            <span className="me-3">Welcome, {adminUser.name || 'Admin'}</span>
            <Dropdown>
              <Dropdown.Toggle variant="outline-primary" size="sm">
                <i className="fas fa-user-circle me-1"></i>
                {adminUser.name?.charAt(0)?.toUpperCase() || 'A'}
              </Dropdown.Toggle>

              <Dropdown.Menu>
                <Dropdown.Item>
                  <i className="fas fa-user me-2"></i>
                  Profile
                </Dropdown.Item>
                <Dropdown.Item>
                  <i className="fas fa-cog me-2"></i>
                  Settings
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleLogout} className="text-danger">
                  <i className="fas fa-sign-out-alt me-2"></i>
                  Logout
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </Navbar>

        {/* Page Content */}
        <div className="flex-grow-1" style={{ background: '#f8f9fa' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
