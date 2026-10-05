/* Form validation */
const Validation = (() => {
  'use strict';
  const MAX_AMOUNT = 100000000; // ₹10 crore
  const MAX_REPAY_DAYS = 3650;

  /**
   * @param {object} data raw form values (strings)
   * @param {{categories: object, today: string, borrowedCategory: string}} opts
   * @returns {{valid: boolean, errors: Object<string,string>}}
   */
  function validateTransaction(data, opts) {
    const errors = {};
    const { categories, today, borrowedCategory, lentCategory } = opts;

    // Type
    if (data.type !== 'income' && data.type !== 'expense') {
      errors.type = 'Choose Income or Expense.';
    }

    // Amount
    const amountStr = String(data.amount ?? '').trim().replace(/,/g, '');
    const n = Number(amountStr);
    if (!amountStr) {
      errors.amount = 'Please enter an amount.';
    } else if (Number.isNaN(n)) {
      errors.amount = 'Amount must be a number (e.g. 250 or 99.50).';
    } else if (n <= 0) {
      errors.amount = 'Amount must be greater than 0.';
    } else if (!/^\d+(\.\d{1,2})?$/.test(amountStr)) {
      errors.amount = 'Use up to 2 decimal places only.';
    } else if (n > MAX_AMOUNT) {
      errors.amount = 'Amount looks too large. Max is ₹10,00,00,000.';
    }

    // Category
    const list = categories[data.type] || [];
    if (!data.category) {
      errors.category = 'Please select a category.';
    } else if (!list.includes(data.category)) {
      errors.category = 'This category does not match the selected type.';
    }

    // Date
    if (!data.date) {
      errors.date = 'Please pick a date.';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date) || Number.isNaN(new Date(data.date).getTime())) {
      errors.date = 'Please enter a valid date.';
    } else if (data.date > today) {
      errors.date = 'Date cannot be in the future.';
    }

    // Description (required for expenses, optional for income)
    const desc = String(data.description ?? '').trim();
    if (!desc) {
      if (data.type === 'expense') errors.description = 'Please add a short description for this expense.';
    } else if (desc.length < 2) {
      errors.description = 'Description must be at least 2 characters.';
    } else if (desc.length > 60) {
      errors.description = 'Description must be 60 characters or less.';
    }

    // Loan extras (borrowed money or money given to others)
    const isBorrowed = data.type === 'income' && data.category === borrowedCategory;
    const isLent = data.type === 'expense' && data.category === lentCategory;
    if (isBorrowed || isLent) {
      const lender = String(data.lender ?? '').trim();
      if (!lender) errors.lender = isLent ? 'Who did you give the money to?' : 'Who did you borrow from?';
      else if (lender.length < 2) errors.lender = 'Name must be at least 2 characters.';
      else if (lender.length > 40) errors.lender = 'Name must be 40 characters or less.';

      const daysStr = String(data.repayDays ?? '').trim();
      const days = Number(daysStr);
      if (!daysStr) {
        errors.repayDays = isLent
          ? 'Enter how many days they have to pay you back.'
          : 'Enter how many days you have to pay it back.';
      } else if (!Number.isInteger(days)) errors.repayDays = 'Days must be a whole number.';
      else if (days < 1) errors.repayDays = 'Days must be at least 1.';
      else if (days > MAX_REPAY_DAYS) errors.repayDays = `Days cannot exceed ${MAX_REPAY_DAYS}.`;
    }

    return { valid: Object.keys(errors).length === 0, errors };
  }

  return { validateTransaction };
})();
