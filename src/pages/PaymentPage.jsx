import { useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { addTicket } from '../slices/dataSlice'
import { openRazorpayCheckout } from '../utils/razorpay'
import { paymentAPI, ticketAPI } from '../api/api'

function PaymentPage() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const booking = state?.booking
  const user = useSelector(s => s.auth.user)

  async function pay() {
    try {
      const amountPaise = Math.round(Number(String(booking.total).replace(/[^0-9.]/g,'')) * 100)
      const { data: order } = await paymentAPI.createPaymentOrder({ amount: amountPaise, currency: 'INR', purpose: 'ticket', meta: { source: booking.sourceId, destination: booking.destinationId } })
      await openRazorpayCheckout({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_xxxxxxxxxxxxx',
        amount: order.amount,
        name: 'SmartMetroCard',
        description: 'Ticket Payment',
        orderId: order.id,
        handler: async (response) => {
          try {
            await paymentAPI.verifyPayment({
              orderId: order.id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            })
            // Create ticket in backend after successful payment
            const createPayload = {
              sourceId: booking.sourceId,
              destinationId: booking.destinationId,
              passengerCount: booking.passengerCount,
              journeyType: booking.journeyType,
              amount: amountPaise / 100,
              paymentOrderId: order.id,
            }
            const { data: ticket } = await ticketAPI.bookTicket(createPayload)
            dispatch(addTicket({
              id: ticket?.id || ticket?._id || `TKT${Date.now()}`,
              source: booking.sourceName,
              destination: booking.destinationName,
              date: new Date().toLocaleDateString(),
              status: ticket?.status || 'active',
              amount: booking.total,
            }))
            navigate('/tickets')
          } catch (e) {
            // optional: show error toast
          }
        },
      })
    } catch (e) {
      // no-op
    }
  }

  async function payWithWallet() {
    try {
      const amount = Number(String(booking.total).replace(/[^0-9.]/g,''))
      const { data: ticket } = await ticketAPI.bookTicket({
        sourceId: booking.sourceId,
        destinationId: booking.destinationId,
        passengerCount: booking.passengerCount,
        journeyType: booking.journeyType,
        amount,
        paymentMethod: 'wallet',
      })
      dispatch(addTicket({
        id: ticket?.id || ticket?._id || `TKT${Date.now()}`,
        source: booking.sourceName,
        destination: booking.destinationName,
        date: new Date().toLocaleDateString(),
        status: ticket?.status || 'active',
        amount: booking.total,
      }))
      navigate('/tickets')
    } catch (e) {
      // show error toast
    }
  }

  if (!booking) return <div className="container mt-5 pt-5">Invalid booking.</div>

  return (
    <div className="container mt-5 pt-5">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card">
            <div className="card-header bg-success text-white">
              <h5><i className="fas fa-credit-card me-2"></i>Payment</h5>
            </div>
            <div className="card-body">
              <div className="mb-4">
                <h6>Booking Summary</h6>
                <div className="card bg-light">
                  <div className="card-body">
                    <div className="d-flex justify-content-between">
                      <div><small className="text-muted">From</small><br /><strong>{booking.sourceName}</strong></div>
                      <div className="text-end"><small className="text-muted">To</small><br /><strong>{booking.destinationName}</strong></div>
                    </div>
                    <hr />
                    <div className="d-flex justify-content-between">
                      <span>Passengers: {booking.passengerCount}</span>
                      <span>Type: {booking.journeyType}</span>
                    </div>
                    <div className="d-flex justify-content-between mt-2">
                      <strong>Total Amount: {booking.total}</strong>
                    </div>
                  </div>
                </div>
              </div>
              <div className="d-grid gap-2 d-sm-flex">
                <button className="btn btn-success flex-fill" onClick={pay}><i className="fas fa-lock me-2"></i>Pay {booking.total}</button>
                <button className="btn btn-outline-primary flex-fill" onClick={payWithWallet}><i className="fas fa-wallet me-2"></i>Pay with Wallet</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaymentPage