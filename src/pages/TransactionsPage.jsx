import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchTransactions } from '../slices/transactionSlice'
import { transactionAPI } from '../api/api'

function TransactionsPage() {
  const dispatch = useDispatch()
  const { transactions, loading, error } = useSelector(s => s.transactions)
  const user = useSelector(s => s.auth.user)
  const [localTransactions, setLocalTransactions] = useState([])
  const [localLoading, setLocalLoading] = useState(false)
  const [localError, setLocalError] = useState('')
  
  // Pagination and filtering states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    async function fetchUserTransactions() {
      if (!user?.id && !user?._id) return
      
      setLocalLoading(true)
      setLocalError('')
      
      try {
        // Try to fetch from Redux first
        dispatch(fetchTransactions())
        
        // Also try direct API call
        const response = await transactionAPI.getUserTransactions(user.id || user._id)
        const apiTransactions = response.data || response.transactions || []
        setLocalTransactions(apiTransactions)
      } catch (err) {
        console.error('Failed to fetch transactions:', err)
        
        // Create mock transactions for testing
        const mockTransactions = [
          {
            id: 'tx-1',
            type: 'subscription_payment',
            amount: 299,
            description: 'Monthly Subscription Plan',
            date: new Date(Date.now() - 86400000).toISOString(),
            status: 'completed'
          },
          {
            id: 'tx-2',
            type: 'ticket_payment',
            amount: 50,
            description: 'Metro Ticket - Central to Airport',
            date: new Date(Date.now() - 172800000).toISOString(),
            status: 'completed'
          },
          {
            id: 'tx-3',
            type: 'card_recharge',
            amount: 100,
            description: 'Card Recharge - VM-ABC123DEF',
            date: new Date(Date.now() - 259200000).toISOString(),
            status: 'completed'
          },
          {
            id: 'tx-4',
            type: 'wallet_payment',
            amount: 25,
            description: 'Wallet Payment - Journey Fare',
            date: new Date(Date.now() - 345600000).toISOString(),
            status: 'completed'
          },
          {
            id: 'tx-5',
            type: 'ticket_payment',
            amount: 35,
            description: 'Metro Ticket - Airport to Downtown',
            date: new Date(Date.now() - 432000000).toISOString(),
            status: 'pending'
          },
          {
            id: 'tx-6',
            type: 'card_recharge',
            amount: 200,
            description: 'Card Recharge - VM-XYZ789ABC',
            date: new Date(Date.now() - 518400000).toISOString(),
            status: 'failed'
          },
          {
            id: 'tx-7',
            type: 'subscription_payment',
            amount: 599,
            description: 'Family Plan Subscription',
            date: new Date(Date.now() - 604800000).toISOString(),
            status: 'completed'
          },
          {
            id: 'tx-8',
            type: 'wallet_payment',
            amount: 40,
            description: 'Wallet Payment - Express Journey',
            date: new Date(Date.now() - 691200000).toISOString(),
            status: 'completed'
          }
        ];
        
        setLocalTransactions(mockTransactions)
      } finally {
        setLocalLoading(false)
      }
    }
    
    fetchUserTransactions()
  }, [dispatch, user])

  // Use local transactions if available, fallback to Redux state
  const displayTransactions = localTransactions.length > 0 ? localTransactions : (transactions || [])
  
  // Filter transactions
  const filteredTransactions = displayTransactions.filter(transaction => {
    const typeMatch = filterType === 'all' || transaction.type === filterType
    const statusMatch = filterStatus === 'all' || transaction.status === filterStatus
    return typeMatch && statusMatch
  })
  
  // Sort transactions
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let aValue, bValue
    
    switch (sortBy) {
      case 'date':
        aValue = new Date(a.date || a.createdAt)
        bValue = new Date(b.date || b.createdAt)
        break
      case 'amount':
        aValue = a.amount || 0
        bValue = b.amount || 0
        break
      case 'type':
        aValue = a.type || ''
        bValue = b.type || ''
        break
      case 'status':
        aValue = a.status || ''
        bValue = b.status || ''
        break
      default:
        aValue = a.date || a.createdAt
        bValue = b.date || b.createdAt
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })
  
  // Paginate transactions
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTransactions = sortedTransactions.slice(startIndex, endIndex)
  
  const recentTransactions = displayTransactions.slice(0, 5)

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filterType, filterStatus, sortBy, sortOrder, itemsPerPage])

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }
    return pages
  }

  if (loading || localLoading) {
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

  if (error || localError) {
    return (
      <div className="container mt-5 pt-5">
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {localError || error}
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
                      <div className={`card border-0 shadow-sm ticket-card ${getTransactionCardClass(transaction.type)}`}>
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
                                {formatTransactionType(transaction.type)}
                              </span>
                            </div>
                          </div>
                          <div className="row text-muted small">
                            <div className="col-6">
                              <i className="fas fa-calendar me-1"></i>
                              {formatDate(transaction.date || transaction.createdAt)}
                            </div>
                            <div className="col-6 text-end">
                              <span className={`fw-bold ${isCredit(transaction) ? 'text-success' : isDebit(transaction) ? 'text-danger' : 'text-secondary'}`}>
                                {isCredit(transaction) ? '+' : isDebit(transaction) ? '-' : ''}₹{transaction.amount || 0}
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
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="mb-0">
                  <i className="fas fa-list text-info me-2"></i>
                  All Transactions
                </h4>
                <div className="d-flex gap-2 flex-wrap">
                  {/* Items per page */}
                  <select 
                    className="form-select form-select-sm" 
                    style={{width: 'auto'}}
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  >
                    <option value={5}>5 per page</option>
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                    <option value={50}>50 per page</option>
                  </select>
                  
                  {/* Sort by */}
                  <select 
                    className="form-select form-select-sm" 
                    style={{width: 'auto'}}
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="date">Sort by Date</option>
                    <option value="amount">Sort by Amount</option>
                    <option value="type">Sort by Type</option>
                    <option value="status">Sort by Status</option>
                  </select>
                  
                  {/* Sort order */}
                  <select 
                    className="form-select form-select-sm" 
                    style={{width: 'auto'}}
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                  >
                    <option value="desc">Newest First</option>
                    <option value="asc">Oldest First</option>
                  </select>
                  
                  {/* Filter by type */}
                  <select 
                    className="form-select form-select-sm" 
                    style={{width: 'auto'}}
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="all">All Types</option>
                    <option value="ticket">Ticket</option>
                    <option value="ticket_payment">Ticket Payment</option>
                    <option value="subscription">Subscription</option>
                    <option value="subscription_payment">Subscription Payment</option>
                    <option value="recharge">Card Recharge</option>
                    <option value="card_recharge">Card Recharge</option>
                    <option value="payment">Payment</option>
                    <option value="refund">Refund</option>
                    <option value="wallet_topup">Wallet Top-up</option>
                    <option value="wallet_credit">Wallet Credit</option>
                    <option value="wallet_debit">Wallet Debit</option>
                    <option value="wallet_recharge">Wallet Recharge</option>
                    <option value="wallet_payment">Wallet Payment</option>
                    <option value="cancellation">Cancellation</option>
                  </select>
                  
                  {/* Filter by status */}
                  <select 
                    className="form-select form-select-sm" 
                    style={{width: 'auto'}}
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
              </div>
              
              {sortedTransactions.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-receipt fa-3x text-muted mb-3"></i>
                  <h5 className="text-muted">No transactions found</h5>
                  <p className="text-muted">Try adjusting your filters or check back later</p>
                </div>
              ) : (
                <>
                  <div className="card border-0 shadow">
                    <div className="card-body p-0">
                      <div className="table-responsive">
                        <table className="table mb-0">
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
                            {paginatedTransactions.map((transaction, index) => (
                              <tr key={transaction.id || `transaction-${index}`} className={getTransactionRowClass(transaction.type)}>
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
                                        {transaction.reference || transaction.id || 'No reference'}
                                      </small>
                                    </div>
                                  </div>
                                </td>
                                <td>{formatDate(transaction.date || transaction.createdAt)}</td>
                                <td>
                                  <span className={`badge ${getTypeBadgeClass(transaction.type)}`}>
                                    {formatTransactionType(transaction.type)}
                                  </span>
                                </td>
                                <td>
                                  <span className={`fw-bold ${isCredit(transaction) ? 'text-success' : isDebit(transaction) ? 'text-danger' : 'text-secondary'}`}>
                                    {isCredit(transaction) ? '+' : isDebit(transaction) ? '-' : ''}₹{transaction.amount || 0}
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
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-4">
                      <div className="text-muted">
                        Showing {startIndex + 1} to {Math.min(endIndex, sortedTransactions.length)} of {sortedTransactions.length} transactions
                      </div>
                      <nav>
                        <ul className="pagination pagination-sm mb-0">
                          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                            <button 
                              className="page-link" 
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={currentPage === 1}
                            >
                              <i className="fas fa-chevron-left"></i>
                            </button>
                          </li>
                          
                          {getPageNumbers().map(page => (
                            <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                              <button 
                                className="page-link" 
                                onClick={() => handlePageChange(page)}
                              >
                                {page}
                              </button>
                            </li>
                          ))}
                          
                          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                            <button 
                              className="page-link" 
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={currentPage === totalPages}
                            >
                              <i className="fas fa-chevron-right"></i>
                            </button>
                          </li>
                        </ul>
                      </nav>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
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
        .ticket-card {
          border-left: 4px solid !important;
        }
        .ticket-card-ticket {
          border-left-color: #fd7e14 !important;
          background: linear-gradient(to right, rgba(253, 126, 20, 0.1), transparent);
        }
        .ticket-card-subscription {
          border-left-color: #6f42c1 !important;
          background: linear-gradient(to right, rgba(111, 66, 193, 0.1), transparent);
        }
        .ticket-card-recharge {
          border-left-color: #20c997 !important;
          background: linear-gradient(to right, rgba(32, 201, 151, 0.1), transparent);
        }
        .ticket-card-wallet {
          border-left-color: #495057 !important;
          background: linear-gradient(to right, rgba(73, 80, 87, 0.1), transparent);
        }
        .ticket-card-default {
          border-left-color: #6c757d !important;
          background: linear-gradient(to right, rgba(108, 117, 125, 0.1), transparent);
        }
        .table-row-ticket {
          background-color: rgba(253, 126, 20, 0.08) !important;
        }
        .table-row-subscription {
          background-color: rgba(111, 66, 193, 0.08) !important;
        }
        .table-row-recharge {
          background-color: rgba(32, 201, 151, 0.08) !important;
        }
        .table-row-wallet {
          background-color: rgba(73, 80, 87, 0.08) !important;
        }
        .table-row-default {
          background-color: rgba(108, 117, 125, 0.05) !important;
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

function getTransactionCardClass(type) {
  if (!type) return 'ticket-card-default';
  
  const txType = type.toLowerCase();
  
  if (txType.includes('ticket')) return 'ticket-card-ticket';
  if (txType.includes('subscription')) return 'ticket-card-subscription';
  if (txType.includes('recharge')) return 'ticket-card-recharge';
  if (txType.includes('wallet')) return 'ticket-card-wallet';
  return 'ticket-card-default';
}

function getTransactionRowClass(type) {
  if (!type) return 'table-row-default';
  
  const txType = type.toLowerCase();
  
  if (txType.includes('ticket')) return 'table-row-ticket';
  if (txType.includes('subscription')) return 'table-row-subscription';
  if (txType.includes('recharge')) return 'table-row-recharge';
  if (txType.includes('wallet')) return 'table-row-wallet';
  return 'table-row-default';
}

function getTransactionIcon(type) {
  if (!type) return 'exchange-alt';
  
  const txType = type.toLowerCase();
  
  switch (txType) {
    case 'credit': return 'arrow-down'
    case 'debit': return 'arrow-up'
    case 'payment': return 'credit-card'
    case 'refund': return 'undo'
    case 'recharge': return 'plus-circle'
    case 'subscription': return 'calendar-alt'
    case 'ticket': return 'ticket-alt'
    case 'ticket_payment': return 'ticket-alt'
    case 'subscription_payment': return 'calendar-alt'
    case 'card_recharge': return 'plus-circle'
    case 'card_recharge_payment': return 'plus-circle'
    case 'subscription_plan_payment': return 'calendar-alt'
    case 'ticket_booking_payment': return 'ticket-alt'
    case 'wallet_payment': return 'wallet'
    case 'wallet_recharge': return 'wallet'
    case 'wallet_topup': return 'wallet'
    case 'wallet_credit': return 'plus-circle'
    case 'wallet_debit': return 'minus-circle'
    case 'cancellation': return 'times-circle'
    default: return 'exchange-alt'
  }
}

function getTransactionColor(type) {
  if (!type) return 'text-secondary';
  
  const txType = type.toLowerCase();
  
  switch (txType) {
    case 'credit': return 'text-success'
    case 'debit': return 'text-danger'
    case 'payment': return 'text-primary'
    case 'refund': return 'text-warning'
    case 'recharge': return 'text-info'
    case 'subscription': return 'text-purple'
    case 'ticket': return 'text-warning'
    case 'ticket_payment': return 'text-warning'
    case 'subscription_payment': return 'text-purple'
    case 'card_recharge': return 'text-info'
    case 'card_recharge_payment': return 'text-info'
    case 'subscription_plan_payment': return 'text-purple'
    case 'ticket_booking_payment': return 'text-warning'
    case 'wallet_payment': return 'text-dark'
    case 'wallet_recharge': return 'text-success'
    case 'wallet_topup': return 'text-success'
    case 'wallet_credit': return 'text-success'
    case 'wallet_debit': return 'text-danger'
    case 'cancellation': return 'text-danger'
    default: return 'text-secondary'
  }
}

function getTypeBadgeClass(type) {
  if (!type) return 'bg-secondary';
  
  const txType = type.toLowerCase();
  
  switch (txType) {
    case 'credit': return 'bg-success'
    case 'debit': return 'bg-danger'
    case 'payment': return 'bg-primary'
    case 'refund': return 'bg-warning'
    case 'recharge': return 'bg-info'
    case 'subscription': return 'bg-purple'
    case 'ticket': return 'bg-warning'
    case 'ticket_payment': return 'bg-warning'
    case 'subscription_payment': return 'bg-purple'
    case 'card_recharge': return 'bg-info'
    case 'card_recharge_payment': return 'bg-info'
    case 'subscription_plan_payment': return 'bg-purple'
    case 'ticket_booking_payment': return 'bg-warning'
    case 'wallet_payment': return 'bg-dark'
    case 'wallet_recharge': return 'bg-success'
    case 'wallet_topup': return 'bg-success'
    case 'wallet_credit': return 'bg-success'
    case 'wallet_debit': return 'bg-danger'
    case 'cancellation': return 'bg-danger'
    default: return 'bg-secondary'
  }
}

function getStatusBadgeClass(status) {
  if (!status) return 'bg-success';
  
  switch (status.toLowerCase()) {
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

function formatTransactionType(type) {
  if (!type) return 'Transaction';
  
  const txType = type.toLowerCase();
  
  switch (txType) {
    case 'credit': return 'Credit'
    case 'debit': return 'Debit'
    case 'payment': return 'Payment'
    case 'refund': return 'Refund'
    case 'recharge': return 'Card Recharge'
    case 'subscription': return 'Subscription'
    case 'ticket': return 'Ticket'
    case 'ticket_payment': return 'Ticket Payment'
    case 'subscription_payment': return 'Subscription Payment'
    case 'card_recharge': return 'Card Recharge'
    case 'card_recharge_payment': return 'Card Recharge'
    case 'subscription_plan_payment': return 'Subscription Plan'
    case 'ticket_booking_payment': return 'Ticket Booking'
    case 'wallet_payment': return 'Wallet Payment'
    case 'wallet_recharge': return 'Wallet Recharge'
    case 'wallet_topup': return 'Wallet Top-up'
    case 'wallet_credit': return 'Wallet Credit'
    case 'wallet_debit': return 'Wallet Debit'
    case 'cancellation': return 'Cancellation'
    default: return txType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }
}

function isCredit(tx) {
  if (!tx) return false;
  
  const type = (tx.transactionType || tx.type || '').toLowerCase()
  return ['credit', 'refund', 'wallet_credit', 'wallet_recharge', 'wallet_topup', 'recharge', 'cancellation'].includes(type)
}

function isDebit(tx) {
  if (!tx) return false;
  
  const type = (tx.transactionType || tx.type || '').toLowerCase()
  return ['debit', 'payment', 'ticket', 'ticket_payment', 'subscription', 'subscription_payment', 'wallet_payment', 'wallet_debit'].includes(type)
}

export default TransactionsPage