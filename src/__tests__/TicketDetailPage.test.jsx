import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import TicketDetailPage from '../pages/TicketDetailPage'
import * as ticketAPI from '../api/api'

// Mock the API
jest.mock('../api/api', () => ({
  ticketAPI: {
    getTicket: jest.fn(),
    cancelTicket: jest.fn(),
    tapIn: jest.fn(),
    tapOut: jest.fn(),
    dropEarly: jest.fn(),
    extendJourney: jest.fn(),
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
    // Mock localStorage
    Storage.prototype.getItem = jest.fn((key) => {
      if (key === 'user') return JSON.stringify({ id: 'user123', name: 'Test User' })
      if (key === 'tapInStation') return 'station1'
      if (key === 'tapOutStation') return 'station2'
      return null
    })
  })

  it('renders ticket details correctly', async () => {
    ticketAPI.ticketAPI.getTicket.mockResolvedValue({ data: mockTicket })
    
    renderWithProviders(<TicketDetailPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Ticket Details')).toBeInTheDocument()
      expect(screen.getByText('Central Station')).toBeInTheDocument()
      expect(screen.getByText('Airport Terminal')).toBeInTheDocument()
      expect(screen.getByText('₹25')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
    })
  })

  it('displays QR code for active tickets', async () => {
    ticketAPI.ticketAPI.getTicket.mockResolvedValue({ data: mockTicket })
    
    renderWithProviders(<TicketDetailPage />)
    
    await waitFor(() => {
      expect(screen.getByTestId('qr-code')).toBeInTheDocument()
      expect(screen.getByText('QR Code for Entry')).toBeInTheDocument()
    })
  })

  it('handles tap in successfully', async () => {
    ticketAPI.ticketAPI.getTicket.mockResolvedValue({ data: mockTicket })
    ticketAPI.ticketAPI.tapIn.mockResolvedValue({})
    
    renderWithProviders(<TicketDetailPage />)
    
    await waitFor(() => {
      const tapInButton = screen.getByText('Tap In')
      fireEvent.click(tapInButton)
    })
    
    await waitFor(() => {
      expect(ticketAPI.ticketAPI.tapIn).toHaveBeenCalledWith({
        ticketId: 'ticket123',
        userId: 'user123',
        stationId: 'station1',
        timestamp: expect.any(String)
      })
    })
  })

  it('handles tap out successfully', async () => {
    const inProgressTicket = { ...mockTicket, status: 'InProgress' }
    ticketAPI.ticketAPI.getTicket.mockResolvedValue({ data: inProgressTicket })
    ticketAPI.ticketAPI.tapOut.mockResolvedValue({})
    
    renderWithProviders(<TicketDetailPage />)
    
    await waitFor(() => {
      const tapOutButton = screen.getByText('Tap Out')
      fireEvent.click(tapOutButton)
    })
    
    await waitFor(() => {
      expect(ticketAPI.ticketAPI.tapOut).toHaveBeenCalledWith({
        ticketId: 'ticket123',
        userId: 'user123',
        stationId: 'station2',
        timestamp: expect.any(String)
      })
    })
  })

  it('handles ticket cancellation', async () => {
    ticketAPI.ticketAPI.getTicket.mockResolvedValue({ data: mockTicket })
    ticketAPI.ticketAPI.cancelTicket.mockResolvedValue({})
    
    // Mock window.confirm
    window.confirm = jest.fn(() => true)
    
    renderWithProviders(<TicketDetailPage />)
    
    await waitFor(() => {
      const cancelButton = screen.getByText('Cancel Ticket')
      fireEvent.click(cancelButton)
    })
    
    await waitFor(() => {
      expect(ticketAPI.ticketAPI.cancelTicket).toHaveBeenCalledWith({
        ticketId: 'ticket123',
        userId: 'user123'
      })
    })
  })

  it('handles early drop', async () => {
    const inProgressTicket = { ...mockTicket, status: 'InProgress' }
    ticketAPI.ticketAPI.getTicket.mockResolvedValue({ data: inProgressTicket })
    ticketAPI.ticketAPI.dropEarly.mockResolvedValue({})
    
    // Mock window.confirm
    window.confirm = jest.fn(() => true)
    
    renderWithProviders(<TicketDetailPage />)
    
    await waitFor(() => {
      const earlyDropButton = screen.getByText('Early Drop')
      fireEvent.click(earlyDropButton)
    })
    
    await waitFor(() => {
      expect(ticketAPI.ticketAPI.dropEarly).toHaveBeenCalledWith({
        ticketId: 'ticket123',
        userId: 'user123',
        timestamp: expect.any(String)
      })
    })
  })

  it('shows fallback data when API fails', async () => {
    ticketAPI.ticketAPI.getTicket.mockRejectedValue(new Error('API Error'))
    
    renderWithProviders(<TicketDetailPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Unknown Station')).toBeInTheDocument()
      expect(screen.getByText('₹25')).toBeInTheDocument() // fallback price
    })
  })

  it('handles API errors gracefully', async () => {
    ticketAPI.ticketAPI.getTicket.mockResolvedValue({ data: mockTicket })
    ticketAPI.ticketAPI.tapIn.mockRejectedValue(new Error('Tap In failed'))
    
    // Mock window.alert
    window.alert = jest.fn()
    
    renderWithProviders(<TicketDetailPage />)
    
    await waitFor(() => {
      const tapInButton = screen.getByText('Tap In')
      fireEvent.click(tapInButton)
    })
    
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Failed to Tap In. Please try again.')
    })
  })
})
