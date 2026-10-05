/* Shared core: config, helpers, data access, layout, banner, modal, toast, theme */
const App = (() => {
  'use strict';

  /* ---------- Config ---------- */
  const BORROWED = 'Borrowed Money';        // income  - I owe someone
  const LENT = 'Money Given to Others';     // expense - someone owes me
  const RECEIVED_BACK = 'Money Received Back';
  const CATEGORIES = {
    income: ['Salary', 'Freelance', 'Investment', 'Gift', BORROWED, RECEIVED_BACK, 'Other'],
    expense: [
      'Food', 'Transport', 'Shopping', 'Bills', 'Rent', 'EMI', 'Loan Payment',
      LENT, 'Health', 'Education', 'Entertainment', 'Other',
    ],
  };
  const DUE_SOON_DAYS = 3;
  const BANNER_DISMISS_KEY = 'expenseTracker.bannerDismissed';
  const FLASH_KEY = 'expenseTracker.flash';

  const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });
  const fmt = (n) => currency.format(n);

  /* ---------- Date helpers ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const todayISO = () => toISO(new Date());
  const addDays = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d); };
  const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);
  const formatDate = (iso) => parseISO(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const monthKey = (iso) => iso.slice(0, 7);
  const formatMonth = (key, long = false) => {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: long ? 'long' : 'short', year: 'numeric' });
  };
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const genId = () => (window.crypto && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2));

  /* ---------- Data ---------- */
  let transactions = Storage.loadTransactions();
  const listeners = [];
  const onChange = (fn) => listeners.push(fn);
  function notify() { renderBanner(); listeners.forEach((fn) => fn()); }

  const all = () => transactions;
  const find = (id) => transactions.find((t) => t.id === id);
  function persist() {
    if (!Storage.saveTransactions(transactions)) toast('Could not save to Local Storage.', 'error');
  }
  function add(tx) { transactions.push({ ...tx, id: genId(), createdAt: Date.now() }); persist(); }
  function update(id, tx) {
    const i = transactions.findIndex((t) => t.id === id);
    if (i === -1) return false;
    transactions[i] = { ...tx, id, createdAt: transactions[i].createdAt };
    persist();
    return true;
  }
  function remove(id) { transactions = transactions.filter((t) => t.id !== id); persist(); }

  /* ---------- Domain ---------- */
  const isBorrowed = (t) => t.type === 'income' && t.category === BORROWED && !!t.dueDate;
  const isLent = (t) => t.type === 'expense' && t.category === LENT && !!t.dueDate;
  const isLoan = (t) => isBorrowed(t) || isLent(t);
  const isLoanSelection = (type, cat) => (type === 'income' && cat === BORROWED) || (type === 'expense' && cat === LENT);

  function debtStatus(t) {
    if (!isLoan(t)) return null;
    if (t.repaid) return { kind: 'repaid', label: isLent(t) ? 'Received' : 'Repaid' };
    const left = daysBetween(todayISO(), t.dueDate);
    if (left < 0) return { kind: 'overdue', left, label: `Overdue ${plural(-left, 'day')}` };
    if (left === 0) return { kind: 'due-soon', left, label: 'Due today' };
    if (left <= DUE_SOON_DAYS) return { kind: 'due-soon', left, label: `Due in ${plural(left, 'day')}` };
    return { kind: 'pending', left, label: `Due in ${plural(left, 'day')}` };
  }

  const outstanding = (pred) => transactions.filter((t) => pred(t) && !t.repaid)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const outstandingDebts = () => outstanding(isBorrowed);
  const outstandingLent = () => outstanding(isLent);
  const sum = (list) => list.reduce((s, t) => s + t.amount, 0);

  function totals(list) {
    return list.reduce((a, t) => { a[t.type] += t.amount; a[`${t.type}Count`] += 1; return a; },
      { income: 0, expense: 0, incomeCount: 0, expenseCount: 0 });
  }
  function categoryBreakdown(list) {
    const map = new Map();
    list.filter((t) => t.type === 'expense').forEach((t) => map.set(t.category, (map.get(t.category) || 0) + t.amount));
    return [...map.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
  }
  const sortTx = (list) => [...list].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));

  /* ---------- DOM helpers ---------- */
  function el(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function initials(cat) {
    const words = cat.split(/\s+/).filter((w) => !/^(to|of|and)$/i.test(w));
    return (words.length > 1 ? words[0][0] + words[1][0] : cat.slice(0, 2)).toUpperCase();
  }
  function categoryBadge(t) {
    return el('span', `cat-badge ${t.type}`, initials(t.category));
  }
  function statusPill(t) {
    const st = debtStatus(t);
    if (st) return el('span', `pill pill-${st.kind}`, st.label);
    return el('span', `pill pill-${t.type}`, t.type === 'income' ? 'Income' : 'Expense');
  }
  const signedAmount = (t) => `${t.type === 'income' ? '+' : '-'}${fmt(t.amount)}`;

  /* ---------- Toast & flash ---------- */
  function toast(message, type = 'success') {
    let box = document.getElementById('toasts');
    if (!box) { box = el('div', 'toasts'); box.id = 'toasts'; document.body.append(box); }
    const t = el('div', `toast toast-${type}`, message);
    box.append(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
  }
  function flash(message) { try { sessionStorage.setItem(FLASH_KEY, message); } catch { /* ignore */ } }
  function showFlash() {
    try {
      const m = sessionStorage.getItem(FLASH_KEY);
      if (m) { sessionStorage.removeItem(FLASH_KEY); toast(m); }
    } catch { /* ignore */ }
  }

  /* ---------- Modal ---------- */
  let modal; let modalResolve = null; let lastFocused = null;
  function buildModal() {
    modal = el('div', 'modal');
    modal.hidden = true;
    modal.innerHTML = '<div class="modal-backdrop" data-close></div>'
      + '<div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modalTitle">'
      + '<h3 id="modalTitle"></h3><p id="modalMessage"></p><div class="modal-actions" id="modalActions"></div></div>';
    document.body.append(modal);
    modal.addEventListener('click', (e) => { if (e.target.hasAttribute('data-close')) closeModal(null); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(null); });
  }
  function showModal({ title, message, actions }) {
    lastFocused = document.activeElement;
    modal.querySelector('#modalTitle').textContent = title;
    modal.querySelector('#modalMessage').textContent = message;
    const box = modal.querySelector('#modalActions');
    box.replaceChildren(...actions.map((a) => {
      const b = el('button', `btn btn-${a.variant || 'secondary'}`, a.label);
      b.type = 'button';
      b.addEventListener('click', () => closeModal(a.value));
      return b;
    }));
    modal.hidden = false;
    box.lastElementChild.focus();
    return new Promise((r) => { modalResolve = r; });
  }
  function closeModal(v) {
    modal.hidden = true;
    if (modalResolve) { modalResolve(v); modalResolve = null; }
    if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
  }

  /* ---------- Shared actions ---------- */
  async function confirmDelete(id) {
    const t = find(id);
    if (!t) return false;
    const ok = await showModal({
      title: 'Delete transaction?',
      message: `"${t.description || t.category}" (${fmt(t.amount)}) will be permanently removed.`,
      actions: [{ label: 'Cancel', value: false, variant: 'ghost' }, { label: 'Delete', value: true, variant: 'danger' }],
    });
    if (!ok) return false;
    remove(id);
    toast('Transaction deleted.');
    notify();
    return true;
  }

  async function repay(id) {
    const t = find(id);
    if (!t || !isLoan(t) || t.repaid) return false;
    const lent = isLent(t);
    const confirmed = await showModal(lent ? {
      title: `Mark money received from ${t.lender}?`,
      message: `Confirm receiving ${fmt(t.amount)} back from ${t.lender}. This will record ${fmt(t.amount)} as "${RECEIVED_BACK}" income today and increase your balance.`,
      actions: [
        { label: 'Cancel', value: false, variant: 'ghost' },
        { label: 'Confirm & Add Income', value: true, variant: 'primary' },
      ],
    } : {
      title: `Mark debt repaid to ${t.lender}?`,
      message: `Confirm paying ${fmt(t.amount)} to ${t.lender}. This will record ${fmt(t.amount)} as a "Loan Payment" expense today and deduct it from your balance.`,
      actions: [
        { label: 'Cancel', value: false, variant: 'ghost' },
        { label: 'Confirm & Deduct Expense', value: true, variant: 'primary' },
      ],
    });
    if (!confirmed) return false;

    t.repaid = true;
    t.repaidOn = todayISO();
    transactions.push(lent
      ? { id: genId(), type: 'income', amount: t.amount, category: RECEIVED_BACK, date: todayISO(),
        description: `Received back from ${t.lender}`.slice(0, 60), createdAt: Date.now() }
      : { id: genId(), type: 'expense', amount: t.amount, category: 'Loan Payment', date: todayISO(),
        description: `Repaid ${t.lender}`.slice(0, 60), createdAt: Date.now() });

    persist();
    toast(lent ? `Marked as received from ${t.lender} and added to balance.` : `Marked as repaid to ${t.lender} and deducted from balance.`);
    notify();
    return true;
  }

  /* ---------- Banner ---------- */
  let banner;
  function bannerSignature(list) { return `${todayISO()}|${list.map((t) => t.id).join(',')}`; }
  function renderBanner() {
    if (!banner) return;
    const isUrgent = (t) => ['overdue', 'due-soon'].includes(debtStatus(t).kind);
    const pay = outstandingDebts().filter(isUrgent);
    const collect = outstandingLent().filter(isUrgent);
    const urgent = [...pay, ...collect];
    let dismissed = null;
    try { dismissed = sessionStorage.getItem(BANNER_DISMISS_KEY); } catch { /* ignore */ }
    if (!urgent.length || dismissed === bannerSignature(urgent)) { banner.hidden = true; return; }

    banner.hidden = false;
    banner.classList.toggle('overdue', urgent.some((t) => debtStatus(t).kind === 'overdue'));
    const titles = [];
    if (pay.length) titles.push(`Money to be paid: ${fmt(sum(pay))}`);
    if (collect.length) titles.push(`Money to receive: ${fmt(sum(collect))}`);
    banner.querySelector('.banner-title').textContent = titles.join('   |   ');
    banner.querySelector('.banner-list').replaceChildren(...urgent.map((t) => {
      const st = debtStatus(t);
      const li = el('li');
      li.append(
        el('span', null, isLent(t) ? `Collect ${fmt(t.amount)} from ${t.lender} - ` : `Pay ${fmt(t.amount)} to ${t.lender} - `),
        el('strong', null, st.label),
        el('span', null, ` (${formatDate(t.dueDate)}) `),
      );
      const b = el('button', 'link-btn', isLent(t) ? 'Mark received' : 'Mark repaid');
      b.type = 'button';
      b.addEventListener('click', () => repay(t.id));
      li.append(b);
      return li;
    }));
    banner.dataset.signature = bannerSignature(urgent);
  }

  /* ---------- Theme ---------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('[data-theme-toggle]').forEach((b) => {
      b.textContent = theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    });
  }
  function toggleTheme() {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    Storage.saveTheme(next);
    listeners.forEach((fn) => fn({ theme: true }));
  }

  /* ---------- Layout ---------- */
  const NAV = [
    { id: 'dashboard', label: 'Dashboard', href: 'index.html' },
    { id: 'add', label: 'Add Transaction', href: 'add.html' },
    { id: 'transactions', label: 'Transactions', href: 'transactions.html' },
  ];

  function mountLayout(active, { title, subtitle } = {}) {
    // Wire theme buttons
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.onclick = toggleTheme;
    });

    // Banner
    banner = document.getElementById('debtBanner');
    banner.className = 'debt-banner';
    banner.setAttribute('role', 'alert');
    banner.innerHTML = '<div class="banner-body"><strong class="banner-title"></strong><ul class="banner-list"></ul></div>';
    const close = el('button', 'btn btn-ghost btn-sm', 'Dismiss');
    close.type = 'button';
    close.addEventListener('click', () => {
      try { sessionStorage.setItem(BANNER_DISMISS_KEY, banner.dataset.signature || ''); } catch { /* ignore */ }
      banner.hidden = true;
    });
    banner.append(close);

    buildModal();
    applyTheme(document.documentElement.getAttribute('data-theme') || 'light');
    renderBanner();
    showFlash();

    window.addEventListener('storage', (e) => {
      if (e.key === 'expenseTracker.transactions') { transactions = Storage.loadTransactions(); notify(); }
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) notify(); });
  }

  return {
    BORROWED, LENT, RECEIVED_BACK, CATEGORIES,
    fmt, toISO, parseISO, todayISO, addDays, daysBetween, formatDate, monthKey, formatMonth, plural,
    all, find, add, update, remove, onChange, notify,
    isBorrowed, isLent, isLoan, isLoanSelection, debtStatus, outstandingDebts, outstandingLent, sum,
    totals, categoryBreakdown, sortTx,
    el, categoryBadge, statusPill, signedAmount,
    toast, flash, showModal, confirmDelete, repay, mountLayout,
  };
})();
