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
   * Mark a borrowed or lent transaction as settled/closed.
   * When Borrowed Money is repaid: Logs an expense repayment transaction ("Repaid borrowed money to [Person]")
   *   -> naturally decreases balance.
   * When Money Given to Others is collected/paid back: Logs an income receipt transaction ("Received lent money from [Person]")
   *   -> naturally increases balance.
   * If toggled back to unsettled (reopened): Automatically reverses the settlement transaction.
   */
  toggleSettled(id) {
    const transactions = this.getTransactions();
    const target = transactions.find(t => t.id === id);
    if (!target) return null;

    const willBeSettled = !target.isSettled;
    target.isSettled = willBeSettled;

    if (willBeSettled) {
      // 1. Borrowed money repaid -> record Expense (reduces balance)
      if (target.category === 'Borrowed Money') {
        const settlementTx = {
          id: 'settle_' + target.id,
          settlesId: target.id,
          type: 'expense',
          category: 'Loan Payment',
          amount: target.amount,
          date: new Date().toISOString().split('T')[0],
          description: `Repaid borrowed money to ${target.personName || 'Lender'}`,
          notes: `Auto-recorded repayment for borrowed transaction: "${target.description || 'Borrowed money'}"`,
          personName: target.personName || '',
          isSettlementRecord: true,
          createdAt: new Date().toISOString()
        };
        transactions.unshift(settlementTx);
      }
      // 2. Lent money received back -> record Income (increases balance)
      else if (target.category === 'Money Given to Others') {
        const settlementTx = {
          id: 'settle_' + target.id,
          settlesId: target.id,
          type: 'income',
          category: 'Received Money',
          amount: target.amount,
          date: new Date().toISOString().split('T')[0],
          description: `Received lent money back from ${target.personName || 'Borrower'}`,
          notes: `Auto-recorded collection for lent transaction: "${target.description || 'Money given'}"`,
          personName: target.personName || '',
          isSettlementRecord: true,
          createdAt: new Date().toISOString()
        };
        transactions.unshift(settlementTx);
      }
    } else {
      // Reopened -> Remove linked settlement transaction
      const settleIndex = transactions.findIndex(t => t.settlesId === target.id);
      if (settleIndex !== -1) {
        transactions.splice(settleIndex, 1);
      }
    }

    this.saveTransactions(transactions);
    return target;
  },

  /**
   * Delete transaction by ID and any attached settlement transaction
   */
  deleteTransaction(id) {
    let transactions = this.getTransactions();
    const target = transactions.find(t => t.id === id);

    // If deleting an original debt, also remove its settlement transaction if one exists
    transactions = transactions.filter(t => t.id !== id && t.settlesId !== id);

    // If deleting a settlement transaction directly, reopen the original debt
    if (target && target.settlesId) {
      const orig = transactions.find(t => t.id === target.settlesId);
      if (orig) orig.isSettled = false;
    }

    this.saveTransactions(transactions);
    return true;
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
