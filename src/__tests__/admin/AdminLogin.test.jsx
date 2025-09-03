import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminLogin from '../../pages/admin/AdminLogin';
import { adminAPI } from '../../api/api';

// Mock the API
jest.mock('../../api/api', () => ({
  adminAPI: {
    login: jest.fn()
  }
}));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('AdminLogin Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  test('renders login form correctly', () => {
    renderWithRouter(<AdminLogin />);
    
    expect(screen.getByText('Admin Login')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
  });

  test('displays validation errors for empty fields', async () => {
    renderWithRouter(<AdminLogin />);
    
    const loginButton = screen.getByRole('button', { name: /login/i });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  test('displays validation error for invalid email format', async () => {
    renderWithRouter(<AdminLogin />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const loginButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
    });
  });

  test('handles successful login', async () => {
    const mockResponse = {
      data: {
        token: 'mock-token',
        admin: {
          id: '1',
          name: 'Admin User',
          email: 'admin@test.com',
          role: 'admin'
        }
      }
    };

    adminAPI.login.mockResolvedValueOnce(mockResponse);

    renderWithRouter(<AdminLogin />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const loginButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(emailInput, { target: { value: 'admin@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(adminAPI.login).toHaveBeenCalledWith({
        email: 'admin@test.com',
        password: 'password123'
      });
      expect(localStorageMock.setItem).toHaveBeenCalledWith('adminToken', 'mock-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('adminUser', JSON.stringify(mockResponse.data.admin));
      expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard');
    });
  });

  test('handles login failure', async () => {
    const mockError = {
      response: {
        data: {
          message: 'Invalid credentials'
        }
      }
    };

    adminAPI.login.mockRejectedValueOnce(mockError);

    renderWithRouter(<AdminLogin />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const loginButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(emailInput, { target: { value: 'admin@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  test('shows loading state during login', async () => {
    adminAPI.login.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    renderWithRouter(<AdminLogin />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const loginButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(emailInput, { target: { value: 'admin@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);

    expect(screen.getByText(/logging in/i)).toBeInTheDocument();
    expect(loginButton).toBeDisabled();
  });

  test('redirects to dashboard if already logged in', () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'adminToken') return 'existing-token';
      if (key === 'adminUser') return JSON.stringify({ id: '1', role: 'admin' });
      return null;
    });

    renderWithRouter(<AdminLogin />);

    expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard');
  });

  test('navigates to register page when clicking register link', () => {
    renderWithRouter(<AdminLogin />);
    
    const registerLink = screen.getByText(/register here/i);
    fireEvent.click(registerLink);

    expect(mockNavigate).toHaveBeenCalledWith('/admin/register');
  });

//   test('toggles password visibility', () => {
//     renderWithRouter(<AdminLogin />);
    
//     const passwordInput = screen.getByLabelText(/password/i);
//     const toggleButton = screen.getByRole('button', { name: /toggle password visibility/i });

//     expect(passwordInput.type).toBe('password');
    
//     fireEvent.click(toggleButton);
//     expect(passwordInput.type).toBe('text');
    
//     fireEvent.click(toggleButton);
//     expect(passwordInput.type).toBe('password');
//   });
// });
