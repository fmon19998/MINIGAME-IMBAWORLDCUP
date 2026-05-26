const $ = (sel) => document.querySelector(sel);

function showToast(message, type = 'info') {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  toast.style.borderColor = type === 'error' ? 'rgba(255, 77, 103, .55)' : 'rgba(255, 214, 107, .45)';
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => toast.classList.add('hidden'), 3200);
}

$('#adminGateForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  const key = String(form.get('key') || '').trim();
  if (!key) {
    showToast('Admin key wajib diisi.', 'error');
    return;
  }
  window.location.href = `/admin?key=${encodeURIComponent(key)}`;
});
