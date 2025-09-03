# SmartMetroCard Frontend

A modern React application for smart metro card management with virtual cards, ticket booking, subscription plans, and journey tracking.

## Features

- 🚇 **Virtual Cards**: Create and manage virtual metro cards
- 🎫 **Ticket Booking**: Book tickets for metro journeys
- 📅 **Subscription Plans**: Subscribe to monthly/yearly plans
- 🗺️ **Journey Tracking**: Real-time journey tracking with location
- 💳 **Payment Integration**: Secure payment processing with Razorpay
- 📱 **Responsive Design**: Mobile-first responsive UI
- 🔍 **Search Functionality**: Search across stations, plans, tickets, and journeys
- 📊 **Transaction History**: Complete transaction and journey history

## Tech Stack

- **Frontend**: React 18, Redux Toolkit, React Router
- **Styling**: Bootstrap 5, CSS3
- **Payment**: Razorpay Integration
- **Testing**: Jest, React Testing Library
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd smartcardfrontendnew
```

2. Install dependencies:
```bash
npm install
```

3. Create environment variables:
```bash
cp .env.example .env
```

Add your configuration:
```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure

- **Unit Tests**: Located in `src/__tests__/`
- **Component Tests**: Test individual React components
- **Integration Tests**: Test component interactions
- **API Tests**: Mock API calls and test responses

### Test Coverage

The test suite covers:
- Component rendering and user interactions
- Redux state management
- API integration
- Error handling
- Responsive design

## Project Structure

```
src/
├── api/                 # API configuration and endpoints
├── components/          # Reusable React components
├── layouts/            # Layout components
├── pages/              # Page components
├── slices/             # Redux Toolkit slices
├── store/              # Redux store configuration
├── utils/              # Utility functions
├── __tests__/          # Test files
└── __mocks__/          # Mock files for testing
```

## Key Components

### Pages
- **HomePage**: Landing page with quick actions
- **CardsPage**: Virtual card management
- **PlansPage**: Subscription plans and purchase
- **TicketsPage**: Ticket booking and management
- **HistoryPage**: Journey and transaction history
- **SearchPage**: Global search functionality

### Components
- **NavBar**: Navigation header
- **Footer**: Site footer with links
- **Chatbot**: AI-powered customer support
- **RequireAuth**: Authentication wrapper

## API Integration

The application integrates with a backend API for:
- User authentication and management
- Virtual card operations
- Ticket booking and validation
- Payment processing
- Journey tracking
- Transaction history

## Payment Integration

Uses Razorpay for secure payment processing:
- Subscription plan purchases
- Card recharge
- Ticket payments
- Payment verification

## Responsive Design

The application is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones
- Different screen sizes

## Error Handling

Comprehensive error handling for:
- API failures
- Network issues
- Payment failures
- User input validation
- Authentication errors

## Performance Optimization

- Code splitting with React.lazy()
- Memoized components
- Optimized Redux selectors
- Efficient API calls
- Image optimization

## Security Features

- JWT token authentication
- Secure payment processing
- Input validation
- XSS protection
- CSRF protection

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Email: support@smartmetro.com
- Phone: +91-1800-123-4567
- Documentation: [Link to docs]

## Recent Fixes

### API Endpoints
- Fixed payment order creation endpoint
- Added fallback endpoints for transactions and journeys
- Improved error handling for 404 responses

### UI/UX Improvements
- Fixed footer hover issues
- Enhanced search functionality
- Improved station name display
- Added proper filtering for tickets

### Payment Flow
- Fixed payment navigation issues
- Added proper error handling
- Improved success/error messaging

### Testing
- Added comprehensive Jest test suite
- Unit tests for all major components
- Integration tests for user flows
- Mock configurations for external dependencies