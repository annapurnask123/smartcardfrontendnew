import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge, Spinner, ProgressBar, Table, Accordion } from 'react-bootstrap';
import { adminAPI } from '../../api/api';

const AdminSystemTests = () => {
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastRunTime, setLastRunTime] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    runTests();
  }, []);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        runTests();
      }, 30000); // Refresh every 30 seconds
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const runTests = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await adminAPI.runSystemTests();
      
      if (response.data && response.data.success) {
        setTestResults(response.data);
        setLastRunTime(new Date());
      } else {
        setError('Failed to run system tests');
      }
    } catch (error) {
      setError(`System test failed: ${error.response?.data?.message || error.message}`);
      console.error('System test error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pass': return 'success';
      case 'fail': return 'danger';
      case 'warning': return 'warning';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass': return 'fas fa-check-circle';
      case 'fail': return 'fas fa-times-circle';
      case 'warning': return 'fas fa-exclamation-triangle';
      default: return 'fas fa-question-circle';
    }
  };

  const formatMemoryUsage = (memory) => {
    if (!memory) return 'N/A';
    return {
      rss: `${Math.round(memory.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memory.external / 1024 / 1024)}MB`
    };
  };

  const formatUptime = (seconds) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const renderTestCard = (testName, testData) => {
    return (
      <Card className="mb-3" key={testName}>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <div>
            <i className={`${getStatusIcon(testData.status)} me-2 text-${getStatusColor(testData.status)}`}></i>
            <strong>{testName.charAt(0).toUpperCase() + testName.slice(1)} Test</strong>
          </div>
          <Badge bg={getStatusColor(testData.status)}>
            {testData.status.toUpperCase()}
          </Badge>
        </Card.Header>
        <Card.Body>
          <p className="mb-2">{testData.message}</p>
          
          {testData.details && Object.keys(testData.details).length > 0 && (
            <Accordion>
              <Accordion.Item eventKey="0">
                <Accordion.Header>View Details</Accordion.Header>
                <Accordion.Body>
                  {testName === 'database' && (
                    <Table size="sm" striped>
                      <tbody>
                        <tr>
                          <td><strong>Connection Status</strong></td>
                          <td>
                            <Badge bg={testData.details.connected ? 'success' : 'danger'}>
                              {testData.details.connected ? 'Connected' : 'Disconnected'}
                            </Badge>
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Collections</strong></td>
                          <td>{testData.details.collections}</td>
                        </tr>
                        <tr>
                          <td><strong>Data Size</strong></td>
                          <td>{testData.details.dataSize} MB</td>
                        </tr>
                        <tr>
                          <td><strong>Index Size</strong></td>
                          <td>{testData.details.indexSize} MB</td>
                        </tr>
                      </tbody>
                    </Table>
                  )}
                  
                  {testName === 'models' && (
                    <Table size="sm" striped>
                      <thead>
                        <tr>
                          <th>Model</th>
                          <th>Status</th>
                          <th>Record Count</th>
                          <th>Has Sample Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(testData.details).map(([modelName, modelData]) => (
                          <tr key={modelName}>
                            <td><strong>{modelName}</strong></td>
                            <td>
                              <Badge bg={modelData.accessible ? 'success' : 'danger'}>
                                {modelData.accessible ? 'Accessible' : 'Error'}
                              </Badge>
                            </td>
                            <td>{modelData.count || 'N/A'}</td>
                            <td>
                              <Badge bg={modelData.hasSampleData ? 'success' : 'warning'}>
                                {modelData.hasSampleData ? 'Yes' : 'No'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                  
                  {testName === 'performance' && (
                    <Table size="sm" striped>
                      <tbody>
                        <tr>
                          <td><strong>Query Response Time</strong></td>
                          <td>{testData.details.queryResponseTime}</td>
                        </tr>
                        <tr>
                          <td><strong>System Uptime</strong></td>
                          <td>{formatUptime(testData.details.uptime)}</td>
                        </tr>
                        <tr>
                          <td><strong>Total Records</strong></td>
                          <td>{testData.details.totalRecords?.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td><strong>Memory Usage</strong></td>
                          <td>
                            {testData.details.memoryUsage && (
                              <div>
                                <small>
                                  RSS: {formatMemoryUsage(testData.details.memoryUsage).rss} | 
                                  Heap: {formatMemoryUsage(testData.details.memoryUsage).heapUsed} / {formatMemoryUsage(testData.details.memoryUsage).heapTotal}
                                </small>
                              </div>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </Table>
                  )}
                  
                  {testName === 'dataIntegrity' && (
                    <Table size="sm" striped>
                      <thead>
                        <tr>
                          <th>Relationship</th>
                          <th>Populated</th>
                          <th>Has Related Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(testData.details).map(([relationName, relationData]) => (
                          <tr key={relationName}>
                            <td><strong>{relationName}</strong></td>
                            <td>
                              <Badge bg={relationData.populated ? 'success' : 'danger'}>
                                {relationData.populated ? 'Yes' : 'No'}
                              </Badge>
                            </td>
                            <td>
                              <Badge bg={relationData.hasRelatedData ? 'success' : 'warning'}>
                                {relationData.hasRelatedData ? 'Yes' : 'No'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                  
                  {testName === 'authentication' && (
                    <Table size="sm" striped>
                      <tbody>
                        <tr>
                          <td><strong>Admin User Exists</strong></td>
                          <td>
                            <Badge bg={testData.details.adminUserExists ? 'success' : 'danger'}>
                              {testData.details.adminUserExists ? 'Yes' : 'No'}
                            </Badge>
                          </td>
                        </tr>
                        <tr>
                          <td><strong>JWT Secret Configured</strong></td>
                          <td>
                            <Badge bg={testData.details.jwtSecretConfigured ? 'success' : 'danger'}>
                              {testData.details.jwtSecretConfigured ? 'Yes' : 'No'}
                            </Badge>
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Admin Middleware</strong></td>
                          <td>
                            <Badge bg={testData.details.adminMiddlewareWorking ? 'success' : 'danger'}>
                              {testData.details.adminMiddlewareWorking ? 'Working' : 'Error'}
                            </Badge>
                          </td>
                        </tr>
                      </tbody>
                    </Table>
                  )}
                  
                  {!['database', 'models', 'performance', 'dataIntegrity', 'authentication'].includes(testName) && (
                    <pre className="bg-light p-2 rounded">
                      {JSON.stringify(testData.details, null, 2)}
                    </pre>
                  )}
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          )}
        </Card.Body>
      </Card>
    );
  };

  return (
    <Container fluid className="p-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2><i className="fas fa-vial me-2"></i>System Tests</h2>
            <div className="d-flex gap-2">
              <Button
                variant={autoRefresh ? 'success' : 'outline-secondary'}
                onClick={() => setAutoRefresh(!autoRefresh)}
                size="sm"
              >
                <i className="fas fa-sync-alt me-1"></i>
                Auto Refresh {autoRefresh ? 'ON' : 'OFF'}
              </Button>
              <Button
                variant="primary"
                onClick={runTests}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Running Tests...
                  </>
                ) : (
                  <>
                    <i className="fas fa-play me-2"></i>
                    Run Tests
                  </>
                )}
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {error && (
        <Row className="mb-3">
          <Col>
            <Alert variant="danger" dismissible onClose={() => setError('')}>
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
            </Alert>
          </Col>
        </Row>
      )}

      {lastRunTime && (
        <Row className="mb-3">
          <Col>
            <Alert variant="info">
              <i className="fas fa-clock me-2"></i>
              Last run: {lastRunTime.toLocaleString()}
              {autoRefresh && <span className="ms-2">(Auto-refreshing every 30 seconds)</span>}
            </Alert>
          </Col>
        </Row>
      )}

      {testResults && (
        <>
          {/* Overall Status */}
          <Row className="mb-4">
            <Col>
              <Card className={`border-${getStatusColor(testResults.overallStatus)}`}>
                <Card.Header className={`bg-${getStatusColor(testResults.overallStatus)} text-white`}>
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                      <i className={`${getStatusIcon(testResults.overallStatus)} me-2`}></i>
                      Overall System Status: {testResults.overallStatus.toUpperCase()}
                    </h5>
                    <Badge bg="light" text="dark">
                      {testResults.summary.passed}/{testResults.summary.totalTests} Tests Passed
                    </Badge>
                  </div>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={3}>
                      <div className="text-center">
                        <h6 className="text-success">Passed</h6>
                        <h4 className="text-success">{testResults.summary.passed}</h4>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="text-center">
                        <h6 className="text-danger">Failed</h6>
                        <h4 className="text-danger">{testResults.summary.failed}</h4>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="text-center">
                        <h6 className="text-warning">Warnings</h6>
                        <h4 className="text-warning">{testResults.summary.warnings}</h4>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="text-center">
                        <h6 className="text-muted">Total</h6>
                        <h4 className="text-muted">{testResults.summary.totalTests}</h4>
                      </div>
                    </Col>
                  </Row>
                  <div className="mt-3">
                    <ProgressBar>
                      <ProgressBar
                        variant="success"
                        now={(testResults.summary.passed / testResults.summary.totalTests) * 100}
                        key={1}
                      />
                      <ProgressBar
                        variant="warning"
                        now={(testResults.summary.warnings / testResults.summary.totalTests) * 100}
                        key={2}
                      />
                      <ProgressBar
                        variant="danger"
                        now={(testResults.summary.failed / testResults.summary.totalTests) * 100}
                        key={3}
                      />
                    </ProgressBar>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Individual Test Results */}
          <Row>
            <Col>
              <h4 className="mb-3">Test Results</h4>
              {Object.entries(testResults.testResults).map(([testName, testData]) =>
                renderTestCard(testName, testData)
              )}
            </Col>
          </Row>
        </>
      )}

      {loading && !testResults && (
        <Row>
          <Col>
            <div className="text-center py-5">
              <Spinner animation="border" size="lg" />
              <h5 className="mt-3">Running comprehensive system tests...</h5>
              <p className="text-muted">This may take a few moments</p>
            </div>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default AdminSystemTests;
