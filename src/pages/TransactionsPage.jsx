import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setTransactions } from '../slices/dataSlice'
import { transactionAPI } from '../api/api'

function TransactionsPage() {
  const dispatch = useDispatch()
  const transactions = useSelector(s => s.data.transactions)
  const user = useSelector(s => s.auth.user)
  useEffect(() => {
    (async () => {
      if (!user?.id && !user?._id) return
      try {
        const { data } = await transactionAPI.getUserTransactions(user.id || user._id)
        dispatch(setTransactions(Array.isArray(data) ? data : data?.items || []))
      } catch {}
    })()
  }, [dispatch, user])
  return (
    <div className="container mt-5 pt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="fas fa-exchange-alt me-2"></i>Transaction History</h2>
      </div>
      <div className="card">
        <div className="card-body p-0">
          {transactions.map(tx => (
            <div key={tx.id} className="transaction-item p-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="mb-1">{tx.description}</h6>
                  <small className="text-muted">{tx.date} | {tx.method}</small>
                </div>
                <div className="text-end">
                  <span className={`transaction-amount ${tx.type}`}>{tx.type === 'credit' ? '+' : '-'}₹{tx.amount}</span>
                  <br />
                  <small className="text-muted">ID: {tx.id}</small>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default TransactionsPage

