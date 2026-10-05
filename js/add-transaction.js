/**
 * Add Transaction Controller
 * Handles income/expense form submission, category dropdowns, conditional debt inputs,
 * preset buttons (5 days, 7 days, custom), and input validation.
 */

document.addEventListener('DOMContentLoaded', () => {
  initAddTransactionForm();
});

function initAddTransactionForm() {
  const form = document.getElementById('transaction-form');
  const typeIncomeBtn = document.getElementById('type-income-btn');
  const typeExpenseBtn = document.getElementById('type-expense-btn');
  const categorySelect = document.getElementById('tx-category');
  const dateInput = document.getElementById('tx-date');
  const debtBox = document.getElementById('debt-conditional-box');
  const debtPersonLabel = document.getElementById('debt-person-label');
  const debtPersonInput = document.getElementById('debt-person-name');
  const debtDaysPresetBtns = document.querySelectorAll('.preset-days-btn');
  const customDaysContainer = document.getElementById('custom-days-container');
  const customDaysInput = document.getElementById('custom-days-input');
  const dueDateInput = document.getElementById('tx-due-date');

  let currentType = 'expense'; // default
  let selectedRepayDays = 7;   // default preset

  // 1. Set default date to today (YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];
  if (dateInput) {
    dateInput.value = todayStr;
    dateInput.max = '2099-12-31';
  }

  // Helper: Populate categories based on active type
  function populateCategories(type) {
    const list = CATEGORIES[type] || [];
    categorySelect.innerHTML = '<option value="" disabled selected>Select category...</option>' +
      list.map(c => `<option value="${UI.escapeHTML(c)}">${UI.escapeHTML(c)}</option>`).join('');
  }

  // Helper: Update conditional debt box visibility
  function updateDebtSectionVisibility() {
    const category = categorySelect.value;
    const isBorrowed = category === 'Borrowed Money';
    const isLent = category === 'Money Given to Others';

    if (isBorrowed || isLent) {
      debtBox.style.display = 'block';
      if (isBorrowed) {
        debtBox.classList.remove('expense-mode');
        debtPersonLabel.innerHTML = 'Borrowed From (Lender\'s Name) <span class="required">*</span>';
        debtPersonInput.placeholder = 'e.g., Ramesh, Brother, Boss...';
        document.getElementById('debt-title-text').textContent = 'Repayment Commitment (To Repay)';
        document.getElementById('debt-timeframe-label').textContent = 'Time to repay:';
      } else {
        debtBox.classList.add('expense-mode');
        debtPersonLabel.innerHTML = 'Given To (Borrower\'s Name) <span class="required">*</span>';
        debtPersonInput.placeholder = 'e.g., Priya, Colleague, Friend...';
        document.getElementById('debt-title-text').textContent = 'Promised Return Commitment (To Collect)';
        document.getElementById('debt-timeframe-label').textContent = 'Time they promised to give back:';
      }
      calculateAndSetDueDate();
    } else {
      debtBox.style.display = 'none';
      debtPersonInput.value = '';
    }
  }

  // Calculate calculated due date based on transaction date and chosen days
  function calculateAndSetDueDate() {
    const baseDateStr = dateInput.value || todayStr;
    const parts = baseDateStr.split('-');
    const base = new Date(parts[0], parts[1] - 1, parts[2]);

    base.setDate(base.getDate() + Number(selectedRepayDays));
    const targetDueStr = base.toISOString().split('T')[0];
    if (dueDateInput) {
      dueDateInput.value = targetDueStr;
    }
  }

  // 2. Type toggle clicks
  typeIncomeBtn.addEventListener('click', () => {
    currentType = 'income';
    typeIncomeBtn.classList.add('active');
    typeExpenseBtn.classList.remove('active');
    populateCategories('income');
    updateDebtSectionVisibility();
  });

  typeExpenseBtn.addEventListener('click', () => {
    currentType = 'expense';
    typeExpenseBtn.classList.add('active');
    typeIncomeBtn.classList.remove('active');
    populateCategories('expense');
    updateDebtSectionVisibility();
  });

  // Initial population
  populateCategories('expense');

  // Category change listener
  categorySelect.addEventListener('change', () => {
    updateDebtSectionVisibility();
    validateField(categorySelect, 'category-feedback');
  });

  // Base date change recalculates due date
  dateInput.addEventListener('change', () => {
    calculateAndSetDueDate();
  });

  // Repayment days presets (5 days, 7 days, custom)
  debtDaysPresetBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      debtDaysPresetBtns.forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');

      const daysVal = e.currentTarget.getAttribute('data-days');
      if (daysVal === 'custom') {
        customDaysContainer.style.display = 'block';
        selectedRepayDays = Number(customDaysInput.value) || 10;
      } else {
        customDaysContainer.style.display = 'none';
        selectedRepayDays = Number(daysVal);
      }
      calculateAndSetDueDate();
    });
  });

  if (customDaysInput) {
    customDaysInput.addEventListener('input', () => {
      selectedRepayDays = Math.max(1, Number(customDaysInput.value) || 1);
      calculateAndSetDueDate();
    });
  }

  if (dueDateInput) {
    dueDateInput.addEventListener('change', () => {
      // If user overrides the exact calendar date directly
      const baseDateStr = dateInput.value || todayStr;
      const bParts = baseDateStr.split('-');
      const dParts = dueDateInput.value.split('-');
      const d1 = new Date(bParts[0], bParts[1] - 1, bParts[2]);
      const d2 = new Date(dParts[0], dParts[1] - 1, dParts[2]);
      const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
      selectedRepayDays = Math.max(1, diff);
    });
  }

  // 3. Validation Helpers
  function validateField(inputEl, feedbackId, customRule) {
    const feedbackEl = document.getElementById(feedbackId);
    let isValid = true;
    let message = '';

    if (!inputEl.value || (inputEl.type === 'number' && Number(inputEl.value) <= 0)) {
      isValid = false;
      message = 'This field is required and must be valid.';
    } else if (customRule) {
      const result = customRule(inputEl.value);
      if (result !== true) {
        isValid = false;
        message = result;
      }
    }

    if (!isValid) {
      inputEl.classList.add('is-invalid');
      if (feedbackEl) {
        feedbackEl.textContent = message;
        feedbackEl.classList.add('show');
      }
    } else {
      inputEl.classList.remove('is-invalid');
      if (feedbackEl) {
        feedbackEl.classList.remove('show');
      }
    }
    return isValid;
  }

  // Real-time validations
  document.getElementById('tx-amount').addEventListener('input', (e) => {
    validateField(e.target, 'amount-feedback', (val) => {
      if (Number(val) <= 0) return 'Please enter an amount greater than ₹0';
      return true;
    });
  });

  document.getElementById('tx-description').addEventListener('input', (e) => {
    validateField(e.target, 'desc-feedback', (val) => {
      if (!val.trim()) return 'Please provide a short description.';
      return true;
    });
  });

  // 4. Form Submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const amountInput = document.getElementById('tx-amount');
    const descInput = document.getElementById('tx-description');
    const notesInput = document.getElementById('tx-notes');

    const isAmountValid = validateField(amountInput, 'amount-feedback', (val) => Number(val) > 0 || 'Amount must be greater than ₹0');
    const isCatValid = validateField(categorySelect, 'category-feedback');
    const isDescValid = validateField(descInput, 'desc-feedback', (val) => val.trim().length > 0 || 'Description is required');
    const isDateValid = validateField(dateInput, 'date-feedback');

    const isDebt = categorySelect.value === 'Borrowed Money' || categorySelect.value === 'Money Given to Others';
    let isPersonValid = true;

    if (isDebt) {
      isPersonValid = validateField(debtPersonInput, 'person-feedback', (val) => val.trim().length > 0 || 'Person name is required for borrowing/lending');
    }

    if (!isAmountValid || !isCatValid || !isDescValid || !isDateValid || !isPersonValid) {
      UI.showToast('Please fix the errors marked in the form', 'error');
      return;
    }

    // Build transaction object
    const newTx = {
      type: currentType,
      amount: parseFloat(amountInput.value),
      category: categorySelect.value,
      description: descInput.value.trim(),
      date: dateInput.value,
      notes: notesInput ? notesInput.value.trim() : ''
    };

    if (isDebt) {
      newTx.personName = debtPersonInput.value.trim();
      newTx.repayDays = selectedRepayDays;
      newTx.dueDate = dueDateInput.value;
      newTx.isSettled = false;
    }

    const saved = Storage.addTransaction(newTx);
    if (saved) {
      UI.showToast(`Transaction of ${UI.formatINR(newTx.amount)} saved successfully!`, 'success');

      // Reset form
      form.reset();
      dateInput.value = todayStr;
      customDaysContainer.style.display = 'none';
      debtBox.style.display = 'none';
      populateCategories(currentType);

      // Reset pills
      debtDaysPresetBtns.forEach((b, i) => {
        b.classList.toggle('active', i === 1); // 7 days default
      });
      selectedRepayDays = 7;

      // Ask user or provide option to view in all transactions
      setTimeout(() => {
        const viewAll = confirm('Transaction added! Would you like to view it in All Transactions?');
        if (viewAll) {
          window.location.href = 'transactions.html';
        }
      }, 500);
    } else {
      UI.showToast('Failed to save transaction. Please check storage permissions.', 'error');
    }
  });
}
