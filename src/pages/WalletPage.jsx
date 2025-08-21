import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchWallet, clearWalletError } from "../slices/walletSlice";

export default function WalletPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const { balance, transactions, loading, error } = useSelector((state) => state.wallet);
  const [rechargeAmount, setRechargeAmount] = useState(100);
  const [showRechargeModal, setShowRechargeModal] = useState(false);

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchWallet(user.id));
    }
  }, [dispatch, user]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearWalletError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [dispatch, error]);

  const handleRecharge = () => {
    // Navigate to payment page with recharge amount
    navigate('/payment', { 
      state: { 
        type: 'recharge', 
        amount: rechargeAmount,
        description: `Wallet Recharge - ₹${rechargeAmount}`
      } 
    });
  };

  const quickRechargeAmounts = [50, 100, 200, 500, 1000];

  const recentTransactions = transactions?.slice(0, 5) || [];
  const allTransactions = transactions || [];

  if (loading) {
    return (
      <div className="container mt-5 pt-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-5 pt-5">
      <div className="row">
        <div className="col-12">
          <h2 className="mb-4">
            <i className="fas fa-wallet text-primary me-2"></i>
            My Wallet
          </h2>

          {error && (
            <div className="alert alert-danger">
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
            </div>
          )}

          {/* Balance Card */}
          <div className="row mb-5">
            <div className="col-lg-8 col-md-10 mx-auto">
              <div className="wallet-balance-card">
                <div className="balance-header">
                  <div className="balance-icon">
                    <i className="fas fa-wallet"></i>
                  </div>
                  <div className="balance-info">
                    <h6 className="text-muted mb-1">Current Balance</h6>
                    <h2 className="balance-amount">₹{Number(balance || 0).toFixed(2)}</h2>
                    <p className="text-muted mb-0">Available for metro travel</p>
                  </div>
                </div>
                <div className="balance-actions">
                  <button 
                    className="btn btn-primary btn-lg"
                    onClick={() => setShowRechargeModal(true)}
                  >
                    <i className="fas fa-plus me-2"></i>
                    Recharge Wallet
                  </button>
                  <button 
                    className="btn btn-outline-secondary"
                    onClick={() => navigate('/transactions')}
                  >
                    <i className="fas fa-history me-2"></i>
                    View All Transactions
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Recharge Options */}
          <div className="row mb-5">
            <div className="col-12">
              <h4 className="mb-4">
                <i className="fas fa-bolt text-warning me-2"></i>
                Quick Recharge
              </h4>
              <div className="row">
                {quickRechargeAmounts.map((amount) => (
                  <div key={amount} className="col-lg-2 col-md-3 col-sm-4 col-6 mb-3">
                    <button 
                      className="btn btn-outline-primary w-100 h-100 p-3 recharge-option"
                      onClick={() => {
                        setRechargeAmount(amount);
                        setShowRechargeModal(true);
                      }}
                    >
                      <div className="recharge-amount">₹{amount}</div>
                      <small className="text-muted">Quick Add</small>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="row">
            <div className="col-12">
              <h4 className="mb-4">
                <i className="fas fa-clock text-info me-2"></i>
                Recent Transactions
              </h4>
              {recentTransactions.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-receipt fa-3x text-muted mb-3"></i>
                  <h5 className="text-muted">No transactions yet</h5>
                  <p className="text-muted">Your transaction history will appear here</p>
                </div>
              ) : (
                <div className="card border-0 shadow-sm">
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
                          {recentTransactions.map((transaction, index) => (
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
        </div>
      </div>

      {/* Recharge Modal */}
      {showRechargeModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-plus-circle text-primary me-2"></i>
                  Recharge Wallet
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowRechargeModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Amount (₹)</label>
                  <input
                    type="number"
                    className="form-control form-control-lg"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(Number(e.target.value))}
                    min="10"
                    step="10"
                  />
                </div>
                <div className="alert alert-info">
                  <i className="fas fa-info-circle me-2"></i>
                  Minimum recharge amount is ₹10
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowRechargeModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleRecharge}
                  disabled={rechargeAmount < 10}
                >
                  <i className="fas fa-credit-card me-2"></i>
                  Proceed to Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .wallet-balance-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 2rem;
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          position: relative;
          overflow: hidden;
        }

        .wallet-balance-card::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          animation: float 6s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }

        .balance-header {
          display: flex;
          align-items: center;
          margin-bottom: 2rem;
          position: relative;
          z-index: 1;
        }

        .balance-icon {
          width: 80px;
          height: 80px;
          background: rgba(255,255,255,0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          margin-right: 1.5rem;
        }

        .balance-amount {
          font-size: 3rem;
          font-weight: bold;
          margin: 0;
        }

        .balance-actions {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          position: relative;
          z-index: 1;
        }

        .recharge-option {
          transition: all 0.3s ease;
          border-radius: 12px;
        }

        .recharge-option:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,123,255,0.2);
        }

        .recharge-amount {
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 0.25rem;
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

        @media (max-width: 768px) {
          .balance-header {
            flex-direction: column;
            text-align: center;
          }

          .balance-icon {
            margin-right: 0;
            margin-bottom: 1rem;
          }

          .balance-amount {
            font-size: 2.5rem;
          }

          .balance-actions {
            justify-content: center;
          }

          .recharge-option {
            padding: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
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
