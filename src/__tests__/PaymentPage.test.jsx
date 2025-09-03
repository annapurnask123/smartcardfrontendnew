import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import PaymentPage from '../pages/PaymentPage'
import * as paymentAPI from '../api/api'

// Mock the API
jest.mock('../api/api', () => ({
  paymentAPI: {
    createPaymentOrder: jest.fn(),
    createPaymentOrderLegacy: jest.fn(),
  }
}))

// Mock Razorpay
global.Razorpay = jest.fn().mockImplementation(() => ({
  open: jest.fn()
}))

// Mock store
const mockStore = configureStore({
  reducer: {
    auth: (state = { user: { id: 'user123', name: 'Test User' } }) => state,
  }
})

const renderWithProviders = (component, { initialState = {} } = {}) => {
  return render(
    <Provider store={mockStore}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  )
}

describe('PaymentPage', () => {
  const mockLocationState = {
    paymentInfo: {
      type: 'subscription',
      id: 'sub123',
      amount: 299,
      description: 'Monthly Plan'
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock useLocation
    jest.spyOn(require('react-router-dom'), 'useLocation').mockReturnValue({
      state: mockLocationState
    })
  })

  it('renders payment page with correct information', () => {
    renderWithProviders(<PaymentPage />)
    
    expect(screen.getByText('Payment')).toBeInTheDocument()
    expect(screen.getByText('Monthly Plan')).toBeInTheDocument()
    expect(screen.getByText('₹299')).toBeInTheDocument()
  })

  it('handles subscription payment successfully', async () => {
    const mockOrder = {
      order_id: 'order_123',
      amount: 29900,
      currency: 'INR'
    }
    
    paymentAPI.paymentAPI.createPaymentOrder.mockResolvedValue({ data: mockOrder })
    
    renderWithProviders(<PaymentPage />)
    
    const payButton = screen.getByText('Pay with Razorpay')
    fireEvent.click(payButton)
    
    await waitFor(() => {
      expect(paymentAPI.paymentAPI.createPaymentOrder).toHaveBeenCalledWith({
        type: 'subscription',
        id: 'sub123',
        userId: 'user123',
        amount: 299,
        paymentMethod: 'upi'
      })
    })
  })

  it('handles recharge payment successfully', async () => {
    const rechargeState = {
      paymentInfo: {
        type: 'recharge',
        id: 'card123',
        amount: 500,
        description: 'Card Recharge'
      }
    }
    
    jest.spyOn(require('react-router-dom'), 'useLocation').mockReturnValue({
      state: rechargeState
    })
    
    const mockOrder = {
      order_id: 'order_456',
      amount: 50000,
      currency: 'INR'
    }
    
    paymentAPI.paymentAPI.createPaymentOrder.mockResolvedValue({ data: mockOrder })
    
    renderWithProviders(<PaymentPage />)
    
    const payButton = screen.getByText('Pay with Razorpay')
    fireEvent.click(payButton)
    
    await waitFor(() => {
      expect(paymentAPI.paymentAPI.createPaymentOrder).toHaveBeenCalledWith({
        type: 'recharge',
        id: 'card123',
        userId: 'user123',
        amount: 500,
        paymentMethod: 'upi'
      })
    })
  })

  it('handles payment API error with fallback', async () => {
    paymentAPI.paymentAPI.createPaymentOrder.mockRejectedValue(new Error('API Error'))
    paymentAPI.paymentAPI.createPaymentOrderLegacy.mockResolvedValue({ 
      data: { order_id: 'order_789', amount: 29900, currency: 'INR' }
    })
    
    renderWithProviders(<PaymentPage />)
    
    const payButton = screen.getByText('Pay with Razorpay')
    fireEvent.click(payButton)
    
    await waitFor(() => {
      expect(paymentAPI.paymentAPI.createPaymentOrderLegacy).toHaveBeenCalled()
    })
  })

  it('displays error message when payment fails', async () => {
    paymentAPI.paymentAPI.createPaymentOrder.mockRejectedValue(new Error('Payment failed'))
    paymentAPI.paymentAPI.createPaymentOrderLegacy.mockRejectedValue(new Error('Legacy failed'))
    
    renderWithProviders(<PaymentPage />)
    
    const payButton = screen.getByText('Pay with Razorpay')
    fireEvent.click(payButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Payment failed/)).toBeInTheDocument()
    })
  })
})
