/* Add / Edit transaction page */
(() => {
  'use strict';
  const A = App;
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const editId = params.get('id');
  const editing = editId ? A.find(editId) : null;

  const form = $('txForm');
  const els = {
    amount: $('amount'), category: $('category'), date: $('date'), description: $('description'),
    debtFields: $('debtFields'), lender: $('lender'), repayDays: $('repayDays'), repayChips: $('repayChips'),
    duePreview: $('duePreview'), repaid: $('repaid'),
  };
  const getType = () => form.elements.type.value;
  const isLentSelected = () => getType() === 'expense' && els.category.value === A.LENT;

  function populateCategories(type, selected = '') {
    els.category.innerHTML = '';
    const ph = new Option('Select a category', '');
    ph.disabled = true;
    ph.selected = !selected;
    els.category.add(ph);
    A.CATEGORIES[type].forEach((c) => {
      const o = new Option(c, c);
      if (c === selected) o.selected = true;
      els.category.add(o);
    });
  }

  function updateDynamic() {
    $('descriptionLabel').textContent = getType() === 'income' ? 'Description (optional)' : 'Description *';
    const show = A.isLoanSelection(getType(), els.category.value);
    els.debtFields.hidden = !show;
    if (!show) return;
    const lent = isLentSelected();
    $('debtLegend').textContent = lent ? 'Money given details' : 'Borrowed money details';
    $('lenderLabel').textContent = lent ? 'Given to *' : 'Borrowed from *';
    $('repayDaysLabel').textContent = lent ? 'They will pay back within (days) *' : 'Pay back within (days) *';
    $('repaidLabel').textContent = lent ? 'Already received back' : 'Already repaid';
    updateDuePreview();
  }

  function updateDuePreview() {
    const days = Number(els.repayDays.value);
    els.repayChips.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', Number(c.dataset.days) === days));
    const lent = isLentSelected();
    if (Number.isInteger(days) && days > 0 && days <= 3650 && els.date.value) {
      const due = A.addDays(els.date.value, days);
      const left = A.daysBetween(A.todayISO(), due);
      const rel = left > 0 ? `in ${A.plural(left, 'day')}` : left === 0 ? 'today' : `${A.plural(-left, 'day')} ago`;
      els.duePreview.textContent = `${lent ? 'Expect it back by' : 'Pay back by'} ${A.formatDate(due)} (${rel})`;
    } else {
      els.duePreview.textContent = lent ? 'Choose how many days they have to pay you back.' : 'Choose how many days you have to pay it back.';
    }
  }

  function clearFieldError(id) {
    const input = $(id); const err = $(`${id}Error`);
    if (err) err.textContent = '';
    if (input) { input.classList.remove('is-invalid'); input.removeAttribute('aria-invalid'); }
  }
  function clearErrors() {
    form.querySelectorAll('.error').forEach((e) => { e.textContent = ''; });
    form.querySelectorAll('.is-invalid').forEach((e) => { e.classList.remove('is-invalid'); e.removeAttribute('aria-invalid'); });
  }
  function showErrors(errors) {
    let first = null;
    Object.entries(errors).forEach(([f, msg]) => {
      const input = $(f); const err = $(`${f}Error`);
      if (err) err.textContent = msg;
      if (input) { input.classList.add('is-invalid'); input.setAttribute('aria-invalid', 'true'); first = first || input; }
    });
    if (first) first.focus();
  }

  function resetForm() {
    const type = getType();
    form.reset();
    form.elements.type.value = type;
    populateCategories(type);
    els.date.value = A.todayISO();
    clearErrors();
    updateDynamic();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();
    const data = {
      type: getType(), amount: els.amount.value, category: els.category.value, date: els.date.value,
      description: els.description.value, lender: els.lender.value, repayDays: els.repayDays.value,
    };
    const { valid, errors } = Validation.validateTransaction(data, {
      categories: A.CATEGORIES, today: A.todayISO(), borrowedCategory: A.BORROWED, lentCategory: A.LENT,
    });
    if (!valid) { showErrors(errors); A.toast('Please fix the highlighted fields.', 'error'); return; }

    const tx = {
      type: data.type,
      amount: Math.round(Number(data.amount.trim().replace(/,/g, '')) * 100) / 100,
      category: data.category,
      date: data.date,
      description: data.description.trim(),
    };
    if (A.isLoanSelection(tx.type, tx.category)) {
      tx.lender = data.lender.trim();
      tx.repayDays = Number(data.repayDays);
      tx.dueDate = A.addDays(tx.date, tx.repayDays);
      tx.repaid = els.repaid.checked;
      if (tx.repaid) tx.repaidOn = editing && editing.repaid && editing.repaidOn ? editing.repaidOn : A.todayISO();
    }

    if (editing) {
      if (!A.update(editId, tx)) { A.toast('That transaction no longer exists.', 'error'); return; }
      A.flash('Transaction updated.');
      location.href = 'transactions.html';
      return;
    }
    A.add(tx);
    let msg = `${tx.type === 'income' ? 'Income' : 'Expense'} of ${A.fmt(tx.amount)} added.`;
    if (tx.lender && tx.type === 'income') msg = `Borrowed money added. Pay back by ${A.formatDate(tx.dueDate)}.`;
    if (tx.lender && tx.type === 'expense') msg = `Money given added. ${tx.lender} should pay back by ${A.formatDate(tx.dueDate)}.`;
    A.toast(msg);
    A.notify();
    resetForm();
    els.amount.focus();
  });

  form.addEventListener('change', (e) => {
    if (e.target.name === 'type') { populateCategories(getType()); clearFieldError('category'); clearFieldError('description'); }
    updateDynamic();
  });
  form.addEventListener('input', (e) => {
    if (e.target.id) clearFieldError(e.target.id);
    if (e.target === els.repayDays || e.target === els.date) updateDuePreview();
  });
  els.repayChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    els.repayDays.value = chip.dataset.days;
    clearFieldError('repayDays');
    updateDuePreview();
  });

  /* Init */
  A.mountLayout('add', editing
    ? { title: 'Edit Transaction', subtitle: 'Update the details below' }
    : { title: 'Add Transaction', subtitle: 'Record income or an expense' });
  els.date.max = A.todayISO();

  if (editId && !editing) A.toast('Transaction not found. Creating a new one instead.', 'error');

  if (editing) {
    $('formTitle').textContent = 'Edit Transaction';
    $('submitBtn').textContent = 'Update Transaction';
    form.elements.type.value = editing.type;
    populateCategories(editing.type, editing.category);
    els.amount.value = editing.amount;
    els.date.value = editing.date;
    els.description.value = editing.description || '';
    els.lender.value = editing.lender || '';
    els.repayDays.value = editing.repayDays || '';
    els.repaid.checked = !!editing.repaid;
  } else {
    const type = params.get('type') === 'income' ? 'income' : 'expense';
    form.elements.type.value = type;
    $('formTitle').textContent = 'New Transaction';
    $('cancelBtn').href = 'index.html';
    populateCategories(type);
    els.date.value = A.todayISO();
  }
  updateDynamic();
})();
