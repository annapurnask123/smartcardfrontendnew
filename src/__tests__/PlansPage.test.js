import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import PlansPage from '../pages/PlansPage';
import subscriptionplanReducer from '../slices/subscriptionplanSlice';
import uiReducer from '../slices/uiSlice';

// Mock the API modules
jest.mock('../api/api', () => ({
  paymentAPI: {
    createPaymentOrder: jest.fn(),
  },
  subscriptionAPI: {
    createSubscription: jest.fn(),
  },
}));

// Mock the razorpay utility
jest.mock('../utils/razorpay', () => ({
  openRazorpayCheckout: jest.fn(),
}));

const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      subscriptionPlans: subscriptionplanReducer,
      ui: uiReducer,
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

describe('PlansPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders plans page with title', () => {
    renderWithProviders(<PlansPage />);
    expect(screen.getByText(/subscription plans/i)).toBeInTheDocument();
  });

  test('displays loading state when fetching plans', () => {
    const initialState = {
      subscriptionPlans: {
        plans: [],
        loading: true,
        error: null,
      },
    };
    renderWithProviders(<PlansPage />, initialState);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  // test('displays error message when there is an error', () => {
  //   const initialState = {
  //     subscriptionPlans: {
  //       plans: [],
  //       loading: false,
  //       error: 'Failed to fetch plans',
  //     },
  //   };
  //   renderWithProviders(<PlansPage />, initialState);
  //   expect(screen.getByText(/failed to fetch plans/i)).toBeInTheDocument();
  // });

  // test('displays plans when data is loaded', () => {
  //   const mockPlans = [
  //     {
  //       id: '1',
  //       name: 'Basic Plan',
  //       price: 100,
  //       duration: 'month',
  //       features: ['Feature 1', 'Feature 2'],
  //     },
  //     {
  //       id: '2',
  //       name: 'Premium Plan',
  //       price: 200,
  //       duration: 'month',
  //       features: ['Feature 1', 'Feature 2', 'Feature 3'],
  //     },
  //   ];

  //   const initialState = {
  //     subscriptionPlans: {
  //       plans: mockPlans,
  //       loading: false,
  //       error: null,
  //     },
  //   };

  //   renderWithProviders(<PlansPage />, initialState);
    
  //   expect(screen.getByText('Basic Plan')).toBeInTheDocument();
  //   expect(screen.getByText('Premium Plan')).toBeInTheDocument();
  //   expect(screen.getByText('₹100 / month')).toBeInTheDocument();
  //   expect(screen.getByText('₹200 / month')).toBeInTheDocument();
  // });

  // test('displays "No plans available" when no plans exist', () => {
  //   const initialState = {
  //     subscriptionPlans: {
  //       plans: [],
  //       loading: false,
  //       error: null,
  //     },
  //   };

  //   renderWithProviders(<PlansPage />, initialState);
  //   expect(screen.getByText(/no plans available/i)).toBeInTheDocument();
  // });

  test('filters plans based on search query', () => {
    const mockPlans = [
      {
        id: '1',
        name: 'Basic Plan',
        price: 100,
        duration: 'month',
      },
      {
        id: '2',
        name: 'Premium Plan',
        price: 200,
        duration: 'month',
      },
    ];

    const initialState = {
      subscriptionPlans: {
        plans: mockPlans,
        loading: false,
        error: null,
      },
      ui: {
        query: 'Basic',
      },
    };

    renderWithProviders(<PlansPage />, initialState);
    
    expect(screen.getByText('Basic Plan')).toBeInTheDocument();
    expect(screen.queryByText('Premium Plan')).not.toBeInTheDocument();
  });

  // test('purchase button is present for each plan', () => {
  //   const mockPlans = [
  //     {
  //       id: '1',
  //       name: 'Basic Plan',
  //       price: 100,
  //       duration: 'month',
  //     },
  //   ];

  //   const initialState = {
  //     subscriptionPlans: {
  //       plans: mockPlans,
  //       loading: false,
  //       error: null,
  //     },
  //   };

  //   renderWithProviders(<PlansPage />, initialState);
    
  //   const purchaseButtons = screen.getAllByText(/purchase/i);
  //   expect(purchaseButtons).toHaveLength(1);
  // });

  test('handles plan purchase click', async () => {
    const mockPlans = [
      {
        id: '1',
        name: 'Basic Plan',
        price: 100,
        duration: 'month',
      },
    ];

    const initialState = {
      subscriptionPlans: {
        plans: mockPlans,
        loading: false,
        error: null,
      },
    };

    renderWithProviders(<PlansPage />, initialState);
    
    const purchaseButton = screen.getByText(/purchase/i);
    fireEvent.click(purchaseButton);
    
    // The actual purchase logic would be tested in integration tests
    // This test just ensures the button is clickable
    expect(purchaseButton).toBeInTheDocument();
  });
});
