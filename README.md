# RupeeTrack - Expense Tracker Web Application

A clean, responsive Expense Tracker web application built using standard **HTML5, CSS3, and modern Vanilla JavaScript**. Tailored for Indian Rupee (`₹`) currency with specialized borrowing and lending debt tracking.

---

## 🚀 How to Run the Application

Since this application is built with pure Vanilla HTML, CSS, and JavaScript, **no build tools or npm installation are required**.

### Option 1: Direct File Open (Easiest)
1. Navigate to the project folder (`d:\expense tracker`).
2. Double-click **`index.html`** or right-click and choose **Open with -> Google Chrome / Microsoft Edge / Firefox**.

---

### Option 2: Using VS Code Live Server
1. Open the project folder in **Visual Studio Code**.
2. Install the **Live Server** extension (if not already installed).
3. Right-click on `index.html` and select **"Open with Live Server"**.

---

### Option 3: Local HTTP Server (Python / Node.js)
If you prefer running a local server via terminal:

**Using Python:**
```bash
# In the project directory:
python -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

**Using Node.js (`npx`):**
```bash
npx serve .
```

---

## 📱 Pages Overview

1. **Dashboard (`index.html`)**:
   - Financial overview: Current Balance, Total Income, Total Expenses.
   - **Dedicated Debt Containers**:
     - 🔴 **Borrowed Money (To Repay)**: Shows lender name, amount, due date, countdown badge, and a **Mark Settled** button.
     - 🟢 **Money Given to Others (To Collect)**: Shows borrower name, amount, return date, countdown badge, and a **Mark Settled** button.
   - **Category-wise Expense Donut Chart**: HTML5 Canvas visual breakdown.
   - **Monthly Summary**: Groups income and expenses by month.
   - **Dark / Light Mode**: Toggle button in the header.

2. **Add Transaction (`add-transaction.html`)**:
   - Log Income or Expense with positive amount and date.
   - When **Borrowed Money** or **Money Given to Others** is selected, dynamic fields reveal:
     - Person's Name
     - Repayment timeframe presets (`Within 5 Days`, `Within 7 Days`, or `Custom Days`)
     - Auto-calculated due date.

3. **All Transactions (`transactions.html`)**:
   - Complete ledger with filters (by Type, Category, Date range).
   - Real-time search by description, person, or category.
   - Sort by Date (newest/oldest) and Amount (high/low).
   - In-place **Edit Modal** and **Delete** actions.
   - Settle / Reopen toggle directly from the list.
   - **Clear All Data** button to wipe back to zero at any time.

---

## 💾 Data Storage
- All transactions, status changes, and theme preferences are automatically saved in the browser's `localStorage` and persist across page refreshes.
