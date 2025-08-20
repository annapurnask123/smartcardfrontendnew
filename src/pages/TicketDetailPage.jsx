import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ticketAPI, stationAPI, paymentAPI } from '../api/api'
import { openRazorpayCheckout } from '../utils/razorpay'

function TicketDetailPage() {
  const { ticketId } = useParams()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState(null)
  const [qr, setQr] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const { data } = await ticketAPI.getTicket(ticketId)
        setTicket(data)
        try {
          const qrRes = await ticketAPI.generateQR(ticketId)
          setQr(qrRes.data?.qr || '')
        } catch {}
      } catch (e) {
        setError('Failed to load ticket')
      } finally {
        setLoading(false)
      }
    })()
  }, [ticketId])

  async function handleCancel() {
    try {
      setLoading(true)
      await ticketAPI.cancelTicket({ ticketId })
      navigate('/tickets')
    } finally { setLoading(false) }
  }

  async function handleEarlyDrop() {
    try {
      setLoading(true)
      await ticketAPI.dropEarly({ ticketId })
      navigate('/tickets')
    } finally { setLoading(false) }
  }

  async function handleExtend(newDestinationId, amount) {
    // Create payment order, verify, then extend via backend
    const amountPaise = Math.round((amount || 0) * 100)
    const { data: order } = await paymentAPI.createPaymentOrder({ amount: amountPaise, currency: 'INR', purpose: 'extend-ticket', meta: { ticketId, newDestinationId } })
    await openRazorpayCheckout({
      key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_xxxxxxxxxxxxx',
      amount: order.amount,
      name: 'SmartMetroCard',
      description: 'Extend Journey',
      orderId: order.id,
      handler: async (response) => {
        await paymentAPI.verifyPayment({
          orderId: order.id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpayOrderId: response.razorpay_order_id,
          razorpaySignature: response.razorpay_signature,
        })
        await ticketAPI.extendJourney({ ticketId, newDestinationId, paymentOrderId: order.id })
        navigate('/tickets')
      },
    })
  }

  if (!ticket) return (
    <div className="container mt-5 pt-5">
      {loading ? 'Loading…' : error || 'Ticket not found'}
    </div>
  )

  return (
    <div className="container mt-5 pt-5">
      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0"><i className="fas fa-ticket-alt me-2"></i>Ticket {ticket.id || ticket._id}</h5>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <small className="text-muted">From</small>
                  <div className="fw-bold">{ticket.sourceName || ticket.source}</div>
                </div>
                <div className="text-end">
                  <small className="text-muted">To</small>
                  <div className="fw-bold">{ticket.destinationName || ticket.destination}</div>
                </div>
              </div>
              <hr />
              <div className="d-flex justify-content-between">
                <div>Status: <span className={`badge bg-${(ticket.status||'active')==='active'?'success':'secondary'}`}>{ticket.status}</span></div>
                <div>Passengers: <strong>{ticket.passengerCount || 1}</strong></div>
              </div>
            </div>
          </div>
          <div className="mt-3 d-flex gap-2">
            <button className="btn btn-outline-danger" onClick={handleCancel} disabled={loading}><i className="fas fa-times me-2"></i>Cancel</button>
            <button className="btn btn-outline-warning" onClick={handleEarlyDrop} disabled={loading}><i className="fas fa-door-open me-2"></i>Early Drop</button>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header bg-light">
              <h6 className="mb-0"><i className="fas fa-qrcode me-2"></i>QR Code</h6>
            </div>
            <div className="card-body d-flex justify-content-center align-items-center">
              {qr ? (
                <img src={qr} alt="Ticket QR" style={{ maxWidth: '100%', height: 'auto' }} />
              ) : (
                <span className="text-muted">QR not available</span>
              )}
            </div>
          </div>
          <div className="card mt-3">
            <div className="card-header bg-light">
              <h6 className="mb-0"><i className="fas fa-arrows-alt me-2"></i>Extend Journey</h6>
            </div>
            <div className="card-body">
              <ExtendForm onExtend={handleExtend} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ExtendForm({ onExtend }) {
  const [destinationId, setDestinationId] = useState('')
  const [fare, setFare] = useState('')
  return (
    <form onSubmit={(e)=>{e.preventDefault(); if (!destinationId) return; onExtend(destinationId, Number(fare)||0)}}>
      <div className="row g-2">
        <div className="col-6">
          <input className="form-control" placeholder="New destination id" value={destinationId} onChange={e=>setDestinationId(e.target.value)} />
        </div>
        <div className="col-4">
          <input className="form-control" placeholder="Fare" value={fare} onChange={e=>setFare(e.target.value)} />
        </div>
        <div className="col-2 d-grid">
          <button className="btn btn-primary" type="submit">Go</button>
        </div>
      </div>
    </form>
  )
}

export default TicketDetailPage

