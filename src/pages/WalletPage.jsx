import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchWallet, clearWalletError } from "../slices/walletSlice";

export default function WalletPage() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const { balance, transactions, loading, error } = useSelector((state) => state.wallet);

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

  if (loading) return <p>Loading wallet...</p>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      <h2>Wallet Balance: ₹{balance.toFixed(2)}</h2>
      <h3>Transactions:</h3>
      {transactions.length === 0 && <p>No transactions yet.</p>}
      <ul>
        {transactions.map((tx) => (
          <li key={tx._id || tx.id}>
            {tx.description || tx.type} - ₹{tx.amount} on {new Date(tx.date || tx.createdAt).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}
