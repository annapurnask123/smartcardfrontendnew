import '@testing-library/jest-dom';

// Suppress React Router deprecation warnings during tests
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  if (
    args[0]?.includes?.('React Router Future Flag Warning') ||
    args[0]?.includes?.('v7_relativeSplatPath') ||
    args[0]?.includes?.('Relative route resolution within Splat routes')
  ) {
    return;
  }
  originalConsoleWarn(...args);
};

// Suppress act() warnings for testing
const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    args[0]?.includes?.('Warning: An update to') ||
    args[0]?.includes?.('was not wrapped in act') ||
    args[0]?.includes?.('When testing, code that causes React state updates should be wrapped into act')
  ) {
    return;
  }
  originalConsoleError(...args);
};

// Mock window.confirm and window.alert for tests
global.confirm = jest.fn(() => true);
global.alert = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock SweetAlert2 to auto-confirm in tests
jest.mock('sweetalert2', () => ({
  __esModule: true,
  default: {
    fire: jest.fn().mockResolvedValue({ isConfirmed: true, isDenied: false, isDismissed: false })
  }
}));

// Mock API services
jest.mock('./api/api', () => ({
  subscriptionPlanAPI: {
    getAll: jest.fn().mockResolvedValue({ data: [] })
  },
  stationAPI: {
    getAllStations: jest.fn().mockResolvedValue({ data: [] })
  },
  default: {
    get: jest.fn().mockResolvedValue({ data: [] }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    put: jest.fn().mockResolvedValue({ data: {} }),
    delete: jest.fn().mockResolvedValue({ data: {} })
  }
}));