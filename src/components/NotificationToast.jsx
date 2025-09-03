import { useEffect } from 'react';
import { toast } from 'react-toastify';

const NotificationToast = ({ message, type = 'info', duration = 5000 }) => {
  useEffect(() => {
    if (message) {
      switch (type) {
        case 'success':
          toast.success(message, {
            position: "top-right",
            autoClose: duration,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
          break;
        case 'error':
          toast.error(message, {
            position: "top-right",
            autoClose: duration,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
          break;
        case 'warning':
          toast.warning(message, {
            position: "top-right",
            autoClose: duration,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
          break;
        case 'info':
        default:
          toast.info(message, {
            position: "top-right",
            autoClose: duration,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
          break;
      }
    }
  }, [message, type, duration]);

  return null;
};

export default NotificationToast;
