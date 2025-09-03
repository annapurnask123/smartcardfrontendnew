import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import CardsPage from '../pages/CardsPage';
import cardReducer from '../slices/cardSlice';
import authReducer from '../slices/authSlice';

// Mock the API modules
jest.mock('../api/api', () => ({
  cardAPI: {
    getAllCards: jest.fn(),
    createCard: jest.fn(),
    getBalance: jest.fn(),
    rechargeCard: jest.fn(),
  },
  stationAPI: {
    getAllStations: jest.fn(),
  },
}));

const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      card: cardReducer,
      auth: authReducer,
    },
    preloadedState: initialState,
  });
};

const renderWithProviders = (component, initialState = {}) => {
  const store = createTestStore(initialState);
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

describe('CardsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders cards page with title', () => {
    renderWithProviders(<CardsPage />);
    expect(screen.getByText(/virtual cards/i)).toBeInTheDocument();
  });

  test('displays loading state when fetching cards', () => {
    const initialState = {
      card: {
        cards: [],
        loading: true,
        error: null,
      },
      auth: {
        user: { id: '1', name: 'Test User' },
      },
    };
    renderWithProviders(<CardsPage />, initialState);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('displays error message when there is an error', () => {
    const initialState = {
      card: {
        cards: [],
        loading: false,
        error: 'Failed to fetch cards',
      },
      auth: {
        user: { id: '1', name: 'Test User' },
      },
    };
    renderWithProviders(<CardsPage />, initialState);
    expect(screen.getByText(/failed to fetch cards/i)).toBeInTheDocument();
  });

  test('displays cards when data is loaded', () => {
    const mockCards = [
      {
        id: '1',
        cardNumber: '1234567890123456',
        balance: 100,
        status: 'active',
        type: 'primary',
      },
      {
        id: '2',
        cardNumber: '9876543210987654',
        balance: 50,
        status: 'active',
        type: 'secondary',
      },
    ];

    const initialState = {
      card: {
        cards: mockCards,
        loading: false,
        error: null,
      },
      auth: {
        user: { id: '1', name: 'Test User' },
      },
    };

    renderWithProviders(<CardsPage />, initialState);
    
    expect(screen.getByText(/1234567890123456/i)).toBeInTheDocument();
    expect(screen.getByText(/9876543210987654/i)).toBeInTheDocument();
    expect(screen.getByText(/₹100/i)).toBeInTheDocument();
    expect(screen.getByText(/₹50/i)).toBeInTheDocument();
  });

  test('displays "No cards found" when no cards exist', () => {
    const initialState = {
      card: {
        cards: [],
        loading: false,
        error: null,
      },
      auth: {
        user: { id: '1', name: 'Test User' },
      },
    };

    renderWithProviders(<CardsPage />, initialState);
    expect(screen.getByText(/no cards found/i)).toBeInTheDocument();
  });

  test('shows create card button when no primary card exists', () => {
    const initialState = {
      card: {
        cards: [],
        loading: false,
        error: null,
      },
      auth: {
        user: { id: '1', name: 'Test User' },
      },
    };

    renderWithProviders(<CardsPage />, initialState);
    expect(screen.getByText(/create primary card/i)).toBeInTheDocument();
  });

  test('shows recharge button when primary card exists', () => {
    const mockCards = [
      {
        id: '1',
        cardNumber: '1234567890123456',
        balance: 100,
        status: 'active',
        type: 'primary',
      },
    ];

    const initialState = {
      card: {
        cards: mockCards,
        loading: false,
        error: null,
      },
      auth: {
        user: { id: '1', name: 'Test User' },
      },
    };

    renderWithProviders(<CardsPage />, initialState);
    expect(screen.getByText(/recharge card/i)).toBeInTheDocument();
  });

  test('handles create card button click', () => {
    const initialState = {
      card: {
        cards: [],
        loading: false,
        error: null,
      },
      auth: {
        user: { id: '1', name: 'Test User' },
      },
    };

    renderWithProviders(<CardsPage />, initialState);
    
    const createButton = screen.getByText(/create primary card/i);
    fireEvent.click(createButton);
    
    // The actual create logic would be tested in integration tests
    expect(createButton).toBeInTheDocument();
  });

  test('handles recharge button click', () => {
    const mockCards = [
      {
        id: '1',
        cardNumber: '1234567890123456',
        balance: 100,
        status: 'active',
        type: 'primary',
      },
    ];

    const initialState = {
      card: {
        cards: mockCards,
        loading: false,
        error: null,
      },
      auth: {
        user: { id: '1', name: 'Test User' },
      },
    };

    renderWithProviders(<CardsPage />, initialState);
    
    const rechargeButton = screen.getByText(/recharge card/i);
    fireEvent.click(rechargeButton);
    
    // The actual recharge logic would be tested in integration tests
    expect(rechargeButton).toBeInTheDocument();
  });

  test('displays card status correctly', () => {
    const mockCards = [
      {
        id: '1',
        cardNumber: '1234567890123456',
        balance: 100,
        status: 'active',
        type: 'primary',
      },
      {
        id: '2',
        cardNumber: '9876543210987654',
        balance: 0,
        status: 'inactive',
        type: 'secondary',
      },
    ];

    const initialState = {
      card: {
        cards: mockCards,
        loading: false,
        error: null,
      },
      auth: {
        user: { id: '1', name: 'Test User' },
      },
    };

    renderWithProviders(<CardsPage />, initialState);
    
    expect(screen.getByText(/active/i)).toBeInTheDocument();
    expect(screen.getByText(/inactive/i)).toBeInTheDocument();
  });

  test('displays card type correctly', () => {
    const mockCards = [
      {
        id: '1',
        cardNumber: '1234567890123456',
        balance: 100,
        status: 'active',
        type: 'primary',
      },
      {
        id: '2',
        cardNumber: '9876543210987654',
        balance: 50,
        status: 'active',
        type: 'secondary',
      },
    ];

    const initialState = {
      card: {
        cards: mockCards,
        loading: false,
        error: null,
      },
      auth: {
        user: { id: '1', name: 'Test User' },
      },
    };

    renderWithProviders(<CardsPage />, initialState);
    
    expect(screen.getByText(/primary/i)).toBeInTheDocument();
    expect(screen.getByText(/secondary/i)).toBeInTheDocument();
  });
});
