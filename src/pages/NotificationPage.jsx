import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../slices/notificationSlice'
import { notificationAPI } from '../api/api'

function NotificationPage() {
  const dispatch = useDispatch()
  const user = useSelector(s => s.auth.user) || JSON.parse(localStorage.getItem('user') || '{}')
  const notifications = useSelector(s => s.notifications?.messages || [])
  const loading = useSelector(s => s.notifications?.loading || false)
  const error = useSelector(s => s.notifications?.error || '')
  const [localNotifications, setLocalNotifications] = useState([])
  const [loadError, setLoadError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  // Deduplicate notifications by ID or content
  const deduplicateNotifications = (notifs) => {
    const seen = new Set();
    return notifs.filter(notif => {
      const key = notif.id || notif._id || `${notif.type}-${notif.title}-${notif.createdAt}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  };

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const userId = user?.id || user?._id;
        if (userId) {
          console.log('Loading notifications for user:', userId);
          setIsLoading(true);
          
          // Try direct API call first
          try {
            const response = await notificationAPI.getByUser(userId);
            const apiNotifications = response.data?.notifications || response.data || [];
            if (Array.isArray(apiNotifications) && apiNotifications.length > 0) {
              const dedupedNotifications = deduplicateNotifications(apiNotifications);
              setLocalNotifications(dedupedNotifications);
              console.log('Loaded notifications from API:', dedupedNotifications.length);
            } else {
              // Fallback to Redux
              await dispatch(fetchNotifications(userId));
            }
          } catch (apiError) {
            console.warn('API call failed, trying Redux:', apiError);
            await dispatch(fetchNotifications(userId));
          }
        }
      } catch (err) {
        console.error('Failed to load notifications:', err);
        setLoadError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();
  }, [dispatch, user?.id, user?._id]);

  // Combine and deduplicate notifications from both sources
  const allNotifications = deduplicateNotifications([
    ...localNotifications,
    ...notifications
  ]).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      
      // Update local state
      setLocalNotifications(prev => 
        prev.map(notif => 
          (notif.id === notificationId || notif._id === notificationId)
            ? { ...notif, isRead: true, read: true }
            : notif
        )
      );
      
      // Also update Redux state
      dispatch(markNotificationRead(notificationId));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const userId = user?.id || user?._id;
      if (userId) {
        await notificationAPI.markAllAsRead(userId);
        
        // Update local state
        setLocalNotifications(prev => 
          prev.map(notif => ({ ...notif, isRead: true, read: true }))
        );
        
        // Also update Redux state
        dispatch(markAllNotificationsRead());
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const refreshNotifications = async () => {
    const userId = user?.id || user?._id;
    if (userId) {
      await dispatch(fetchNotifications(userId));
    }
  }

  const unreadCount = allNotifications.filter(n => !(n.isRead || n.read)).length

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
        <h2>
          <i className="fas fa-bell me-2"></i>
          Notifications
          {unreadCount > 0 && (
            <span className="badge bg-danger ms-2">{unreadCount}</span>
          )}
        </h2>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-primary btn-sm" 
            onClick={refreshNotifications} 
            disabled={isLoading}
          >
            {isLoading ? (
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
          <button 
            className="btn btn-outline-secondary btn-sm" 
            onClick={handleMarkAllAsRead} 
            disabled={isLoading || allNotifications.length === 0 || unreadCount === 0}
          >
            <i className="fas fa-check-double me-1"></i>
            Mark All Read
          </button>
        </div>
      </div>

      {(error || loadError) && (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error || loadError || 'Failed to load notifications. Please try again.'}
        </div>
      )}

      <div className="card">
        <div className="card-body">
          {isLoading && allNotifications.length === 0 ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2 text-muted">Loading notifications...</p>
            </div>
          ) : allNotifications.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-bell-slash fa-3x text-muted mb-3"></i>
              <p className="text-muted">No notifications yet</p>
              <p className="small text-muted">
                You'll receive notifications for card activities, journeys, and system updates.
              </p>
            </div>
          ) : (
            <div className="list-group list-group-flush">
              {allNotifications.map((notification) => {
                const id = notification.id || notification._id
                const isUnread = !(notification.isRead || notification.read)
                return (
                  <div 
                    key={id} 
                    className={`list-group-item d-flex align-items-start ${isUnread ? 'bg-light border-start border-primary border-3' : ''}`}
                  >
                    <div className="me-3 mt-1">
                      <i className={`fas fa-${getNotificationIcon(notification.type)} fa-lg ${getNotificationColor(notification.type)}`}></i>
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h6 className="mb-1">{notification.title || 'Notification'}</h6>
                          <p className="mb-1 text-muted">{notification.message || notification.body || 'No message content'}</p>
                        </div>
                        <div className="text-end">
                          <small className="text-muted d-block">
                            {formatDate(notification.createdAt || notification.timestamp || notification.time)}
                          </small>
                          {isUnread && (
                            <button 
                              className="btn btn-sm btn-outline-primary mt-1" 
                              onClick={() => handleMarkAsRead(id)}
                            >
                              <i className="fas fa-check me-1"></i>
                              Mark Read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
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