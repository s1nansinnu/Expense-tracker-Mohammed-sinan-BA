/**
 * Native HTML5 Canvas Category Chart & Visual Analytics
 * Renders an interactive donut chart with category distribution without external libraries
 */

const Charts = {
  // Vibrant color palette suitable for both dark and light modes
  palette: [
    '#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', 
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
    '#84cc16', '#d946ef', '#64748b'
  ],

  /**
   * Render category donut chart on a canvas element
   */
  renderDonutChart(canvasId, categoryData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    const innerRadius = radius * 0.62;

    // Clear previous drawing
    ctx.clearRect(0, 0, width, height);

    const total = categoryData.reduce((acc, cur) => acc + cur.amount, 0);

    if (total === 0 || categoryData.length === 0) {
      // Empty state donut
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.arc(centerX, centerY, innerRadius, Math.PI * 2, 0, true);
      ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#1e293b' : '#e2e8f0';
      ctx.fill();

      // Center text
      ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#94a3b8' : '#64748b';
      ctx.font = '600 13px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No Data', centerX, centerY);
      return;
    }

    let startAngle = -Math.PI / 2;

    categoryData.forEach((item, index) => {
      const sliceAngle = (item.amount / total) * (Math.PI * 2);
      const endAngle = startAngle + sliceAngle;
      const color = item.color || this.palette[index % this.palette.length];

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      // Thin separation border
      ctx.lineWidth = 2;
      ctx.strokeStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#131b2e' : '#ffffff';
      ctx.stroke();

      startAngle = endAngle;
    });

    // Center total summary
    ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#f8fafc' : '#0f172a';
    ctx.font = '800 15px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Format compact total (e.g., ₹1.2L or ₹45K or standard)
    const formattedTotal = total >= 100000 ? `₹${(total/100000).toFixed(1)}L` : (total >= 1000 ? `₹${(total/1000).toFixed(0)}k` : `₹${total}`);
    ctx.fillText(formattedTotal, centerX, centerY - 8);

    ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#94a3b8' : '#64748b';
    ctx.font = '600 11px system-ui';
    ctx.fillText('Expense', centerX, centerY + 12);
  },

  /**
   * Render custom HTML legend for categories
   */
  renderLegend(containerId, categoryData) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!categoryData || categoryData.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding: 1.5rem; color: var(--text-muted); font-size: 0.85rem;">No expense categories recorded yet.</div>`;
      return;
    }

    const total = categoryData.reduce((acc, cur) => acc + cur.amount, 0);

    container.innerHTML = categoryData.map((item, index) => {
      const color = item.color || this.palette[index % this.palette.length];
      const pct = total > 0 ? ((item.amount / total) * 100).toFixed(1) : 0;
      return `
        <div class="legend-item">
          <span class="legend-label">
            <span class="legend-color-dot" style="background-color: ${color}"></span>
            ${UI.escapeHTML(item.category)}
          </span>
          <span class="legend-amount">
            ${UI.formatINR(item.amount)}
            <span class="legend-percent">(${pct}%)</span>
          </span>
        </div>
      `;
    }).join('');
  }
};

window.Charts = Charts;
