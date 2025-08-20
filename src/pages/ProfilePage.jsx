import { useSelector } from 'react-redux'

function ProfilePage() {
  const user = useSelector(s => s.auth.user)
  return (
    <div className="container mt-5 pt-5">
      <div className="row">
        <div className="col-md-8 mx-auto">
          <h2 className="mb-4"><i className="fas fa-user me-2"></i>Profile</h2>
          <div className="card">
            <div className="card-body">
              <form>
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Full Name</label>
                      <input type="text" className="form-control" defaultValue={user?.name || ''} />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Phone Number</label>
                      <input type="tel" className="form-control" defaultValue={user?.phone || ''} />
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-control" defaultValue={user?.email || ''} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Change Password</label>
                  <input type="password" className="form-control" placeholder="Enter new password" />
                </div>
                <div className="mb-3">
                  <label className="form-label">Confirm Password</label>
                  <input type="password" className="form-control" placeholder="Confirm new password" />
                </div>
                <button type="submit" className="btn btn-primary"><i className="fas fa-save me-2"></i>Update Profile</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage

