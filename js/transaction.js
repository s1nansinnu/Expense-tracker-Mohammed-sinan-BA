/* Transactions list page */
(() => {
  'use strict';
  const A = App;
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const filters = {
    type: ['income', 'expense'].includes(params.get('type')) ? params.get('type') : 'all',
    category: 'all',
    month: '',
    search: params.get('q') || '',
  };

  function populateCategories() {
    const sel = $('filterCategory');
    const current = filters.category;
    sel.innerHTML = '';
    sel.add(new Option('All categories', 'all'));
    const group = (label, list) => {
      const g = document.createElement('optgroup');
      g.label = label;
      list.forEach((c) => g.append(new Option(c, c)));
      sel.append(g);
    };
    let valid;
    if (filters.type === 'all') {
      group('Income', A.CATEGORIES.income);
      group('Expense', A.CATEGORIES.expense);
      valid = [...A.CATEGORIES.income, ...A.CATEGORIES.expense];
    } else {
      A.CATEGORIES[filters.type].forEach((c) => sel.add(new Option(c, c)));
      valid = A.CATEGORIES[filters.type];
    }
    filters.category = valid.includes(current) ? current : 'all';
    sel.value = filters.category;
  }

  function getFiltered() {
    const q = filters.search.trim().toLowerCase();
    return A.sortTx(A.all().filter((t) => {
      if (filters.type !== 'all' && t.type !== filters.type) return false;
      if (filters.category !== 'all' && t.category !== filters.category) return false;
      if (filters.month && A.monthKey(t.date) !== filters.month) return false;
      if (q && !`${t.description || ''} ${t.category} ${t.lender || ''}`.toLowerCase().includes(q)) return false;
      return true;
    }));
  }

  function actionBtn(label, cls, onClick) {
    const b = A.el('button', `btn btn-sm ${cls}`, label);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  }

  function row(t) {
    const tr = A.el('tr');
    const cell = A.el('td');
    const wrap = A.el('div', 'tx-cell');
    const text = A.el('div', 'tx-text');
    text.append(A.el('span', 'tx-title', t.category));
    if (t.description) text.append(A.el('span', 'tx-desc', t.description));
    if (A.isBorrowed(t)) text.append(A.el('span', 'tx-desc', `From ${t.lender} - pay back by ${A.formatDate(t.dueDate)}`));
    if (A.isLent(t)) text.append(A.el('span', 'tx-desc', `Given to ${t.lender} - expect back by ${A.formatDate(t.dueDate)}`));
    wrap.append(A.categoryBadge(t), text);
    cell.append(wrap);

    const date = A.el('td', 'muted', A.formatDate(t.date));
    date.dataset.label = 'Date';
    const st = A.el('td');
    st.dataset.label = 'Status';
    st.append(A.statusPill(t));
    const amt = A.el('td', `num amount ${t.type}`, A.signedAmount(t));
    amt.dataset.label = 'Amount';

    const actions = A.el('td', 'num');
    const box = A.el('div', 'row-actions');
    const status = A.debtStatus(t);
    if (status && status.kind !== 'repaid') {
      box.append(actionBtn(A.isLent(t) ? 'Received' : 'Repaid', 'btn-success', () => A.repay(t.id)));
    }
    const edit = A.el('a', 'btn btn-sm btn-ghost', 'Edit');
    edit.href = `add.html?id=${encodeURIComponent(t.id)}`;
    box.append(edit, actionBtn('Delete', 'btn-danger-ghost', () => A.confirmDelete(t.id)));
    actions.append(box);

    tr.append(cell, date, st, amt, actions);
    return tr;
  }

  function render() {
    const list = getFiltered();
    const total = A.all().length;
    $('txBody').replaceChildren(...list.map(row));
    $('txBody').closest('table').hidden = list.length === 0;
    const empty = $('emptyState');
    empty.hidden = list.length > 0;
    empty.textContent = total ? 'No transactions match your filters.' : 'No transactions yet. Use "Add Transaction" to create one.';
    $('listCount').textContent = total ? `Showing ${list.length} of ${total}` : 'No transactions yet';

    const t = A.totals(list);
    const net = t.income - t.expense;
    $('fIncome').textContent = A.fmt(t.income);
    $('fExpense').textContent = A.fmt(t.expense);
    $('fNet').textContent = A.fmt(net);
    $('fNet').classList.toggle('negative', net < 0);
  }

  A.mountLayout('transactions', { title: 'Transactions', subtitle: 'All your income and expenses' });

  $('filterType').value = filters.type;
  $('filterSearch').value = filters.search;
  populateCategories();

  $('filterType').addEventListener('change', (e) => { filters.type = e.target.value; populateCategories(); render(); });
  $('filterCategory').addEventListener('change', (e) => { filters.category = e.target.value; render(); });
  $('filterMonth').addEventListener('change', (e) => { filters.month = e.target.value; render(); });
  $('filterSearch').addEventListener('input', (e) => { filters.search = e.target.value; render(); });
  $('clearFilters').addEventListener('click', () => {
    Object.assign(filters, { type: 'all', category: 'all', month: '', search: '' });
    $('filterType').value = 'all';
    $('filterMonth').value = '';
    $('filterSearch').value = '';
    populateCategories();
    render();
  });

  A.onChange(render);
  render();
})();
