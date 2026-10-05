/**
 * Transactions Ledger Controller
 * Handles filtering (type, category, date, search), sorting,
 * transaction list rendering, inline edit modal, and deletion with confirmation.
 */

document.addEventListener('DOMContentLoaded', () => {
  initTransactionsPage();

  window.addEventListener('transactionsUpdated', () => {
    applyFiltersAndRender();
  });
});

let state = {
  transactions: [],
  filterType: 'all',        // 'all', 'income', 'expense', 'borrowed', 'lent'
  filterCategory: 'all',
  filterDateRange: 'all',   // 'all', 'this_month', 'this_week', 'custom'
  searchQuery: '',
  sortBy: 'date-desc',      // 'date-desc', 'date-asc', 'amount-desc', 'amount-asc'
  editingId: null
};

function initTransactionsPage() {
  populateFilterCategories();
  attachFilterListeners();
  initEditModal();
  applyFiltersAndRender();
}

/**
 * Populate filter category options with all income and expense categories
 */
function populateFilterCategories() {
  const catSelect = document.getElementById('filter-category');
  if (!catSelect) return;

  const allCats = Array.from(new Set([...CATEGORIES.income, ...CATEGORIES.expense]));
  catSelect.innerHTML = '<option value="all">All Categories</option>' +
    allCats.map(c => `<option value="${UI.escapeHTML(c)}">${UI.escapeHTML(c)}</option>`).join('');
}

/**
 * Filter and search listeners
 */
function attachFilterListeners() {
  // 1. Type pills
  document.querySelectorAll('.filter-type-pill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-type-pill').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      state.filterType = e.currentTarget.getAttribute('data-type');
      applyFiltersAndRender();
    });
  });

  // 2. Category select
  const catSelect = document.getElementById('filter-category');
  if (catSelect) {
    catSelect.addEventListener('change', (e) => {
      state.filterCategory = e.target.value;
      applyFiltersAndRender();
    });
  }

  // 3. Date range select
  const dateRangeSelect = document.getElementById('filter-date-range');
  if (dateRangeSelect) {
    dateRangeSelect.addEventListener('change', (e) => {
      state.filterDateRange = e.target.value;
      applyFiltersAndRender();
    });
  }

  // 4. Sort by select
  const sortSelect = document.getElementById('sort-by');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      applyFiltersAndRender();
    });
  }

  // 5. Search box
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.toLowerCase().trim();
      applyFiltersAndRender();
    });
  }

  // 6. Reset Filters button
  const resetFiltersBtn = document.getElementById('reset-filters-btn');
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      state.filterType = 'all';
      state.filterCategory = 'all';
      state.filterDateRange = 'all';
      state.searchQuery = '';
      state.sortBy = 'date-desc';

      document.querySelectorAll('.filter-type-pill').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-type') === 'all');
      });
      if (catSelect) catSelect.value = 'all';
      if (dateRangeSelect) dateRangeSelect.value = 'all';
      if (sortSelect) sortSelect.value = 'date-desc';
      if (searchInput) searchInput.value = '';

      applyFiltersAndRender();
    });
  }

  // 7. Clear all data button
  const resetDataBtn = document.getElementById('btn-reset-data');
  if (resetDataBtn) {
    resetDataBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all transactions? Everything will be reset to zero.')) {
        Storage.clearAll();
        UI.showToast('All data cleared to zero', 'info');
        applyFiltersAndRender();
      }
    });
  }
}

/**
 * Filter & Sort pipeline
 */
function applyFiltersAndRender() {
  const all = Storage.getTransactions();
  state.transactions = all;

  let filtered = all.filter(t => {
    // 1. Type filter
    if (state.filterType === 'income' && t.type !== 'income') return false;
    if (state.filterType === 'expense' && t.type !== 'expense') return false;
    if (state.filterType === 'borrowed' && t.category !== 'Borrowed Money') return false;
    if (state.filterType === 'lent' && t.category !== 'Money Given to Others') return false;

    // 2. Category filter
    if (state.filterCategory !== 'all' && t.category !== state.filterCategory) return false;

    // 3. Search query
    if (state.searchQuery) {
      const q = state.searchQuery;
      const desc = (t.description || '').toLowerCase();
      const cat = (t.category || '').toLowerCase();
      const person = (t.personName || '').toLowerCase();
      const notes = (t.notes || '').toLowerCase();
      if (!desc.includes(q) && !cat.includes(q) && !person.includes(q) && !notes.includes(q)) {
        return false;
      }
    }

    // 4. Date Range
    if (state.filterDateRange !== 'all' && t.date) {
      const now = new Date();
      const txDate = new Date(t.date);

      if (state.filterDateRange === 'this_month') {
        if (txDate.getMonth() !== now.getMonth() || txDate.getFullYear() !== now.getFullYear()) {
          return false;
        }
      } else if (state.filterDateRange === 'this_week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        if (txDate < startOfWeek) return false;
      }
    }

    return true;
  });

  // Sorting
  filtered.sort((a, b) => {
    if (state.sortBy === 'date-desc') {
      return new Date(b.date) - new Date(a.date);
    } else if (state.sortBy === 'date-asc') {
      return new Date(a.date) - new Date(b.date);
    } else if (state.sortBy === 'amount-desc') {
      return (Number(b.amount) || 0) - (Number(a.amount) || 0);
    } else if (state.sortBy === 'amount-asc') {
      return (Number(a.amount) || 0) - (Number(b.amount) || 0);
    }
    return 0;
  });

  renderTransactionsList(filtered);
  updateCounterStats(filtered, all.length);
}

/**
 * Render the ledger rows
 */
function renderTransactionsList(list) {
  const container = document.getElementById('transactions-ledger');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3.5rem 1rem; color: var(--text-muted);">
        <i class="ph ph-receipt" style="font-size: 3rem; opacity: 0.4; display: block; margin-bottom: 0.5rem;"></i>
        <h4 style="font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.3rem;">No transactions found</h4>
        <p style="font-size: 0.88rem;">Try adjusting your filters or search keywords, or add a new transaction.</p>
        <a href="add-transaction.html" class="btn btn-primary btn-sm" style="margin-top: 1rem;">
          <i class="ph ph-plus-circle"></i> Add Transaction
        </a>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(tx => {
    const isBorrowed = tx.category === 'Borrowed Money';
    const isLent = tx.category === 'Money Given to Others';
    const isDebt = isBorrowed || isLent;

    let iconClass = tx.type === 'income' ? 'ph-arrow-down-left tx-icon-income' : 'ph-arrow-up-right tx-icon-expense';
    let badgeClass = tx.type === 'income' ? 'badge-income' : 'badge-expense';
    let amountColorClass = tx.type;

    if (isBorrowed) {
      iconClass = 'ph-hand-coins tx-icon-borrowed';
      badgeClass = 'badge-borrowed';
      amountColorClass = 'borrowed';
    } else if (isLent) {
      iconClass = 'ph-hand-heart tx-icon-lent';
      badgeClass = 'badge-lent';
      amountColorClass = 'lent';
    }

    const formattedAmount = `${tx.type === 'income' ? '+' : '-'} ${UI.formatINR(tx.amount)}`;
    const dueBadge = isDebt ? UI.getDueBadgeHTML(tx.dueDate, tx.isSettled) : '';

    return `
      <div class="tx-row" data-id="${tx.id}">
        <div class="tx-icon-col ${iconClass.split(' ')[1]}">
          <i class="ph ${iconClass.split(' ')[0]}"></i>
        </div>

        <div class="tx-details">
          <div class="tx-title-row">
            <span class="tx-title">${UI.escapeHTML(tx.description)}</span>
            <span class="badge ${badgeClass}">${UI.escapeHTML(tx.category)}</span>
            ${dueBadge}
          </div>
          <div class="tx-meta">
            <span><i class="ph ph-calendar"></i> ${UI.formatDate(tx.date)}</span>
            ${tx.personName ? `<span>&bull; <i class="ph ph-user"></i> ${UI.escapeHTML(tx.personName)}</span>` : ''}
            ${tx.notes ? `<span>&bull; <i class="ph ph-note"></i> ${UI.escapeHTML(tx.notes)}</span>` : ''}
          </div>
        </div>

        <div class="tx-amount-col">
          <div class="tx-amount ${amountColorClass}">${formattedAmount}</div>
          <span style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-dim);">
            ${tx.type}
          </span>
        </div>

        <div class="tx-actions-col">
          <button class="tx-action-btn edit-btn" data-id="${tx.id}" title="Edit transaction" aria-label="Edit">
            <i class="ph ph-pencil-simple"></i>
          </button>
          <button class="tx-action-btn delete-btn" data-id="${tx.id}" title="Delete transaction" aria-label="Delete">
            <i class="ph ph-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Attach action listeners
  container.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      openEditModal(id);
    });
  });

  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      handleDeleteTransaction(id);
    });
  });
}

/**
 * Update summary numbers under filter bar
 */
function updateCounterStats(filteredList, totalCount) {
  const countEl = document.getElementById('tx-results-count');
  if (countEl) {
    countEl.textContent = `Showing ${filteredList.length} of ${totalCount} transactions`;
  }
}

/**
 * Handle Deletion
 */
function handleDeleteTransaction(id) {
  const tx = state.transactions.find(t => t.id === id);
  const desc = tx ? `"${tx.description}" (${UI.formatINR(tx.amount)})` : 'this transaction';

  if (confirm(`Are you sure you want to delete ${desc}? This action cannot be undone.`)) {
    const deleted = Storage.deleteTransaction(id);
    if (deleted) {
      UI.showToast('Transaction deleted successfully', 'success');
      applyFiltersAndRender();
    }
  }
}

/**
 * Edit Modal Manager
 */
function initEditModal() {
  const modal = document.getElementById('edit-modal');
  const closeBtn = document.getElementById('edit-modal-close');
  const cancelBtn = document.getElementById('edit-modal-cancel');
  const form = document.getElementById('edit-modal-form');

  const closeModal = () => {
    modal.classList.remove('active');
    state.editingId = null;
  };

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Modal form submission
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!state.editingId) return;

      const amountVal = parseFloat(document.getElementById('edit-amount').value);
      const descVal = document.getElementById('edit-description').value.trim();
      const dateVal = document.getElementById('edit-date').value;
      const categoryVal = document.getElementById('edit-category').value;
      const personVal = document.getElementById('edit-person-name').value.trim();
      const dueDateVal = document.getElementById('edit-due-date').value;
      const notesVal = document.getElementById('edit-notes').value.trim();

      if (isNaN(amountVal) || amountVal <= 0) {
        UI.showToast('Amount must be greater than ₹0', 'error');
        return;
      }
      if (!descVal) {
        UI.showToast('Description is required', 'error');
        return;
      }

      const updated = {
        amount: amountVal,
        description: descVal,
        date: dateVal,
        category: categoryVal,
        notes: notesVal
      };

      if (categoryVal === 'Borrowed Money' || categoryVal === 'Money Given to Others') {
        updated.personName = personVal;
        updated.dueDate = dueDateVal;
      }

      Storage.updateTransaction(state.editingId, updated);
      UI.showToast('Transaction updated successfully', 'success');
      closeModal();
      applyFiltersAndRender();
    });
  }
}

function openEditModal(id) {
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;

  state.editingId = id;
  const modal = document.getElementById('edit-modal');
  const catSelect = document.getElementById('edit-category');
  const debtFieldsBox = document.getElementById('edit-debt-fields');

  // Populate category options based on type
  const catList = CATEGORIES[tx.type] || [];
  catSelect.innerHTML = catList.map(c => 
    `<option value="${UI.escapeHTML(c)}" ${c === tx.category ? 'selected' : ''}>${UI.escapeHTML(c)}</option>`
  ).join('');

  document.getElementById('edit-amount').value = tx.amount;
  document.getElementById('edit-description').value = tx.description || '';
  document.getElementById('edit-date').value = tx.date || '';
  document.getElementById('edit-notes').value = tx.notes || '';
  document.getElementById('edit-person-name').value = tx.personName || '';
  document.getElementById('edit-due-date').value = tx.dueDate || '';

  const checkDebtVisibility = () => {
    const val = catSelect.value;
    if (val === 'Borrowed Money' || val === 'Money Given to Others') {
      debtFieldsBox.style.display = 'block';
    } else {
      debtFieldsBox.style.display = 'none';
    }
  };

  catSelect.onchange = checkDebtVisibility;
  checkDebtVisibility();

  modal.classList.add('active');
}
