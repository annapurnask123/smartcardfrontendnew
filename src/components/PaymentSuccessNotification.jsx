import { useState, useEffect } from 'react';

const PaymentSuccessNotification = ({ message, type = 'success', onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return 'fas fa-check-circle';
      case 'error': return 'fas fa-exclamation-triangle';
      case 'warning': return 'fas fa-exclamation-circle';
      default: return 'fas fa-info-circle';
    }
  };

  const getAlertClass = () => {
    switch (type) {
      case 'success': return 'alert-success';
      case 'error': return 'alert-danger';
      case 'warning': return 'alert-warning';
      default: return 'alert-info';
    }
  };

  return (
    <div className={`alert ${getAlertClass()} alert-dismissible fade show position-fixed`} 
         style={{ top: '20px', right: '20px', zIndex: 9999, minWidth: '300px' }}>
      <i className={`${getIcon()} me-2`}></i>
      <strong>{type === 'success' ? 'Payment Successful!' : 'Payment Status'}</strong>
      <br />
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

export default PaymentSuccessNotification;
