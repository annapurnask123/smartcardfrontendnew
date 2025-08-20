 import React from 'react'
import { useSelector } from 'react-redux'

function WalletPage() {
  const { walletBalance, transactions } = useSelector(s => s.data)
  return (
    <div className="container mt-5 pt-5">
      <h2 className="mb-4"><i className="fas fa-wallet me-2"></i>Wallet</h2>
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card balance-card">
            <div className="card-body text-center">
              <h3>₹<span>{walletBalance.toFixed(2)}</span></h3>
              <p className="mb-3">Available Balance</p>
              <button className="btn btn-light">
                <i className="fas fa-plus me-2"></i>Add Money
              </button>
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
            <div key={tx.id} className="transaction-item p-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="mb-1">{tx.description}</h6>
                  <small className="text-muted">{tx.date}</small>
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

