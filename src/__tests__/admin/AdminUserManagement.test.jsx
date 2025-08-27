import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminUserManagement from '../../pages/admin/AdminUserManagement';
import { userAPI } from '../../api/api';

// Mock the API
jest.mock('../../api/api', () => ({
  userAPI: {
    getAllUsers: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    getUserById: jest.fn()
  }
}));

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('AdminUserManagement Component', () => {
  const mockUsers = {
    data: [
      {
        _id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        isActive: true,
        role: 'user',
        createdAt: '2024-01-01T00:00:00.000Z'
      },
      {
        _id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '0987654321',
        isActive: false,
        role: 'user',
        createdAt: '2024-01-02T00:00:00.000Z'
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    userAPI.getAllUsers.mockResolvedValue(mockUsers);
  });

  test('renders user management page correctly', async () => {
    renderWithRouter(<AdminUserManagement />);
    
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Add User')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  test('displays loading state initially', () => {
    renderWithRouter(<AdminUserManagement />);
    
    expect(screen.getByText(/loading users/i)).toBeInTheDocument();
  });

  test('displays users in table after loading', async () => {
    renderWithRouter(<AdminUserManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('1234567890')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });
  });

  test('shows correct status badges', async () => {
    renderWithRouter(<AdminUserManagement />);

    await waitFor(() => {
      const activeBadges = screen.getAllByText('Active');
      const inactiveBadges = screen.getAllByText('Inactive');
      
      expect(activeBadges).toHaveLength(1);
      expect(inactiveBadges).toHaveLength(1);
    });
  });

  test('opens add user modal when clicking add button', async () => {
    renderWithRouter(<AdminUserManagement />);
    
    const addButton = screen.getByText('Add User');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Add New User')).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    });
  });

  test('creates new user successfully', async () => {
    const newUser = {
      _id: '3',
      name: 'New User',
      email: 'new@example.com',
      phone: '1111111111',
      isActive: true,
      role: 'user'
    };

    userAPI.createUser.mockResolvedValueOnce({ data: newUser });
    userAPI.getAllUsers.mockResolvedValueOnce({
      data: [...mockUsers.data, newUser]
    });

    renderWithRouter(<AdminUserManagement />);
    
    const addButton = screen.getByText('Add User');
    fireEvent.click(addButton);

    await waitFor(() => {
      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const phoneInput = screen.getByLabelText(/phone/i);
      const submitButton = screen.getByText('Create User');

      fireEvent.change(nameInput, { target: { value: 'New User' } });
      fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
      fireEvent.change(phoneInput, { target: { value: '1111111111' } });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(userAPI.createUser).toHaveBeenCalledWith({
        name: 'New User',
        email: 'new@example.com',
        phone: '1111111111',
        password: '',
        isActive: true
      });
    });
  });

  test('opens edit modal when clicking edit button', async () => {
    renderWithRouter(<AdminUserManagement />);

    await waitFor(() => {
      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(btn => btn.querySelector('.fa-edit'));
      fireEvent.click(editButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Edit User')).toBeInTheDocument();
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    });
  });

  test('updates user successfully', async () => {
    userAPI.updateUser.mockResolvedValueOnce({ data: { success: true } });

    renderWithRouter(<AdminUserManagement />);

    await waitFor(() => {
      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(btn => btn.querySelector('.fa-edit'));
      fireEvent.click(editButton);
    });

    await waitFor(() => {
      const nameInput = screen.getByDisplayValue('John Doe');
      const updateButton = screen.getByText('Update User');

      fireEvent.change(nameInput, { target: { value: 'John Updated' } });
      fireEvent.click(updateButton);
    });

    await waitFor(() => {
      expect(userAPI.updateUser).toHaveBeenCalledWith('1', expect.objectContaining({
        name: 'John Updated'
      }));
    });
  });

  test('opens view modal when clicking view button', async () => {
    const userDetails = {
      data: {
        ...mockUsers.data[0],
        totalTickets: 5,
        totalSpent: 250,
        lastLogin: '2024-01-15T10:30:00.000Z'
      }
    };

    userAPI.getUserById.mockResolvedValueOnce(userDetails);

    renderWithRouter(<AdminUserManagement />);

    await waitFor(() => {
      const viewButtons = screen.getAllByRole('button');
      const viewButton = viewButtons.find(btn => btn.querySelector('.fa-eye'));
      fireEvent.click(viewButton);
    });

    await waitFor(() => {
      expect(screen.getByText('User Details')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  test('deletes user after confirmation', async () => {
    window.confirm = jest.fn(() => true);
    userAPI.deleteUser.mockResolvedValueOnce({ data: { success: true } });

    renderWithRouter(<AdminUserManagement />);

    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find(btn => btn.querySelector('.fa-trash'));
      fireEvent.click(deleteButton);
    });

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this user?');
      expect(userAPI.deleteUser).toHaveBeenCalledWith('1');
    });
  });

  test('handles API errors gracefully', async () => {
    userAPI.getAllUsers.mockRejectedValueOnce(new Error('API Error'));

    renderWithRouter(<AdminUserManagement />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch users')).toBeInTheDocument();
    });
  });

  test('validates required fields in add form', async () => {
    renderWithRouter(<AdminUserManagement />);
    
    const addButton = screen.getByText('Add User');
    fireEvent.click(addButton);

    await waitFor(() => {
      const submitButton = screen.getByText('Create User');
      fireEvent.click(submitButton);
    });

    // Form should not submit without required fields
    expect(userAPI.createUser).not.toHaveBeenCalled();
  });

  test('closes modal when clicking cancel', async () => {
    renderWithRouter(<AdminUserManagement />);
    
    const addButton = screen.getByText('Add User');
    fireEvent.click(addButton);

    await waitFor(() => {
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('Add New User')).not.toBeInTheDocument();
    });
  });

  test('displays user count correctly', async () => {
    renderWithRouter(<AdminUserManagement />);

    await waitFor(() => {
      expect(screen.getByText('All Users (2)')).toBeInTheDocument();
    });
  });

  test('formats dates correctly', async () => {
    renderWithRouter(<AdminUserManagement />);

    await waitFor(() => {
      // Should display formatted creation date
      expect(screen.getByText(/1\/1\/2024/)).toBeInTheDocument();
      expect(screen.getByText(/1\/2\/2024/)).toBeInTheDocument();
    });
  });
});
