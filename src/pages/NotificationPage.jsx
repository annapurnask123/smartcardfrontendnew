import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../slices/notificationSlice'
import { notificationAPI } from '../api/api'

function NotificationPage() {
  const dispatch = useDispatch()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const notifications = useSelector(s => s.notifications?.messages || [])
  const loading = useSelector(s => s.notifications?.loading || false)
  const error = useSelector(s => s.notifications?.error || '')
  const [localNotifications, setLocalNotifications] = useState([])

  useEffect(() => {
    if (user.id || user._id) {
      dispatch(fetchNotifications(user.id || user._id))
    } else {
      dispatch(fetchNotifications())
    }
  }, [dispatch])

  useEffect(() => {
    setLocalNotifications(notifications)
  }, [notifications])

  const markAsRead = async (notificationId) => {
    try {
      setLocalNotifications(prev => 
        prev.map(n => 
          (n.id === notificationId || n._id === notificationId) 
            ? { ...n, isRead: true, read: true } 
            : n
        )
      )
      await notificationAPI.markAsRead(notificationId)
      dispatch(markNotificationRead(notificationId))
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
      setLocalNotifications(notifications)
    }
  }

  const markAllRead = async () => {
    try {
      setLocalNotifications(prev => prev.map(n => ({ ...n, isRead: true, read: true })))
      await notificationAPI.markAllAsRead(user.id || user._id)
      dispatch(markAllNotificationsRead())
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
      setLocalNotifications(notifications)
    }
  }

  const unreadCount = localNotifications.filter(n => !(n.isRead || n.read)).length

  function formatDate(date) {
    try {
      return new Date(date).toLocaleString()
    } catch {
      return ''
    }
  }

  function getNotificationIcon(type) {
    switch ((type || '').toLowerCase()) {
      case 'error': return 'exclamation-circle'
      case 'success': return 'check-circle'
      case 'warning': return 'exclamation-triangle'
      default: return 'info-circle'
    }
  }

  function getNotificationColor(type) {
    switch ((type || '').toLowerCase()) {
      case 'error': return 'text-danger'
      case 'success': return 'text-success'
      case 'warning': return 'text-warning'
      default: return 'text-info'
    }
  }

  return (
    <div className="container mt-5 pt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="fas fa-bell me-2"></i>Notifications</h2>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary btn-sm" onClick={() => dispatch(fetchNotifications(user.id || user._id))} disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-1"></span>
                Refreshing...
              </>
            ) : (
              <>
                <i className="fas fa-sync-alt me-1"></i>
                Refresh
              </>
            )}
          </button>
          <button className="btn btn-outline-secondary btn-sm" onClick={markAllRead} disabled={loading || localNotifications.length === 0}>
            <i className="fas fa-check-double me-1"></i>
            Mark All Read
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error || 'Failed to load notifications. Please try again.'}
        </div>
      )}

      <div className="card">
        <div className="card-body">
          {localNotifications.length === 0 ? (
            <p className="text-muted">No notifications</p>
          ) : (
            <div className="list-group">
              {localNotifications.map((notification) => {
                const id = notification.id || notification._id
                const isUnread = !(notification.isRead || notification.read)
                return (
                  <div key={id} className={`list-group-item d-flex align-items-center ${isUnread ? 'bg-light' : ''}`}>
                    <div className="me-3">
                      <i className={`fas fa-${getNotificationIcon(notification.type)} fa-lg ${getNotificationColor(notification.type)}`}></i>
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between">
                        <strong>{notification.title || 'Notification'}</strong>
                        <small className="text-muted">{formatDate(notification.createdAt || notification.timestamp || notification.time)}</small>
                      </div>
                      <div className="text-muted">{notification.message || notification.body || 'No message content'}</div>
                    </div>
                    {isUnread && (
                      <button className="btn btn-sm btn-outline-primary ms-3" onClick={() => markAsRead(id)}>
                        Mark Read
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default NotificationPage