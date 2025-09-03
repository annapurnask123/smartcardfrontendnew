import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';


const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: 'Hello! I\'m your Smart Metro assistant. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const navigate = useNavigate();

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      text: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    // Simulate bot response
    setTimeout(() => {
      const botResponse = getBotResponse(inputMessage.toLowerCase());
      const botMessage = {
        id: messages.length + 2,
        type: 'bot',
        text: botResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    }, 1000);
  };

  const getBotResponse = (message) => {
    if (message.includes('ticket') || message.includes('book')) {
      return 'To book a ticket, go to the Home page and click "Book Ticket" or visit the Schedules page to see available trains.';
    } else if (message.includes('card') || message.includes('balance')) {
      return 'You can check your card balance and manage your cards on the Cards page. Click on "My Cards" in the navigation.';
    } else if (message.includes('schedule') || message.includes('train')) {
      return 'Check train schedules on the Schedules page. You can see all available trains and their timings there.';
    } else if (message.includes('journey') || message.includes('track')) {
      return 'Track your journey in real-time on the Journey Tracking page. You can see live updates and get notifications.';
    } else if (message.includes('payment') || message.includes('wallet')) {
      return 'For payments and wallet management, visit the Wallet page. You can recharge your card and view transaction history.';
    } else if (message.includes('subscription') || message.includes('plan')) {
      return 'View and purchase subscription plans on the Plans page. Choose a plan that suits your travel needs.';
    } else if (message.includes('help') || message.includes('support')) {
      return 'I\'m here to help! You can ask me about tickets, cards, schedules, payments, or any other metro-related questions.';
    } else {
      return 'I\'m not sure about that. You can ask me about tickets, cards, schedules, payments, or general help.';
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Chatbot Icon */}
      <div 
        className="chatbot-icon"
        onClick={() => setIsOpen(!isOpen)}
        title="Chat with Smart Metro Assistant"
      >
        <i className="fas fa-comments"></i>
        {messages.length > 1 && (
          <span className="chatbot-badge">{messages.length - 1}</span>
        )}
      </div>

      {/* Chatbot Modal */}
      {isOpen && (
        <div className="chatbot-modal">
          <div className="chatbot-header">
            <div className="d-flex align-items-center">
              <i className="fas fa-robot text-primary me-2"></i>
              <h6 className="mb-0">Smart Metro Assistant</h6>
            </div>
            <button 
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setIsOpen(false)}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`chatbot-message ${message.type === 'user' ? 'user-message' : 'bot-message'}`}
              >
                <div className="message-content">
                  {message.text}
                </div>
                <small className="message-time">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </small>
              </div>
            ))}
          </div>

          <div className="chatbot-input">
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                placeholder="Type your message..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <button 
                className="btn btn-primary"
                onClick={handleSendMessage}
                disabled={!inputMessage.trim()}
              >
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </div>
      )}

<style>{`
  .chatbot-icon {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, #007bff, #0056b3);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 24px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
    transition: all 0.3s ease;
    z-index: 1000;
  }

  .chatbot-icon:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(0, 123, 255, 0.4);
  }

  .chatbot-badge {
    position: absolute;
    top: -5px;
    right: -5px;
    background: #dc3545;
    color: white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .chatbot-modal {
    position: fixed;
    bottom: 90px;
    right: 20px;
    width: 350px;
    height: 500px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    z-index: 1001;
    border: 1px solid #e9ecef;
  }

  .chatbot-header {
    padding: 15px;
    border-bottom: 1px solid #e9ecef;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8f9fa;
    border-radius: 12px 12px 0 0;
  }

  .chatbot-messages {
    flex: 1;
    padding: 15px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .chatbot-message {
    max-width: 80%;
    padding: 10px 12px;
    border-radius: 12px;
    position: relative;
  }

  .bot-message {
    align-self: flex-start;
    background: #f1f3f4;
    color: #333;
  }

  .user-message {
    align-self: flex-end;
    background: #007bff;
    color: white;
  }

  .message-content {
    margin-bottom: 5px;
    line-height: 1.4;
  }

  .message-time {
    opacity: 0.7;
    font-size: 11px;
  }

  .chatbot-input {
    padding: 15px;
    border-top: 1px solid #e9ecef;
    border-radius: 0 0 12px 12px;
  }

  .chatbot-input .input-group {
    gap: 8px;
  }

  .chatbot-input .form-control {
    border-radius: 20px;
    border: 1px solid #dee2e6;
  }

  .chatbot-input .btn {
    border-radius: 50%;
    width: 40px;
    height: 40px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  @media (max-width: 768px) {
    .chatbot-modal {
      width: calc(100vw - 40px);
      height: 60vh;
      bottom: 80px;
    }
  }
`}</style>

    </>
  );
};

export default Chatbot;

