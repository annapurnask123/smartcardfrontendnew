import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchSubscriptionPlans } from "../slices/subscriptionplanSlice";

function SubscriptionPlansPage() {
  const dispatch = useDispatch();
  const { plans = [], loading, error } = useSelector(state => state.subscriptionplan);

  useEffect(() => {
    dispatch(fetchSubscriptionPlans());
  }, [dispatch]);

  return (
    <div className="container mt-5 pt-5">
      <h2><i className="fas fa-list-alt me-2"></i>Subscription Plans</h2>
      {loading && <p>Loading...</p>}
      {error && <p className="text-danger">{error}</p>}
      <div className="row">
        {plans.length === 0 && !loading && !error && (
          <div className="col-12 text-center text-muted">No plans found.</div>
        )}
        {plans.map(plan => (
          <div className="col-md-4 mb-4" key={plan.id || plan._id}>
            <div className="card">
              <div className="card-body text-center">
                <h5 className="card-title">{plan.name}</h5>
                <h2 className="text-primary">
                  ₹{plan.price}
                  <small className="text-muted">/{plan.duration}</small>
                </h2>
                <ul className="list-unstyled mt-3">
                  {(plan.features || []).map((f, i) => (
                    <li key={i}>
                      <i className="fas fa-check text-success me-2"></i>
                      {f}
                    </li>
                  ))}
                </ul>
                <button className="btn btn-primary w-100">Take Plan</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SubscriptionPlansPage;