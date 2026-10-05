/**
 * Dashboard Logic
 * Coordinates statistics, debt tracking widgets, category donut charts, and monthly breakdown
 */

document.addEventListener('DOMContentLoaded', () => {
  initDashboard();

  // Listen for storage updates (e.g. from other tabs or actions)
  window.addEventListener('transactionsUpdated', () => {
    initDashboard();
  });

  window.addEventListener('themeChanged', () => {
    initDashboard();
  });
});

function initDashboard() {
  const transactions = Storage.getTransactions();

  updateSummaryCards(transactions);
  renderDebtContainers(transactions);
  renderCategoryAnalytics(transactions);
  renderMonthlyBreakdown(transactions);
}

/**
 * 1. Calculate & Render Top Summary Cards
 */
function updateSummaryCards(transactions) {
  let totalIncome = 0;
  let totalExpense = 0;
  let totalBorrowedPending = 0;
  let totalLentPending = 0;

  transactions.forEach(t => {
    const amt = Number(t.amount) || 0;
    if (t.type === 'income') {
      totalIncome += amt;
      if (t.category === 'Borrowed Money' && !t.isSettled) {
        totalBorrowedPending += amt;
      }
    } else if (t.type === 'expense') {
      totalExpense += amt;
      if (t.category === 'Money Given to Others' && !t.isSettled) {
        totalLentPending += amt;
      }
    }
  });

  const balance = totalIncome - totalExpense;

  const balanceEl = document.getElementById('stat-balance');
  const incomeEl = document.getElementById('stat-income');
  const expenseEl = document.getElementById('stat-expense');
  const borrowedStatEl = document.getElementById('stat-borrowed-pending');
  const lentStatEl = document.getElementById('stat-lent-pending');

  if (balanceEl) {
    balanceEl.textContent = UI.formatINR(balance);
    balanceEl.style.color = balance >= 0 ? 'var(--income)' : 'var(--expense)';
  }
  if (incomeEl) incomeEl.textContent = UI.formatINR(totalIncome);
  if (expenseEl) expenseEl.textContent = UI.formatINR(totalExpense);
  if (borrowedStatEl) borrowedStatEl.textContent = UI.formatINR(totalBorrowedPending);
  if (lentStatEl) lentStatEl.textContent = UI.formatINR(totalLentPending);
}

/**
 * 2. Render Dedicated Borrowed & Lent Money Containers
 */
function renderDebtContainers(transactions) {
  const borrowedListEl = document.getElementById('borrowed-list');
  const lentListEl = document.getElementById('lent-list');
  const borrowedBadgeTotalEl = document.getElementById('borrowed-total-badge');
  const lentBadgeTotalEl = document.getElementById('lent-total-badge');

  // Filter items
  const borrowedItems = transactions.filter(t => t.category === 'Borrowed Money');
  const lentItems = transactions.filter(t => t.category === 'Money Given to Others');

  // Totals for active debts
  const borrowedActiveTotal = borrowedItems
    .filter(t => !t.isSettled)
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const lentActiveTotal = lentItems
    .filter(t => !t.isSettled)
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  if (borrowedBadgeTotalEl) borrowedBadgeTotalEl.textContent = UI.formatINR(borrowedActiveTotal);
  if (lentBadgeTotalEl) lentBadgeTotalEl.textContent = UI.formatINR(lentActiveTotal);

  // Render Borrowed (Money to Repay)
  if (borrowedListEl) {
    if (borrowedItems.length === 0) {
      borrowedListEl.innerHTML = `
        <div class="debt-empty">
          <i class="ph ph-hand-coins"></i>
          <p>No borrowed money logged yet.</p>
        </div>
      `;
    } else {
      borrowedListEl.innerHTML = borrowedItems.map(item => createDebtItemHTML(item, 'borrowed')).join('');
    }
  }

  // Render Lent (Money to Receive)
  if (lentListEl) {
    if (lentItems.length === 0) {
      lentListEl.innerHTML = `
        <div class="debt-empty">
          <i class="ph ph-hand-heart"></i>
          <p>No money given to others logged yet.</p>
        </div>
      `;
    } else {
      lentListEl.innerHTML = lentItems.map(item => createDebtItemHTML(item, 'lent')).join('');
    }
  }

  // Attach toggle listeners for Settle / Unsettle
  document.querySelectorAll('.btn-toggle-settle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const updated = Storage.toggleSettled(id);
      if (updated) {
        UI.showToast(
          updated.isSettled ? 'Marked as settled!' : 'Marked as pending!',
          updated.isSettled ? 'success' : 'info'
        );
        initDashboard();
      }
    });
  });
}

function createDebtItemHTML(item, type) {
  const isSettled = !!item.isSettled;
  const person = UI.escapeHTML(item.personName || 'Unnamed contact');
  const desc = UI.escapeHTML(item.description || (type === 'borrowed' ? 'Borrowed money' : 'Money given'));
  const amount = UI.formatINR(item.amount);
  const badgeHTML = UI.getDueBadgeHTML(item.dueDate, isSettled);

  return `
    <div class="debt-item ${type}-type ${isSettled ? 'is-settled' : ''}">
      <div class="debt-item-left">
        <div class="debt-item-person">
          <i class="ph ph-user-circle"></i>
          ${person}
        </div>
        <div class="debt-item-meta">
          <span>${desc}</span>
          ${item.dueDate ? `<span>&bull; Due: ${UI.formatDate(item.dueDate)}</span>` : ''}
          ${badgeHTML}
        </div>
      </div>
      <div class="debt-item-right">
        <div class="debt-item-amount">${amount}</div>
        <button class="btn btn-sm ${isSettled ? 'btn-secondary' : 'btn-primary'} btn-toggle-settle" 
                data-id="${item.id}"
                title="${isSettled ? 'Reopen debt' : 'Mark as settled'}">
          <i class="ph ${isSettled ? 'ph-arrow-counter-clockwise' : 'ph-check'}"></i>
          ${isSettled ? 'Reopen' : 'Mark Settled'}
        </button>
      </div>
    </div>
  `;
}

/**
 * 3. Render Category Expense Chart & Legend
 */
function renderCategoryAnalytics(transactions) {
  // Aggregate expenses by category
  const expenseMap = {};
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      const cat = t.category || 'Other';
      expenseMap[cat] = (expenseMap[cat] || 0) + Number(t.amount || 0);
    });

  const categoryData = Object.keys(expenseMap)
    .map(category => ({
      category,
      amount: expenseMap[category]
    }))
    .sort((a, b) => b.amount - a.amount);

  Charts.renderDonutChart('expense-category-chart', categoryData);
  Charts.renderLegend('category-legend-container', categoryData);
}

/**
 * 4. Render Monthly Expense Summary
 */
function renderMonthlyBreakdown(transactions) {
  const listEl = document.getElementById('monthly-breakdown-list');
  if (!listEl) return;

  const monthlyMap = {};

  transactions.forEach(t => {
    if (!t.date) return;
    const parts = t.date.split('-');
    if (parts.length < 2) return;
    const key = `${parts[0]}-${parts[1]}`; // YYYY-MM

    if (!monthlyMap[key]) {
      monthlyMap[key] = { income: 0, expense: 0, year: parts[0], month: parts[1] };
    }

    const amt = Number(t.amount || 0);
    if (t.type === 'income') {
      monthlyMap[key].income += amt;
    } else if (t.type === 'expense') {
      monthlyMap[key].expense += amt;
    }
  });

  const sortedMonths = Object.keys(monthlyMap).sort().reverse().slice(0, 5); // Last 5 recorded months

  if (sortedMonths.length === 0) {
    listEl.innerHTML = `<div style="text-align:center; padding: 1.5rem; color: var(--text-muted); font-size: 0.85rem;">No monthly data available yet.</div>`;
    return;
  }

  listEl.innerHTML = sortedMonths.map(key => {
    const data = monthlyMap[key];
    const dateObj = new Date(Number(data.year), Number(data.month) - 1, 1);
    const monthName = dateObj.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const netSavings = data.income - data.expense;

    return `
      <div class="monthly-item">
        <div class="monthly-month-name">
          <i class="ph ph-calendar-blank" style="color: var(--primary); margin-right: 4px;"></i>
          ${monthName}
        </div>
        <div class="monthly-stats">
          <div class="monthly-stat-box">
            <div class="monthly-stat-label">Income</div>
            <div class="monthly-stat-value" style="color: var(--income);">${UI.formatINR(data.income)}</div>
          </div>
          <div class="monthly-stat-box">
            <div class="monthly-stat-label">Expense</div>
            <div class="monthly-stat-value" style="color: var(--expense);">${UI.formatINR(data.expense)}</div>
          </div>
          <div class="monthly-stat-box">
            <div class="monthly-stat-label">Net</div>
            <div class="monthly-stat-value" style="color: ${netSavings >= 0 ? 'var(--income)' : 'var(--expense)'};">
              ${UI.formatINR(netSavings)}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}
