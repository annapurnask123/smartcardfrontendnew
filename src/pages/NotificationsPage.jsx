import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { markAllNotificationsRead, setNotifications } from '../slices/dataSlice'
import { notificationAPI } from '../api/api'

function NotificationsPage() {
  const dispatch = useDispatch()
  const notifications = useSelector(s => s.data.notifications)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await notificationAPI.getNotifications()
        dispatch(setNotifications(Array.isArray(data) ? data : data?.items || []))
      } catch {}
    })()
  }, [dispatch])
  return (
    <div className="container mt-5 pt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="fas fa-bell me-2"></i>Notifications</h2>
        <button className="btn btn-outline-primary" onClick={() => dispatch(markAllNotificationsRead())}><i className="fas fa-check-double me-2"></i>Mark All Read</button>
      </div>
      <div>
        {notifications.map(n => (
          <div key={n.id} className={`card notification-item ${n.read ? '' : 'unread'} mb-3`}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h6 className="mb-1">{n.title}</h6>
                  <p className="mb-1">{n.message}</p>
                  <small className="text-muted">{n.time}</small>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default NotificationsPage

