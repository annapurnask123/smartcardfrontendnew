import { useSelector } from 'react-redux'

function TransactionsPage() {
  const transactions = useSelector(s => s.data.transactions)
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

