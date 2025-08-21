import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchTransactions } from '../slices/transactionSlice'

function TransactionsPage() {
  const dispatch = useDispatch()
  const { transactions, loading, error } = useSelector(s => s.transactions)

  useEffect(() => {
    dispatch(fetchTransactions())
  }, [dispatch])

  const recentTransactions = transactions?.slice(0, 5) || []
  const allTransactions = transactions || []

  if (loading) {
    return (
      <div className="container mt-5 pt-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading transactions...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mt-5 pt-5">
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="container mt-5 pt-5">
      <div className="row">
        <div className="col-12">
          <h2 className="mb-4">
            <i className="fas fa-exchange-alt text-primary me-2"></i>
            Transaction History
          </h2>

          {/* Recent Transactions Section */}
          <div className="row mb-5">
            <div className="col-12">
              <h4 className="mb-4">
                <i className="fas fa-clock text-warning me-2"></i>
                Recent Transactions
              </h4>
              {recentTransactions.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-receipt fa-3x text-muted mb-3"></i>
                  <h5 className="text-muted">No recent transactions</h5>
                  <p className="text-muted">Your recent transactions will appear here!</p>
                </div>
              ) : (
                <div className="row">
                  {recentTransactions.map((transaction, index) => (
                    <div key={transaction.id || `recent-${index}`} className="col-lg-4 col-md-6 mb-3">
                      <div className="card border-0 shadow-sm hover-lift">
                        <div className="card-body">
                          <div className="d-flex align-items-center mb-3">
                            <div className="transaction-icon me-3">
                              <i className={`fas fa-${getTransactionIcon(transaction.type)} fa-2x ${getTransactionColor(transaction.type)}`}></i>
                            </div>
                            <div>
                              <h6 className="card-title mb-1">
                                {transaction.description || 'Transaction'}
                              </h6>
                              <span className={`badge ${getTypeBadgeClass(transaction.type)}`}>
                                {transaction.type || 'Unknown'}
                              </span>
                            </div>
                          </div>
                          <div className="row text-muted small">
                            <div className="col-6">
                              <i className="fas fa-calendar me-1"></i>
                              {formatDate(transaction.date || transaction.createdAt)}
                            </div>
                            <div className="col-6 text-end">
                              <span className={`fw-bold ${transaction.type === 'credit' ? 'text-success' : 'text-danger'}`}>
                                {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* All Transactions Section */}
          <div className="row">
            <div className="col-12">
              <h4 className="mb-4">
                <i className="fas fa-list text-info me-2"></i>
                All Transactions
              </h4>
              {allTransactions.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-receipt fa-3x text-muted mb-3"></i>
                  <h5 className="text-muted">No transactions found</h5>
                  <p className="text-muted">Your transaction history will appear here</p>
                </div>
              ) : (
                <div className="card border-0 shadow">
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Description</th>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allTransactions.map((transaction, index) => (
                            <tr key={transaction.id || `transaction-${index}`}>
                              <td>
                                <div className="d-flex align-items-center">
                                  <div className="transaction-icon-small me-2">
                                    <i className={`fas fa-${getTransactionIcon(transaction.type)} ${getTransactionColor(transaction.type)}`}></i>
                                  </div>
                                  <div>
                                    <div className="fw-bold">
                                      {transaction.description || 'Transaction'}
                                    </div>
                                    <small className="text-muted">
                                      {transaction.reference || 'No reference'}
                                    </small>
                                  </div>
                                </div>
                              </td>
                              <td>{formatDate(transaction.date || transaction.createdAt)}</td>
                              <td>
                                <span className={`badge ${getTypeBadgeClass(transaction.type)}`}>
                                  {transaction.type || 'Unknown'}
                                </span>
                              </td>
                              <td>
                                <span className={`fw-bold ${transaction.type === 'credit' ? 'text-success' : 'text-danger'}`}>
                                  {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount || 0}
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${getStatusBadgeClass(transaction.status)}`}>
                                  {transaction.status || 'Completed'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {allTransactions.length > 0 && (
            <div className="text-center mt-4">
              <small className="text-muted">
                Showing {allTransactions.length} transactions
              </small>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .transaction-icon {
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(0,0,0,0.05);
        }
        .transaction-icon-small {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(0,0,0,0.05);
        }
        .hover-lift {
          transition: transform 0.2s ease-in-out;
        }
        .hover-lift:hover {
          transform: translateY(-2px);
        }
        @media (max-width: 768px) {
          .table-responsive {
            font-size: 0.9rem;
          }
          .transaction-icon {
            width: 40px;
            height: 40px;
          }
          .transaction-icon i {
            font-size: 1.5rem !important;
          }
          .transaction-icon-small {
            width: 25px;
            height: 25px;
          }
          .transaction-icon-small i {
            font-size: 0.8rem !important;
          }
        }
      `}</style>
    </div>
  )
}

function getTransactionIcon(type) {
  switch (type?.toLowerCase()) {
    case 'credit': return 'arrow-down'
    case 'debit': return 'arrow-up'
    case 'payment': return 'credit-card'
    case 'refund': return 'undo'
    case 'recharge': return 'plus-circle'
    default: return 'exchange-alt'
  }
}

function getTransactionColor(type) {
  switch (type?.toLowerCase()) {
    case 'credit': return 'text-success'
    case 'debit': return 'text-danger'
    case 'payment': return 'text-primary'
    case 'refund': return 'text-warning'
    case 'recharge': return 'text-info'
    default: return 'text-secondary'
  }
}

function getTypeBadgeClass(type) {
  switch (type?.toLowerCase()) {
    case 'credit': return 'bg-success'
    case 'debit': return 'bg-danger'
    case 'payment': return 'bg-primary'
    case 'refund': return 'bg-warning'
    case 'recharge': return 'bg-info'
    default: return 'bg-secondary'
  }
}

function getStatusBadgeClass(status) {
  switch (status?.toLowerCase()) {
    case 'completed': return 'bg-success'
    case 'pending': return 'bg-warning'
    case 'failed': return 'bg-danger'
    case 'processing': return 'bg-info'
    default: return 'bg-secondary'
  }
}

function formatDate(dateString) {
  if (!dateString) return 'Unknown'
  
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  } catch {
    return dateString
  }
}

export default TransactionsPage

