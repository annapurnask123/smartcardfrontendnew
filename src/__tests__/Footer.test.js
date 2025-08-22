import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Footer from '../components/Footer';

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Footer', () => {
  test('renders footer with company name', () => {
    renderWithRouter(<Footer />);
    expect(screen.getByText('SmartMetroCard')).toBeInTheDocument();
  });

  test('renders current year in copyright', () => {
    renderWithRouter(<Footer />);
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(new RegExp(currentYear.toString()))).toBeInTheDocument();
  });

  test('renders all main sections', () => {
    renderWithRouter(<Footer />);
    
    expect(screen.getByText('Services')).toBeInTheDocument();
    expect(screen.getByText('Support')).toBeInTheDocument();
    expect(screen.getByText('Company')).toBeInTheDocument();
    expect(screen.getByText('Legal')).toBeInTheDocument();
  });

  test('renders service links', () => {
    renderWithRouter(<Footer />);
    
    expect(screen.getByText('Book Tickets')).toBeInTheDocument();
    expect(screen.getByText('Virtual Cards')).toBeInTheDocument();
    expect(screen.getByText('Subscription Plans')).toBeInTheDocument();
    expect(screen.getByText('Train Schedules')).toBeInTheDocument();
    expect(screen.getByText('Journey Tracking')).toBeInTheDocument();
  });

  test('renders support links', () => {
    renderWithRouter(<Footer />);
    
    expect(screen.getByText('Email Support')).toBeInTheDocument();
    expect(screen.getByText('24/7 Helpline')).toBeInTheDocument();
    expect(screen.getByText('FAQ')).toBeInTheDocument();
    expect(screen.getByText('Help Center')).toBeInTheDocument();
    expect(screen.getByText('Feedback')).toBeInTheDocument();
  });

  test('renders company links', () => {
    renderWithRouter(<Footer />);
    
    expect(screen.getByText('About Us')).toBeInTheDocument();
    expect(screen.getByText('Careers')).toBeInTheDocument();
    expect(screen.getByText('Press')).toBeInTheDocument();
    expect(screen.getByText('Partners')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
  });

  test('renders legal links', () => {
    renderWithRouter(<Footer />);
    
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    expect(screen.getByText('Refund Policy')).toBeInTheDocument();
    expect(screen.getByText('Cookie Policy')).toBeInTheDocument();
    expect(screen.getByText('Accessibility')).toBeInTheDocument();
  });

  test('renders social media links', () => {
    renderWithRouter(<Footer />);
    
    const socialLinks = screen.getAllByRole('link');
    const facebookLink = socialLinks.find(link => link.title === 'Facebook');
    const twitterLink = socialLinks.find(link => link.title === 'Twitter');
    const instagramLink = socialLinks.find(link => link.title === 'Instagram');
    const linkedinLink = socialLinks.find(link => link.title === 'LinkedIn');
    
    expect(facebookLink).toBeInTheDocument();
    expect(twitterLink).toBeInTheDocument();
    expect(instagramLink).toBeInTheDocument();
    expect(linkedinLink).toBeInTheDocument();
  });

  test('renders company description', () => {
    renderWithRouter(<Footer />);
    expect(screen.getByText(/Revolutionizing urban transportation/i)).toBeInTheDocument();
  });

  test('renders contact information', () => {
    renderWithRouter(<Footer />);
    
    expect(screen.getByText(/support@smartmetro\.com/i)).toBeInTheDocument();
    expect(screen.getByText(/\+91-1800-123-4567/i)).toBeInTheDocument();
  });

  test('renders location information', () => {
    renderWithRouter(<Footer />);
    expect(screen.getByText('India')).toBeInTheDocument();
  });

  test('renders language information', () => {
    renderWithRouter(<Footer />);
    expect(screen.getByText('English (IN)')).toBeInTheDocument();
  });

  test('renders security badges', () => {
    renderWithRouter(<Footer />);
    
    expect(screen.getByAltText('SSL Secure')).toBeInTheDocument();
    expect(screen.getByAltText('PCI Compliant')).toBeInTheDocument();
  });

  test('renders made with love text', () => {
    renderWithRouter(<Footer />);
    expect(screen.getByText(/Made with/i)).toBeInTheDocument();
    expect(screen.getByText(/for commuters/i)).toBeInTheDocument();
  });

  test('has proper link structure', () => {
    renderWithRouter(<Footer />);
    
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    
    // Check that all links have href attributes
    links.forEach(link => {
      expect(link).toHaveAttribute('href');
    });
  });

  test('has proper icon structure', () => {
    renderWithRouter(<Footer />);
    
    // Check for FontAwesome icons
    const icons = document.querySelectorAll('.fas, .fab');
    expect(icons.length).toBeGreaterThan(0);
  });

  test('has responsive classes', () => {
    renderWithRouter(<Footer />);
    
    const container = screen.getByRole('contentinfo');
    expect(container).toHaveClass('mt-auto', 'pt-5', 'pb-4', 'bg-dark', 'text-light');
  });
});
