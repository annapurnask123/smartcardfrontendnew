import { useState, useEffect } from 'react';

const SimpleNotification = ({ message, type = 'info', duration = 5000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!isVisible || !message) return null;

  const getAlertClass = () => {
    switch (type) {
      case 'success': return 'alert-success';
      case 'error': return 'alert-danger';
      case 'warning': return 'alert-warning';
      case 'info':
      default: return 'alert-info';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return 'fas fa-check-circle';
      case 'error': return 'fas fa-exclamation-triangle';
      case 'warning': return 'fas fa-exclamation-circle';
      case 'info':
      default: return 'fas fa-info-circle';
    }
  };

  return (
    <div className={`alert ${getAlertClass()} alert-dismissible fade show position-fixed`} 
         style={{ top: '20px', right: '20px', zIndex: 9999, minWidth: '300px' }}>
      <i className={`${getIcon()} me-2`}></i>
      {message}
      <button 
        type="button" 
        className="btn-close" 
        onClick={() => {
          setIsVisible(false);
          if (onClose) onClose();
        }}
      ></button>
    </div>
  );
};

export default SimpleNotification;

