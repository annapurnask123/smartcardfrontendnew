import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchNotifications, markAllNotificationsRead } from '../slices/notificationSlice'
import { notificationAPI } from '../api/api'

function NotificationsPage() {
  const dispatch = useDispatch()
  const notifications = useSelector(s => s.notifications.messages)
  const q = useSelector(s => s.ui.query)

  useEffect(() => {
    dispatch(fetchNotifications())
  }, [dispatch])

  async function markAll() {
    try { 
      await notificationAPI.markAllAsRead() 
      dispatch(markAllNotificationsRead())
    } catch (error) {
      console.error('Failed to mark notifications as read:', error)
      // Still update UI even if API fails
      dispatch(markAllNotificationsRead())
    }
  }

  const filteredNotifications = notifications.filter(n => 
    !q || `${n.title || ''} ${n.message || ''}`.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div className="container mt-5 pt-5">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>
              <i className="fas fa-bell text-primary me-2"></i>
              Notifications
            </h2>
            <button 
              className="btn btn-outline-primary" 
              onClick={markAll}
              disabled={notifications.length === 0}
            >
              <i className="fas fa-check-double me-2"></i>
              Mark All Read
            </button>
          </div>

          {filteredNotifications.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-bell-slash fa-3x text-muted mb-3"></i>
              <h5 className="text-muted">No notifications</h5>
              <p className="text-muted">You're all caught up!</p>
            </div>
          ) : (
            <div className="row">
              {filteredNotifications.map((notification, index) => (
                <div key={notification.id || `notification-${index}`} className="col-12 mb-3">
                  <div className={`card border-0 shadow-sm ${notification.read ? 'bg-light' : 'border-start border-primary border-4'}`}>
                    <div className="card-body">
                      <div className="d-flex align-items-start">
                        <div className="notification-icon me-3">
                          <i className={`fas fa-${getNotificationIcon(notification.type)} fa-2x ${getNotificationColor(notification.type)}`}></i>
                        </div>
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <h6 className="card-title mb-0 fw-bold">
                              {notification.title || 'Notification'}
                            </h6>
                            <small className="text-muted">
                              {formatTime(notification.time || notification.timestamp)}
                            </small>
                          </div>
                          <p className="card-text text-muted mb-0">
                            {notification.message || 'No message content'}
                          </p>
                          {!notification.read && (
                            <span className="badge bg-primary mt-2">New</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {notifications.length > 0 && (
            <div className="text-center mt-4">
              <small className="text-muted">
                Showing {filteredNotifications.length} of {notifications.length} notifications
              </small>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .notification-icon {
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(0,0,0,0.05);
        }
        .card {
          transition: transform 0.2s ease-in-out;
        }
        .card:hover {
          transform: translateY(-2px);
        }
        @media (max-width: 768px) {
          .d-flex.justify-content-between {
            flex-direction: column;
            gap: 1rem;
          }
          .notification-icon {
            width: 40px;
            height: 40px;
          }
          .notification-icon i {
            font-size: 1.5rem !important;
          }
        }
      `}</style>
    </div>
  )
}

function getNotificationIcon(type) {
  switch (type) {
    case 'success': return 'check-circle'
    case 'error': return 'exclamation-triangle'
    case 'warning': return 'exclamation-circle'
    case 'info': return 'info-circle'
    default: return 'bell'
  }
}

function getNotificationColor(type) {
  switch (type) {
    case 'success': return 'text-success'
    case 'error': return 'text-danger'
    case 'warning': return 'text-warning'
    case 'info': return 'text-info'
    default: return 'text-primary'
  }
}

function formatTime(timeString) {
  if (!timeString) return 'Just now'
  
  try {
    const date = new Date(timeString)
    const now = new Date()
    const diffInMinutes = Math.floor((now - date) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return date.toLocaleDateString()
  } catch {
    return timeString
  }
}

export default NotificationsPage

