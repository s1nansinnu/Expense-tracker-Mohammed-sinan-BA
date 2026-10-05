/**
 * Shared UI helpers:
 * - Indian Rupee (₹) formatting with Lakhs/Crores grouping
 * - Date formatters and countdown helpers
 * - Toast notification system
 * - Theme switcher (Dark / Light mode)
 */

const UI = {
  /**
   * Format number as Indian Rupee (₹)
   * Example: 150000 -> "₹1,50,000.00"
   */
  formatINR(amount, includeDecimals = true) {
    if (isNaN(amount) || amount === null || amount === undefined) {
      return '₹0.00';
    }
    const num = Math.abs(Number(amount));
    const isNegative = Number(amount) < 0;

    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: includeDecimals ? 2 : 0,
      maximumFractionDigits: includeDecimals ? 2 : 0
    }).format(num);

    return isNegative ? `-${formatted}` : formatted;
  },

  /**
   * Format date string (YYYY-MM-DD) into readable Indian/English format (e.g. "05 Oct 2026")
   */
  formatDate(dateString) {
    if (!dateString) return '-';
    try {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const date = new Date(parts[0], parts[1] - 1, parts[2]);
        return date.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      }
      const d = new Date(dateString);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  },

  /**
   * Calculate difference between today and due date in days
   */
  getDaysRemaining(dueDateString) {
    if (!dueDateString) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parts = dueDateString.split('-');
    let target;
    if (parts.length === 3) {
      target = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      target = new Date(dueDateString);
    }
    target.setHours(0, 0, 0, 0);

    const diffMs = target - today;
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  },

  /**
   * Render status badge for due dates (e.g., "Due in 3 days", "Overdue by 1 day", "Due today")
   */
  getDueBadgeHTML(dueDateString, isSettled = false) {
    if (isSettled) {
      return `<span class="badge badge-success"><i class="ph ph-check-circle"></i> Settled</span>`;
    }
    if (!dueDateString) return '';

    const days = this.getDaysRemaining(dueDateString);
    if (days === null) return '';

    if (days < 0) {
      const overdue = Math.abs(days);
      return `<span class="badge badge-danger" title="Due on ${this.formatDate(dueDateString)}">
        <i class="ph ph-warning-circle"></i> Overdue by ${overdue} ${overdue === 1 ? 'day' : 'days'}
      </span>`;
    } else if (days === 0) {
      return `<span class="badge badge-warning" title="Due on ${this.formatDate(dueDateString)}">
        <i class="ph ph-clock"></i> Due Today!
      </span>`;
    } else if (days === 1) {
      return `<span class="badge badge-warning" title="Due on ${this.formatDate(dueDateString)}">
        <i class="ph ph-clock"></i> Due Tomorrow
      </span>`;
    } else {
      return `<span class="badge badge-info" title="Due on ${this.formatDate(dueDateString)}">
        <i class="ph ph-calendar"></i> In ${days} days
      </span>`;
    }
  },

  /**
   * Toast notification system
   */
  showToast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} toast-enter`;

    const iconMap = {
      success: 'check-circle',
      error: 'x-circle',
      warning: 'warning',
      info: 'info'
    };
    const icon = iconMap[type] || 'info';

    toast.innerHTML = `
      <div class="toast-content">
        <i class="ph ph-${icon}"></i>
        <span>${message}</span>
      </div>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;

    container.appendChild(toast);

    const close = () => {
      toast.classList.remove('toast-enter');
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 250);
    };

    toast.querySelector('.toast-close').addEventListener('click', close);
    setTimeout(close, duration);
  },

  /**
   * Initialize theme (light/dark)
   */
  initTheme() {
    const savedTheme = localStorage.getItem('et_theme') || 
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeToggleIcon(savedTheme);

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('et_theme', next);
        this.updateThemeToggleIcon(next);
        // Fire event so charts can re-render with matching theme palette
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: next }));
      });
    }
  },

  updateThemeToggleIcon(theme) {
    const icon = document.getElementById('theme-toggle-icon');
    if (icon) {
      if (theme === 'dark') {
        icon.className = 'ph ph-sun';
      } else {
        icon.className = 'ph ph-moon';
      }
    }
  },

  /**
   * Escape HTML to prevent XSS
   */
  escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

window.UI = UI;

document.addEventListener('DOMContentLoaded', () => {
  UI.initTheme();
});
