/* Dashboard page */
(() => {
  'use strict';
  const A = App;
  const $ = (id) => document.getElementById(id);
  let summaryMonth = A.monthKey(A.todayISO());

  function txRow(t) {
    const tr = A.el('tr');
    const cell = A.el('td');
    const wrap = A.el('div', 'tx-cell');
    const text = A.el('div', 'tx-text');
    text.append(A.el('span', 'tx-title', t.category));
    if (t.description) text.append(A.el('span', 'tx-desc', t.description));
    wrap.append(A.categoryBadge(t), text);
    cell.append(wrap);
    const date = A.el('td', 'muted', A.formatDate(t.date));
    date.dataset.label = 'Date';
    const st = A.el('td');
    st.dataset.label = 'Status';
    st.append(A.statusPill(t));
    const amt = A.el('td', `num amount ${t.type}`, A.signedAmount(t));
    tr.append(cell, date, st, amt);
    return tr;
  }

  function renderTop() {
    const t = A.totals(A.all());
    const bal = t.income - t.expense;
    $('balance').textContent = A.fmt(bal);
    $('heroSub').textContent = `${A.plural(A.all().length, 'transaction')} recorded`;
    $('totalIncome').textContent = A.fmt(t.income);
    $('totalExpense').textContent = A.fmt(t.expense);
    const owe = A.outstandingDebts();
    const owed = A.outstandingLent();
    $('toPay').textContent = A.fmt(A.sum(owe));
    $('toReceive').textContent = A.fmt(A.sum(owed));
    $('toPayLabel').textContent = `To Pay (${owe.length})`;
    $('toReceiveLabel').textContent = `To Receive (${owed.length})`;
  }

  function renderLoans() {
    const loans = [...A.outstandingDebts(), ...A.outstandingLent()]
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    $('loanEmpty').hidden = loans.length > 0;
    $('loanList').replaceChildren(...loans.map((t) => {
      const lent = A.isLent(t);
      const st = A.debtStatus(t);
      const li = A.el('li', `loan-item ${st.kind}`);
      const badge = A.el('span', `cat-badge ${lent ? 'income' : 'expense'}`, lent ? 'GET' : 'PAY');
      const info = A.el('div', 'loan-info');
      info.append(
        A.el('span', 'tx-title', t.lender),
        A.el('span', 'tx-desc', `${lent ? 'Owes you' : 'You owe'} - due ${A.formatDate(t.dueDate)}`),
      );
      const right = A.el('div', 'loan-right');
      right.append(A.el('span', `amount ${lent ? 'income' : 'expense'}`, A.fmt(t.amount)), A.el('span', `pill pill-${st.kind}`, st.label));
      const btn = A.el('button', 'btn btn-ghost btn-sm', lent ? 'Mark received' : 'Mark repaid');
      btn.type = 'button';
      btn.addEventListener('click', () => A.repay(t.id));
      li.append(badge, info, right, btn);
      return li;
    }));
  }

  function renderRecent() {
    const recent = A.sortTx(A.all()).slice(0, 5);
    $('recentEmpty').hidden = recent.length > 0;
    $('recentBody').closest('table').hidden = recent.length === 0;
    $('recentBody').replaceChildren(...recent.map(txRow));
  }

  function lastNMonths(key, n) {
    const [y, m] = key.split('-').map(Number);
    const out = [];
    for (let i = n - 1; i >= 0; i -= 1) out.push(A.monthKey(A.toISO(new Date(y, m - 1 - i, 1))));
    return out;
  }

  function renderInsights() {
    const monthTx = A.all().filter((t) => A.monthKey(t.date) === summaryMonth);
    const t = A.totals(monthTx);
    const net = t.income - t.expense;
    $('sumIncome').textContent = A.fmt(t.income);
    $('sumExpense').textContent = A.fmt(t.expense);
    $('sumNet').textContent = A.fmt(net);
    $('sumNet').className = `mini ${net < 0 ? 'expense' : net > 0 ? 'income' : ''}`;
    const breakdown = A.categoryBreakdown(monthTx);
    $('sumTop').textContent = breakdown[0] ? breakdown[0].category : '-';
    $('categoryMonthLabel').textContent = A.formatMonth(summaryMonth, true);

    Charts.renderCategoryChart($('categoryChart'), $('categoryEmpty'), breakdown, A.fmt);
    $('categoryBreakdown').replaceChildren(...breakdown.map((b, i) => {
      const pct = t.expense ? (b.amount / t.expense) * 100 : 0;
      const li = A.el('li', 'breakdown-item');
      const row = A.el('div', 'breakdown-row');
      const name = A.el('span', 'breakdown-name');
      const dot = A.el('span', 'dot');
      dot.style.background = Charts.colorFor(i);
      name.append(dot, document.createTextNode(b.category));
      row.append(name, A.el('span', 'muted', `${A.fmt(b.amount)} - ${pct.toFixed(1)}%`));
      const bar = A.el('div', 'bar');
      const fill = A.el('div', 'bar-fill');
      fill.style.width = `${pct}%`;
      fill.style.background = Charts.colorFor(i);
      bar.append(fill);
      li.append(row, bar);
      return li;
    }));

    const data = lastNMonths(summaryMonth, 6).map((m) => {
      const mt = A.totals(A.all().filter((x) => A.monthKey(x.date) === m));
      return { label: A.formatMonth(m), income: mt.income, expense: mt.expense };
    });
    Charts.renderMonthlyChart($('monthlyChart'), $('monthlyEmpty'), data, A.fmt);
  }

  function render() { renderTop(); renderLoans(); renderRecent(); renderInsights(); }

  A.mountLayout('dashboard', { title: 'Dashboard', subtitle: 'Overview of your money' });
  $('summaryMonth').value = summaryMonth;
  $('summaryMonth').addEventListener('change', (e) => {
    summaryMonth = e.target.value || A.monthKey(A.todayISO());
    e.target.value = summaryMonth;
    renderInsights();
  });
  A.onChange(render);
  render();
})();
