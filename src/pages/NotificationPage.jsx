import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { notificationAPI } from '../api/api'

function NotificationPage() {
  const user = useSelector(s => s.auth.user)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchNotifications() {
      if (!user?.id && !user?._id) return
      
      setLoading(true)
      setError('')
      
      try {
        const response = await notificationAPI.getUserNotifications(user.id || user._id)
        const userNotifications = response.data || response.notifications || []
        setNotifications(userNotifications)
      } catch (err) {
        console.error('Failed to fetch notifications:', err)
        setError('Failed to load notifications. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchNotifications()
  }, [user])

  const markAsRead = async (notificationId) => {
    try {
      await notificationAPI.markAsRead(notificationId)
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId || n._id === notificationId 
            ? { ...n, isRead: true } 
            : n
        )
      )
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead(user.id || user._id)
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
    }
  }

  if (loading) {
    return (
      <div className="container mt-5 pt-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading notifications...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mt-5 pt-5">
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </div>
      </div>
    )
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <div className="container mt-5 pt-5">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>
              <i className="fas fa-bell text-primary me-2"></i>
              Notifications
              {unreadCount > 0 && (
                <span className="badge bg-danger ms-2">{unreadCount}</span>
              )}
            </h2>
            {unreadCount > 0 && (
              <button 
                className="btn btn-outline-primary btn-sm"
                onClick={markAllAsRead}
              >
                <i className="fas fa-check-double me-1"></i>
                Mark All Read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-bell-slash fa-3x text-muted mb-3"></i>
              <h5 className="text-muted">No notifications</h5>
              <p className="text-muted">You're all caught up!</p>
            </div>
          ) : (
            <div className="list-group">
              {notifications.map((notification) => {
                const id = notification.id || notification._id
                const isUnread = !notification.isRead
                
                return (
                  <div 
                    key={id}
                    className={`list-group-item list-group-item-action ${isUnread ? 'border-start border-primary border-3' : ''}`}
                    style={{ backgroundColor: isUnread ? '#f8f9fa' : 'white' }}
                  >
                    <div className="d-flex w-100 justify-content-between align-items-start">
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center mb-2">
                          <div className="notification-icon me-3">
                            <i className={`fas fa-${getNotificationIcon(notification.type)} fa-lg ${getNotificationColor(notification.type)}`}></i>
                          </div>
                          <div>
                            <h6 className="mb-1 fw-bold">
                              {notification.title || 'Notification'}
                              {isUnread && <span className="badge bg-primary ms-2 small">New</span>}
                            </h6>
                            <p className="mb-1 text-muted">
                              {notification.message || notification.body || 'No message'}
                            </p>
                          </div>
                        </div>
                        <small className="text-muted">
                          <i className="fas fa-clock me-1"></i>
                          {formatDate(notification.createdAt || notification.timestamp)}
                        </small>
                      </div>
                      {isUnread && (
                        <button 
                          className="btn btn-outline-primary btn-sm ms-3"
                          onClick={() => markAsRead(id)}
                        >
                          <i className="fas fa-check"></i>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .notification-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(0,0,0,0.05);
        }
        .list-group-item:hover {
          background-color: #f8f9fa !important;
        }
      `}</style>
    </div>
  )
}

function getNotificationIcon(type) {
  switch (type?.toLowerCase()) {
    case 'payment': return 'credit-card'
    case 'ticket': return 'ticket-alt'
    case 'journey': return 'route'
    case 'subscription': return 'crown'
    case 'card': return 'id-card'
    case 'wallet': return 'wallet'
    case 'system': return 'cog'
    case 'alert': return 'exclamation-triangle'
    default: return 'bell'
  }
}

function getNotificationColor(type) {
  switch (type?.toLowerCase()) {
    case 'payment': return 'text-success'
    case 'ticket': return 'text-primary'
    case 'journey': return 'text-info'
    case 'subscription': return 'text-warning'
    case 'card': return 'text-secondary'
    case 'wallet': return 'text-success'
    case 'system': return 'text-muted'
    case 'alert': return 'text-danger'
    default: return 'text-primary'
  }
}

function formatDate(dateString) {
  if (!dateString) return 'Unknown'
  
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  } catch {
    return dateString
  }
}

export default NotificationPage
