/* Chart.js wrappers (theme-aware, with offline fallback) */
const Charts = (() => {
  'use strict';
  const PALETTE = [
    '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899',
    '#14b8a6', '#8b5cf6', '#f97316', '#84cc16', '#06b6d4', '#a855f7',
  ];
  let categoryChart = null;
  let monthlyChart = null;

  const compact = new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1,
  });

  const isAvailable = () => typeof window.Chart === 'function';
  const colorFor = (i) => PALETTE[i % PALETTE.length];
  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  function destroy(chart) {
    if (chart) chart.destroy();
    return null;
  }

  function applyDefaults() {
    if (!isAvailable()) return;
    window.Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    window.Chart.defaults.color = cssVar('--text-muted');
  }

  function showMessage(wrap, msgEl, text) {
    wrap.hidden = true;
    msgEl.hidden = false;
    msgEl.textContent = text;
  }

  function renderCategoryChart(canvas, msgEl, breakdown, format) {
    categoryChart = destroy(categoryChart);
    const wrap = canvas.parentElement;
    if (!breakdown.length) return showMessage(wrap, msgEl, 'No expenses recorded for this month.');
    if (!isAvailable()) return showMessage(wrap, msgEl, 'Chart could not load (are you offline?). See the breakdown below.');

    wrap.hidden = false;
    msgEl.hidden = true;
    applyDefaults();

    const values = breakdown.map((b) => b.amount);
    const total = values.reduce((a, b) => a + b, 0);

    categoryChart = new window.Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: breakdown.map((b) => b.category),
        datasets: [{
          data: values,
          backgroundColor: breakdown.map((_, i) => colorFor(i)),
          borderColor: cssVar('--surface'),
          borderWidth: 3,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const pct = total ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                return ` ${ctx.label}: ${format(ctx.parsed)} (${pct}%)`;
              },
            },
          },
        },
      },
    });
  }

  function renderMonthlyChart(canvas, msgEl, data, format) {
    monthlyChart = destroy(monthlyChart);
    const wrap = canvas.parentElement;
    if (!isAvailable()) return showMessage(wrap, msgEl, 'Chart could not load (are you offline?).');

    wrap.hidden = false;
    msgEl.hidden = true;
    applyDefaults();

    const grid = cssVar('--border');
    monthlyChart = new window.Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          { label: 'Income', data: data.map((d) => d.income), backgroundColor: cssVar('--income'), borderRadius: 6, maxBarThickness: 26 },
          { label: 'Expenses', data: data.map((d) => d.expense), backgroundColor: cssVar('--expense'), borderRadius: 6, maxBarThickness: 26 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, grid: { color: grid }, ticks: { callback: (v) => compact.format(v) } },
        },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true } },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${format(ctx.parsed.y)}` } },
        },
      },
    });
  }

  return { renderCategoryChart, renderMonthlyChart, colorFor };
})();
