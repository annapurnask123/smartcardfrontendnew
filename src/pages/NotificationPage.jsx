import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../slices/notificationSlice'
import { notificationAPI } from '../api/api'

function NotificationPage() {
  const dispatch = useDispatch()
  const user = useSelector(s => s.auth.user)
  const notifications = useSelector(s => s.notifications?.items || [])
  const loading = useSelector(s => s.notifications?.loading || false)
  const error = useSelector(s => s.notifications?.error || '')
  const [localNotifications, setLocalNotifications] = useState([])

  useEffect(() => {
    if (user?.id || user?._id) {
      dispatch(fetchNotifications(user.id || user._id))
    }
  }, [dispatch, user])

  // Sync local state with Redux state
  useEffect(() => {
    setLocalNotifications(notifications)
  }, [notifications])

  const markAsRead = async (notificationId) => {
    try {
      // Optimistic UI update
      setLocalNotifications(prev => 
        prev.map(n => 
          (n.id === notificationId || n._id === notificationId) 
            ? { ...n, isRead: true, read: true } 
            : n
        )
      )
      
      // API call
      await notificationAPI.markAsRead(notificationId)
      
      // Update Redux store
      dispatch(markNotificationRead(notificationId))
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
      // Revert optimistic update
      setLocalNotifications(notifications)
    }
  }

  const markAllAsRead = async () => {
    try {
      const userId = user?.id || user?._id
      if (!userId) return
      
      // Optimistic UI update
      setLocalNotifications(prev => prev.map(n => ({ ...n, isRead: true, read: true })))
      
      // API call
      await notificationAPI.markAllAsRead(userId)
      
      // Update Redux store
      dispatch(markAllNotificationsRead())
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
      // Revert optimistic update
      setLocalNotifications(notifications)
    }
  }

  if (loading) {
    return (
      <div className="container mt-5 pt-5">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" style={{width: '3rem', height: '3rem'}} role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading your notifications...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mt-5 pt-5">
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error || 'Failed to load notifications. Please try again.'}
          <div className="mt-2">
            <button 
              className="btn btn-outline-primary btn-sm"
              onClick={() => dispatch(fetchNotifications(user?.id || user?._id))}
            >
              <i className="fas fa-redo me-1"></i>
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  const unreadCount = localNotifications.filter(n => !(n.isRead || n.read)).length

  return (
    <div className="container mt-5 pt-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white py-3">
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0">
                  <i className="fas fa-bell text-primary me-2"></i>
                  Notifications
                  {unreadCount > 0 && (
                    <span className="badge bg-danger ms-2">{unreadCount}</span>
                  )}
                </h4>
                {unreadCount > 0 && localNotifications.length > 0 && (
                  <button 
                    className="btn btn-outline-primary btn-sm"
                    onClick={markAllAsRead}
                  >
                    <i className="fas fa-check-double me-1"></i>
                    Mark All Read
                  </button>
                )}
              </div>
            </div>

            <div className="card-body p-0">
              {localNotifications.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-bell-slash fa-4x text-muted mb-3"></i>
                  <h5 className="text-muted">No notifications yet</h5>
                  <p className="text-muted">We'll notify you when something important happens</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {localNotifications.map((notification) => {
                    const id = notification.id || notification._id
                    const isUnread = !(notification.isRead || notification.read)
                    
                    return (
                      <div 
                        key={id}
                        className={`list-group-item list-group-item-action border-0 p-4 ${isUnread ? 'bg-light' : ''}`}
                        style={{ borderLeft: isUnread ? '4px solid #0d6efd' : 'none' }}
                      >
                        <div className="d-flex w-100 justify-content-between align-items-start">
                          <div className="flex-grow-1 me-3">
                            <div className="d-flex align-items-start mb-2">
                              <div className="notification-icon me-3">
                                <i className={`fas fa-${getNotificationIcon(notification.type)} fa-lg ${getNotificationColor(notification.type)}`}></i>
                              </div>
                              <div className="flex-grow-1">
                                <h6 className="mb-1 fw-semibold">
                                  {notification.title || 'Notification'}
                                  {isUnread && <span className="badge bg-primary ms-2 small">New</span>}
                                </h6>
                                <p className="mb-2 text-muted">
                                  {notification.message || notification.body || 'No message content'}
                                </p>
                                <small className="text-muted">
                                  <i className="fas fa-clock me-1"></i>
                                  {formatDate(notification.createdAt || notification.timestamp || notification.time)}
                                </small>
                              </div>
                            </div>
                          </div>
                          {isUnread && (
                            <button 
                              className="btn btn-outline-primary btn-sm rounded-circle"
                              onClick={() => markAsRead(id)}
                              title="Mark as read"
                              style={{ width: '32px', height: '32px' }}
                            >
                              <i className="fas fa-check small"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {localNotifications.length > 0 && (
              <div className="card-footer bg-light text-center py-3">
                <small className="text-muted">
                  <i className="fas fa-info-circle me-1"></i>
                  Showing {localNotifications.length} notification{localNotifications.length !== 1 ? 's' : ''}
                </small>
              </div>
            )}
          </div>
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
  const typeStr = String(type || '').toLowerCase()
  switch (typeStr) {
    case 'payment': return 'credit-card'
    case 'ticket': return 'ticket-alt'
    case 'journey': return 'route'
    case 'subscription': return 'crown'
    case 'card': return 'id-card'
    case 'wallet': return 'wallet'
    case 'system': return 'cog'
    case 'alert': return 'exclamation-triangle'
    case 'success': return 'check-circle'
    case 'error': return 'exclamation-triangle'
    case 'warning': return 'exclamation-circle'
    case 'info': return 'info-circle'
    default: return 'bell'
  }
}

function getNotificationColor(type) {
  const typeStr = String(type || '').toLowerCase()
  switch (typeStr) {
    case 'payment': 
    case 'success': 
    case 'wallet': return 'text-success'
    case 'ticket': 
    case 'info': return 'text-primary'
    case 'journey': return 'text-info'
    case 'subscription': 
    case 'warning': return 'text-warning'
    case 'card': return 'text-secondary'
    case 'system': return 'text-muted'
    case 'alert': 
    case 'error': return 'text-danger'
    default: return 'text-primary'
  }
}

function formatDate(dateString) {
  if (!dateString) return 'Unknown time'
  
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return 'Invalid date'
  }
}

export default NotificationPage