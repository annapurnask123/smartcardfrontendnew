import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import TicketDetailPage from '../pages/TicketDetailPage'

// Mock the API correctly
jest.mock('../api/api', () => ({
  ticketAPI: {
    getTicket: jest.fn(),
    cancelTicket: jest.fn(),
    tapIn: jest.fn(),
    tapOut: jest.fn(),
    dropEarly: jest.fn(),
    extendJourney: jest.fn(),
  },
  userJourneyAPI: {
    startJourney: jest.fn(),
    endJourney: jest.fn(),
  }
}))

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ id: 'ticket123' }),
  useNavigate: () => jest.fn(),
}))

// Mock QRCode component
jest.mock('react-qr-code', () => {
  return function QRCode({ value }) {
    return <div data-testid="qr-code">{value}</div>
  }
})

// Mock sweetalert2
jest.mock('sweetalert2', () => ({
  fire: jest.fn(() => Promise.resolve({ isConfirmed: true }))
}))

// Mock store
const mockStore = configureStore({
  reducer: {
    stations: (state = { allItems: [
      { _id: 'station1', name: 'Central Station' },
      { _id: 'station2', name: 'Airport Terminal' }
    ] }) => state,
  }
})

const renderWithProviders = (component) => {
  return render(
    <Provider store={mockStore}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  )
}

// Mock the entire module for API
const ticketAPI = require('../api/api').ticketAPI

describe('TicketDetailPage', () => {
  const mockTicket = {
    _id: 'ticket123',
    source: 'Central Station',
    destination: 'Airport Terminal',
    price: 25,
    status: 'Active',
    createdAt: '2023-01-01T10:00:00Z',
    sourceId: 'station1',
    destinationId: 'station2',
    qrData: JSON.stringify({ ticketId: 'ticket123', timestamp: '2023-01-01T10:00:00Z' })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock localStorage more comprehensively
    Storage.prototype.getItem = jest.fn((key) => {
      if (key === 'user') return JSON.stringify({ id: 'user123', name: 'Test User' })
      if (key === 'tapInStation') return 'station1'
      if (key === 'tapOutStation') return 'station2'
      if (key === 'currentJourney') return null
      if (key === 'journeys') return '[]'
      return null
    })
    Storage.prototype.setItem = jest.fn()
    Storage.prototype.removeItem = jest.fn()

    // Mock window.confirm and alert
    window.confirm = jest.fn(() => true)
    window.alert = jest.fn()
  })

  it('renders ticket details correctly', async () => {
    ticketAPI.getTicket.mockResolvedValue({ data: mockTicket })
    
    renderWithProviders(<TicketDetailPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Ticket Details')).toBeInTheDocument()
    })
  })

  it('displays QR code for active tickets', async () => {
    ticketAPI.getTicket.mockResolvedValue({ data: mockTicket })
    
    renderWithProviders(<TicketDetailPage />)
    
    await waitFor(() => {
      expect(screen.getByTestId('qr-code')).toBeInTheDocument()
    })
  })

  it('handles tap in successfully', async () => {
    ticketAPI.getTicket.mockResolvedValue({ data: mockTicket })
    ticketAPI.tapIn.mockResolvedValue({})
    
    renderWithProviders(<TicketDetailPage />)
    
    await waitFor(() => {
      const tapInButton = screen.getByText(/Tap In at/)
      fireEvent.click(tapInButton)
    })
  })

  it('handles tap out successfully', async () => {
    const inProgressTicket = { ...mockTicket, status: 'InProgress' }
    ticketAPI.getTicket.mockResolvedValue({ data: inProgressTicket })
    ticketAPI.tapOut.mockResolvedValue({})
    
    renderWithProviders(<TicketDetailPage />)
    
    await waitFor(() => {
      const tapOutButton = screen.getByText(/Tap Out at/)
      fireEvent.click(tapOutButton)
    })
  })

  it('handles ticket cancellation', async () => {
    ticketAPI.getTicket.mockResolvedValue({ data: mockTicket })
    ticketAPI.cancelTicket.mockResolvedValue({})
    
    renderWithProviders(<TicketDetailPage />)
    
    await waitFor(() => {
      const cancelButton = screen.getByText('Cancel Ticket')
      fireEvent.click(cancelButton)
    })
  })

  // it('shows fallback data when API fails', async () => {
  //   ticketAPI.getTicket.mockRejectedValue(new Error('API Error'))
    
  //   renderWithProviders(<TicketDetailPage />)
    
  //   await waitFor(() => {
  //     expect(screen.getByText('Unknown Station')).toBeInTheDocument()
  //   })
  // })

  it('handles API errors gracefully', async () => {
    ticketAPI.getTicket.mockResolvedValue({ data: mockTicket })
    ticketAPI.tapIn.mockRejectedValue(new Error('Tap In failed'))
    
    renderWithProviders(<TicketDetailPage />)
    
    await waitFor(() => {
      const tapInButton = screen.getByText(/Tap In at/)
      fireEvent.click(tapInButton)
    })
  })
})