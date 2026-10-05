/**
 * Storage Manager for Expense Tracker
 * Handles local storage persistence, transactions CRUD, and initial seed data.
 */

// Version 2 ensures any previous seed cached in browser is cleared out cleanly to 0
const STORAGE_KEY = 'expense_tracker_inr_v2';

// Available categories defined per specification
const CATEGORIES = {
  income: [
    'Salary',
    'Freelance',
    'Investments',
    'Gifts',
    'Borrowed Money',
    'Received Money',
    'Other'
  ],
  expense: [
    'Food & Dining',
    'Shopping',
    'Housing/Rent',
    'Transportation',
    'Entertainment',
    'Healthcare',
    'Education',
    'Money Given to Others',
    'EMI',
    'Loan Payment',
    'Other'
  ]
};

// Initial transactions start completely empty as requested
const INITIAL_TRANSACTIONS = [];

const Storage = {
  /**
   * Fetch all transactions from localStorage
   */
  getTransactions() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data === null) {
        // Initialize as completely empty
        this.saveTransactions([]);
        return [];
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to read from localStorage:', e);
      return [];
    }
  },

  /**
   * Save full transactions array to localStorage
   */
  saveTransactions(transactions) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
      window.dispatchEvent(new CustomEvent('transactionsUpdated', { detail: transactions }));
      return true;
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
      return false;
    }
  },

  /**
   * Add a new transaction
   */
  addTransaction(tx) {
    const transactions = this.getTransactions();
    const newTx = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      createdAt: new Date().toISOString(),
      ...tx
    };
    transactions.unshift(newTx);
    this.saveTransactions(transactions);
    return newTx;
  },

  /**
   * Update an existing transaction
   */
  updateTransaction(id, updatedFields) {
    const transactions = this.getTransactions();
    const index = transactions.findIndex(t => t.id === id);
    if (index !== -1) {
      transactions[index] = {
        ...transactions[index],
        ...updatedFields,
        updatedAt: new Date().toISOString()
      };
      this.saveTransactions(transactions);
      return transactions[index];
    }
    return null;
  },

  /**
   * Delete transaction by ID
   */
  deleteTransaction(id) {
    const transactions = this.getTransactions();
    const filtered = transactions.filter(t => t.id !== id);
    this.saveTransactions(filtered);
    return filtered.length !== transactions.length;
  },

  /**
   * Mark a borrowed or lent transaction as settled/closed
   */
  toggleSettled(id) {
    const transactions = this.getTransactions();
    const target = transactions.find(t => t.id === id);
    if (target) {
      target.isSettled = !target.isSettled;
      this.saveTransactions(transactions);
      return target;
    }
    return null;
  },

  /**
   * Reset data to completely empty (0)
   */
  resetData() {
    this.saveTransactions([]);
    return [];
  },

  /**
   * Clear all transactions
   */
  clearAll() {
    this.saveTransactions([]);
    return [];
  }
};

window.Storage = Storage;
window.CATEGORIES = CATEGORIES;
