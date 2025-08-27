import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminCardManagement from '../../pages/admin/AdminCardManagement';
import { cardAPI } from '../../api/api';

// Mock the API
jest.mock('../../api/api', () => ({
  cardAPI: {
    getAllCards: jest.fn(),
    createCard: jest.fn(),
    updateCard: jest.fn(),
    deleteCard: jest.fn(),
    rechargeCard: jest.fn()
  }
}));

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('AdminCardManagement Component', () => {
  const mockCards = {
    data: [
      {
        _id: '1',
        cardNumber: '4000123456789012',
        userId: {
          _id: 'user1',
          name: 'John Doe'
        },
        cardType: 'primary',
        balance: 250.50,
        isActive: true,
        expiryDate: '2025-12-31T00:00:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z'
      },
      {
        _id: '2',
        cardNumber: '4000987654321098',
        userId: {
          _id: 'user2',
          name: 'Jane Smith'
        },
        cardType: 'secondary',
        balance: 100.00,
        isActive: false,
        expiryDate: '2024-12-31T00:00:00.000Z',
        createdAt: '2024-01-02T00:00:00.000Z'
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    cardAPI.getAllCards.mockResolvedValue(mockCards);
  });

  test('renders card management page correctly', async () => {
    renderWithRouter(<AdminCardManagement />);
    
    expect(screen.getByText('Virtual Card Management')).toBeInTheDocument();
    expect(screen.getByText('Add Card')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('All Virtual Cards (2)')).toBeInTheDocument();
    });
  });

  test('displays loading state initially', () => {
    renderWithRouter(<AdminCardManagement />);
    
    expect(screen.getByText(/loading cards/i)).toBeInTheDocument();
  });

  test('displays cards in table after loading', async () => {
    renderWithRouter(<AdminCardManagement />);

    await waitFor(() => {
      expect(screen.getByText('****9012')).toBeInTheDocument(); // Masked card number
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('primary')).toBeInTheDocument();
      expect(screen.getByText('₹250.5')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('secondary')).toBeInTheDocument();
    });
  });

  test('shows correct status badges', async () => {
    renderWithRouter(<AdminCardManagement />);

    await waitFor(() => {
      const activeBadges = screen.getAllByText('Active');
      const inactiveBadges = screen.getAllByText('Inactive');
      
      expect(activeBadges).toHaveLength(1);
      expect(inactiveBadges).toHaveLength(1);
    });
  });

  test('opens add card modal when clicking add button', async () => {
    renderWithRouter(<AdminCardManagement />);
    
    const addButton = screen.getByText('Add Card');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Add New Card')).toBeInTheDocument();
      expect(screen.getByLabelText(/user id/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/card number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/card type/i)).toBeInTheDocument();
    });
  });

  test('generates card number when clicking generate button', async () => {
    renderWithRouter(<AdminCardManagement />);
    
    const addButton = screen.getByText('Add Card');
    fireEvent.click(addButton);

    await waitFor(() => {
      const generateButton = screen.getByText('Generate');
      const cardNumberInput = screen.getByLabelText(/card number/i);
      
      expect(cardNumberInput.value).toBe('');
      fireEvent.click(generateButton);
      expect(cardNumberInput.value).toMatch(/^4000\d{12}$/);
    });
  });

  test('creates new card successfully', async () => {
    const newCard = {
      _id: '3',
      cardNumber: '4000111122223333',
      userId: 'user3',
      cardType: 'primary',
      balance: 0,
      isActive: true
    };

    cardAPI.createCard.mockResolvedValueOnce({ data: newCard });
    cardAPI.getAllCards.mockResolvedValueOnce({
      data: [...mockCards.data, newCard]
    });

    renderWithRouter(<AdminCardManagement />);
    
    const addButton = screen.getByText('Add Card');
    fireEvent.click(addButton);

    await waitFor(() => {
      const userIdInput = screen.getByLabelText(/user id/i);
      const cardNumberInput = screen.getByLabelText(/card number/i);
      const balanceInput = screen.getByLabelText(/initial balance/i);
      const submitButton = screen.getByText('Create Card');

      fireEvent.change(userIdInput, { target: { value: 'user3' } });
      fireEvent.change(cardNumberInput, { target: { value: '4000111122223333' } });
      fireEvent.change(balanceInput, { target: { value: '100' } });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(cardAPI.createCard).toHaveBeenCalledWith({
        userId: 'user3',
        cardNumber: '4000111122223333',
        cardType: 'primary',
        balance: '100',
        isActive: true,
        expiryDate: ''
      });
    });
  });

  test('opens edit modal when clicking edit button', async () => {
    renderWithRouter(<AdminCardManagement />);

    await waitFor(() => {
      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(btn => btn.querySelector('.fa-edit'));
      fireEvent.click(editButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Edit Card')).toBeInTheDocument();
      expect(screen.getByDisplayValue('user1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('4000123456789012')).toBeInTheDocument();
    });
  });

  test('updates card successfully', async () => {
    cardAPI.updateCard.mockResolvedValueOnce({ data: { success: true } });

    renderWithRouter(<AdminCardManagement />);

    await waitFor(() => {
      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(btn => btn.querySelector('.fa-edit'));
      fireEvent.click(editButton);
    });

    await waitFor(() => {
      const balanceInput = screen.getByDisplayValue('250.5');
      const updateButton = screen.getByText('Update Card');

      fireEvent.change(balanceInput, { target: { value: '300' } });
      fireEvent.click(updateButton);
    });

    await waitFor(() => {
      expect(cardAPI.updateCard).toHaveBeenCalledWith('1', expect.objectContaining({
        balance: '300'
      }));
    });
  });

  test('opens view modal when clicking view button', async () => {
    renderWithRouter(<AdminCardManagement />);

    await waitFor(() => {
      const viewButtons = screen.getAllByRole('button');
      const viewButton = viewButtons.find(btn => btn.querySelector('.fa-eye'));
      fireEvent.click(viewButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Card Details')).toBeInTheDocument();
      expect(screen.getByText('4000123456789012')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('₹250.5')).toBeInTheDocument();
    });
  });

  test('recharges card when clicking recharge button', async () => {
    window.prompt = jest.fn(() => '50');
    cardAPI.rechargeCard.mockResolvedValueOnce({ data: { success: true } });

    renderWithRouter(<AdminCardManagement />);

    await waitFor(() => {
      const rechargeButtons = screen.getAllByRole('button');
      const rechargeButton = rechargeButtons.find(btn => btn.querySelector('.fa-plus-circle'));
      fireEvent.click(rechargeButton);
    });

    await waitFor(() => {
      expect(window.prompt).toHaveBeenCalledWith('Enter recharge amount (₹):');
      expect(cardAPI.rechargeCard).toHaveBeenCalledWith('1', { amount: 50 });
    });
  });

  test('deletes card after confirmation', async () => {
    window.confirm = jest.fn(() => true);
    cardAPI.deleteCard.mockResolvedValueOnce({ data: { success: true } });

    renderWithRouter(<AdminCardManagement />);

    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find(btn => btn.querySelector('.fa-trash'));
      fireEvent.click(deleteButton);
    });

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this card?');
      expect(cardAPI.deleteCard).toHaveBeenCalledWith('1');
    });
  });

  test('handles API errors gracefully', async () => {
    cardAPI.getAllCards.mockRejectedValueOnce(new Error('API Error'));

    renderWithRouter(<AdminCardManagement />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch cards')).toBeInTheDocument();
    });
  });

  test('validates required fields in add form', async () => {
    renderWithRouter(<AdminCardManagement />);
    
    const addButton = screen.getByText('Add Card');
    fireEvent.click(addButton);

    await waitFor(() => {
      const submitButton = screen.getByText('Create Card');
      fireEvent.click(submitButton);
    });

    // Form should not submit without required fields
    expect(cardAPI.createCard).not.toHaveBeenCalled();
  });

  test('closes modal when clicking cancel', async () => {
    renderWithRouter(<AdminCardManagement />);
    
    const addButton = screen.getByText('Add Card');
    fireEvent.click(addButton);

    await waitFor(() => {
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('Add New Card')).not.toBeInTheDocument();
    });
  });

  test('displays correct card type badges', async () => {
    renderWithRouter(<AdminCardManagement />);

    await waitFor(() => {
      const primaryBadge = screen.getByText('primary');
      const secondaryBadge = screen.getByText('secondary');
      
      expect(primaryBadge).toHaveClass('badge', 'bg-primary');
      expect(secondaryBadge).toHaveClass('badge', 'bg-secondary');
    });
  });

  test('formats expiry dates correctly', async () => {
    renderWithRouter(<AdminCardManagement />);

    await waitFor(() => {
      expect(screen.getByText('12/31/2025')).toBeInTheDocument();
      expect(screen.getByText('12/31/2024')).toBeInTheDocument();
    });
  });

  test('masks card numbers in table', async () => {
    renderWithRouter(<AdminCardManagement />);

    await waitFor(() => {
      expect(screen.getByText('****9012')).toBeInTheDocument();
      expect(screen.getByText('****1098')).toBeInTheDocument();
      // Full card numbers should not be visible in table
      expect(screen.queryByText('4000123456789012')).not.toBeInTheDocument();
    });
  });
});
