a/* Local Storage helpers */
const Storage = (() => {
  'use strict';
  const KEY = 'expenseTracker.transactions';
  const THEME_KEY = 'expenseTracker.theme';

  function isValidRecord(t) {
    return (
      t && typeof t === 'object' &&
      typeof t.id === 'string' &&
      (t.type === 'income' || t.type === 'expense') &&
      typeof t.amount === 'number' && Number.isFinite(t.amount) &&
      typeof t.category === 'string' &&
      typeof t.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.date)
    );
  }

  function loadTransactions() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data.filter(isValidRecord) : [];
    } catch (err) {
      console.warn('Could not read saved transactions, starting fresh.', err);
      return [];
    }
  }

  function saveTransactions(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
      return true;
    } catch (err) {
      console.error('Could not save transactions.', err);
      return false;
    }
  }

  function loadTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch { return null; }
  }

  function saveTheme(theme) {
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }

  return { loadTransactions, saveTransactions, loadTheme, saveTheme };
})();
