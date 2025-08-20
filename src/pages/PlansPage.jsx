import { useSelector, useDispatch } from "react-redux";
import { useEffect } from "react";
import { fetchSubscriptionPlans } from "../slices/subscriptionplanSlice";

function PlansPage() {
  const dispatch = useDispatch();
  const { plans = [], loading, error } = useSelector(state => state.subscriptionplan);

  useEffect(() => {
    dispatch(fetchSubscriptionPlans());
  }, [dispatch]);

  return (
    <div className="container mt-5 pt-5">
      {/* ...existing code... */}
      <div className="row">
  {plans.map((plan, idx) => (
    <div className="col-md-4 mb-4" key={plan.id || plan._id || idx}>
      {/* ...existing code... */}
    </div>
  ))}
</div>
    </div>
  );
}

export default PlansPage;