import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { addMoney, fetchWallet } from '../slices/walletSlice'
import { openRazorpayCheckout } from '../utils/razorpay'
import { paymentAPI } from '../api/api'

function WalletPage() {
  const dispatch = useDispatch()
  const user = useSelector(s => s.auth.user)
  const { balance, transactions, loading } = useSelector(s => s.wallet)
  const [topup, setTopup] = useState('')

  useEffect(() => {
    if (!user?.id && !user?._id) return
    dispatch(fetchWallet(user.id || user._id))
  }, [dispatch, user])

  async function handleAddMoney() {
    const amount = Number(topup)
    if (!amount || amount <= 0) return
    const amountPaise = Math.round(amount * 100)
    const { data: order } = await paymentAPI.createPaymentOrder({ amount: amountPaise, currency: 'INR', purpose: 'wallet-topup' })
    await openRazorpayCheckout({
      key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_xxxxxxxxxxxxx',
      amount: order.amount,
      name: 'SmartMetroCard',
      description: 'Wallet Top-up',
      orderId: order.id,
      handler: async (response) => {
        await paymentAPI.verifyPayment({
          orderId: order.id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpayOrderId: response.razorpay_order_id,
          razorpaySignature: response.razorpay_signature,
        })
        dispatch(addMoney({ userId: user.id || user._id, amount }))
        setTopup('')
      },
    })
  }
  return (
    <div className="container mt-5 pt-5">
      <h2 className="mb-4"><i className="fas fa-wallet me-2"></i>Wallet</h2>
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card balance-card">
            <div className="card-body text-center">
              <h3>₹<span>{Number(balance || 0).toFixed(2)}</span></h3>
              <p className="mb-3">Available Balance</p>
              <div className="input-group mb-2">
                <span className="input-group-text">₹</span>
                <input className="form-control" placeholder="Amount" value={topup} onChange={e=>setTopup(e.target.value)} />
                <button className="btn btn-light" disabled={loading} onClick={handleAddMoney}><i className="fas fa-plus me-2"></i>Add Money</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5><i className="fas fa-history me-2"></i>Recent Transactions</h5>
        </div>
        <div className="card-body p-0">
          {transactions.slice(0,10).map(tx => (
            <div key={tx.id || tx._id} className="transaction-item p-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="mb-1">{tx.description || tx.type}</h6>
                  <small className="text-muted">{tx.date || tx.createdAt}</small>
                </div>
                <div className="text-end">
                  <span className={`transaction-amount ${tx.type}`}>{tx.type === 'credit' ? '+' : '-'}₹{tx.amount}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default WalletPage