import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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
  const mockCards = [
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
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    cardAPI.getAllCards.mockResolvedValue({ data: mockCards });
  });

  // test('renders card management page correctly', async () => {
  //   await act(async () => {
  //     renderWithRouter(<AdminCardManagement />);
  //   });
    
  //   expect(screen.getByText('Virtual Card Management')).toBeInTheDocument();
  //   expect(screen.getByTestId('add-card-button')).toBeInTheDocument();
    
  //   await waitFor(() => {
  //     expect(screen.getByText('All Virtual Cards (2)')).toBeInTheDocument();
  //   });
  // });

  // test('displays loading state initially', async () => {
  //   await act(async () => {
  //     renderWithRouter(<AdminCardManagement />);
  //   });
    
  //   expect(screen.getByText('Loading cards...')).toBeInTheDocument();
  // });

  // test('displays cards in table after loading', async () => {
  //   await act(async () => {
  //     renderWithRouter(<AdminCardManagement />);
  //   });

  //   await waitFor(() => {
  //     expect(screen.getByText('John Doe')).toBeInTheDocument();
  //     expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  //     expect(screen.getByText('primary')).toBeInTheDocument();
  //     expect(screen.getByText('secondary')).toBeInTheDocument();
  //     expect(screen.getByText('₹250.5')).toBeInTheDocument();
  //   });
  // });

  // test('shows correct status badges', async () => {
  //   await act(async () => {
  //     renderWithRouter(<AdminCardManagement />);
  //   });

    await waitFor(() => {
      const activeBadges = screen.getAllByText('Active');
      const inactiveBadges = screen.getAllByText('Inactive');
      
      expect(activeBadges.length).toBe(1);
      expect(inactiveBadges.length).toBe(1);
    });
  });

  test('opens add card modal when clicking add button', async () => {
    await act(async () => {
      renderWithRouter(<AdminCardManagement />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    const addButton = screen.getByTestId('add-card-button');
    await act(async () => {
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('card-modal')).toBeInTheDocument();
      expect(screen.getByText('Add New Card')).toBeInTheDocument();
    });
  });

  test('generates card number when clicking generate button', async () => {
    await act(async () => {
      renderWithRouter(<AdminCardManagement />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    const addButton = screen.getByTestId('add-card-button');
    await act(async () => {
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      const generateButton = screen.getByTestId('generate-button');
      const cardNumberInput = screen.getByTestId('card-number-input');
      
      expect(cardNumberInput.value).toBe('');
      fireEvent.click(generateButton);
      expect(cardNumberInput.value).toMatch(/^4000\d{12}$/);
    });
  });

  test('opens edit modal when clicking edit button', async () => {
    await act(async () => {
      renderWithRouter(<AdminCardManagement />);
    });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTestId('edit-button');
    await act(async () => {
      fireEvent.click(editButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByTestId('card-modal')).toBeInTheDocument();
      expect(screen.getByText('Edit Card')).toBeInTheDocument();
    });
  });

  test('opens view modal when clicking view button', async () => {
    await act(async () => {
      renderWithRouter(<AdminCardManagement />);
    });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByTestId('view-button');
    await act(async () => {
      fireEvent.click(viewButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByTestId('view-modal')).toBeInTheDocument();
      expect(screen.getByText('Card Details')).toBeInTheDocument();
    });
  });

  test('recharges card when clicking recharge button', async () => {
    window.prompt = jest.fn(() => '50');
    cardAPI.rechargeCard.mockResolvedValueOnce({ data: { success: true } });

    await act(async () => {
      renderWithRouter(<AdminCardManagement />);
    });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const rechargeButtons = screen.getAllByTestId('recharge-button');
    await act(async () => {
      fireEvent.click(rechargeButtons[0]);
    });

    await waitFor(() => {
      expect(window.prompt).toHaveBeenCalledWith('Enter recharge amount (₹):');
      expect(cardAPI.rechargeCard).toHaveBeenCalledWith('1', { amount: 50 });
    });
  });

  test('deletes card after confirmation', async () => {
    window.confirm = jest.fn(() => true);
    cardAPI.deleteCard.mockResolvedValueOnce({ data: { success: true } });

    await act(async () => {
      renderWithRouter(<AdminCardManagement />);
    });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTestId('delete-button');
    await act(async () => {
      fireEvent.click(deleteButtons[0]);
    });

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this card?');
      expect(cardAPI.deleteCard).toHaveBeenCalledWith('1');
    });
  });

  test('handles API errors gracefully', async () => {
    cardAPI.getAllCards.mockRejectedValueOnce(new Error('API Error'));

    await act(async () => {
      renderWithRouter(<AdminCardManagement />);
    });

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch cards')).toBeInTheDocument();
    });
  });

  test('validates required fields in add form', async () => {
    await act(async () => {
      renderWithRouter(<AdminCardManagement />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    const addButton = screen.getByTestId('add-card-button');
    await act(async () => {
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      const submitButton = screen.getByTestId('submit-button');
      fireEvent.click(submitButton);
    });

    // Form validation should prevent API call
    await waitFor(() => {
      expect(cardAPI.createCard).not.toHaveBeenCalled();
    });
  });

  test('closes modal when clicking cancel', async () => {
    await act(async () => {
      renderWithRouter(<AdminCardManagement />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    const addButton = screen.getByTestId('add-card-button');
    await act(async () => {
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      const cancelButton = screen.getByTestId('cancel-button');
      fireEvent.click(cancelButton);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('card-modal')).not.toBeInTheDocument();
    });
  });

  test('creates new card successfully', async () => {
    const newCard = {
      _id: '3',
      cardNumber: '4000111122223333',
      userId: 'user3',
      cardType: 'primary',
      balance: 100,
      isActive: true
    };

    cardAPI.createCard.mockResolvedValueOnce({ data: newCard });
    cardAPI.getAllCards.mockResolvedValueOnce({ data: [...mockCards, newCard] });

    await act(async () => {
      renderWithRouter(<AdminCardManagement />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    const addButton = screen.getByTestId('add-card-button');
    await act(async () => {
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      const userIdInput = screen.getByTestId('user-id-input');
      const cardNumberInput = screen.getByTestId('card-number-input');
      const balanceInput = screen.getByTestId('balance-input');
      const submitButton = screen.getByTestId('submit-button');

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

  test('updates card successfully', async () => {
    cardAPI.updateCard.mockResolvedValueOnce({ data: { success: true } });

    await act(async () => {
      renderWithRouter(<AdminCardManagement />);
    });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTestId('edit-button');
    await act(async () => {
      fireEvent.click(editButtons[0]);
    });

    await waitFor(() => {
      const balanceInput = screen.getByTestId('balance-input');
      const submitButton = screen.getByTestId('submit-button');

      fireEvent.change(balanceInput, { target: { value: '300' } });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(cardAPI.updateCard).toHaveBeenCalledWith('1', expect.objectContaining({
        balance: '300'
      }));
    });
  });

  test('handles empty card list', async () => {
    cardAPI.getAllCards.mockResolvedValueOnce({ data: [] });

    await act(async () => {
      renderWithRouter(<AdminCardManagement />);
    });

    await waitFor(() => {
      expect(screen.getByText('All Virtual Cards (0)')).toBeInTheDocument();
    });
  });

  test('formats dates correctly', async () => {
    await act(async () => {
      renderWithRouter(<AdminCardManagement />);
    });

    await waitFor(() => {
      expect(screen.getByText('12/31/2025')).toBeInTheDocument();
      expect(screen.getByText('12/31/2024')).toBeInTheDocument();
    });
  });

  test('masks card numbers in table', async () => {
    await act(async () => {
      renderWithRouter(<AdminCardManagement />);
    });

    await waitFor(() => {
      expect(screen.getByText('****9012')).toBeInTheDocument();
      expect(screen.getByText('****1098')).toBeInTheDocument();
    });
  });
});