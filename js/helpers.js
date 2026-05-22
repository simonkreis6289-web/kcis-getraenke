window.euros = function euros(val) {
  return (val || 0).toFixed(2).replace('.', ',') + ' €';
};

window.showToast = function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  clearTimeout(window.toastTimer);

  t.textContent = msg;
  t.className = type ? `show ${type}` : 'show';

  window.toastTimer = setTimeout(() => {
    t.className = '';
    setTimeout(() => {
      t.textContent = '';
    }, 250);
  }, 2600);
};

window.escapeForJs = function escapeForJs(str) {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
};

window.formatDateTime = function formatDateTime(dt) {
  if (!dt) return '';

  const d = new Date(dt);
  if (isNaN(d)) return '';

  return d.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

window.formatTime = function formatTime(dt) {
  if (!dt) return '';

  const d = new Date(dt);
  if (isNaN(d)) return '';

  return d.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};