// Wildflower Farmer - Client-side JavaScript

// Confirmation dialog for deletes
function confirmDelete(message, form) {
  showModal(message || 'Are you sure you want to delete this?', () => {
    form.submit();
  });
}

// Generic modal
function showModal(message, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <p class="text-gray-800 mb-4">${message}</p>
      <div class="flex gap-2 justify-end">
        <button class="btn btn-secondary" data-action="cancel">Cancel</button>
        <button class="btn btn-danger" data-action="confirm">Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => {
    overlay.remove();
  });
  overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => {
    overlay.remove();
    if (onConfirm) onConfirm();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

// Quick status update for batches
async function advanceStatus(batchId, newStatus) {
  try {
    const res = await fetch(`/api/batches/${batchId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      window.location.reload();
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to update status');
    }
  } catch (e) {
    alert('Failed to update status');
  }
}

// Delete via API then redirect
async function deleteRecord(url, redirectTo) {
  showModal('Are you sure you want to delete this? This cannot be undone.', async () => {
    try {
      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) {
        window.location.href = redirectTo;
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete');
      }
    } catch (e) {
      alert('Failed to delete');
    }
  });
}

// Filter pills
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.filter-pill[data-filter]').forEach(pill => {
    pill.addEventListener('click', () => {
      const group = pill.dataset.filterGroup;
      const value = pill.dataset.filter;

      // Toggle active state
      if (pill.classList.contains('active')) {
        pill.classList.remove('active');
        updateFilters(group, '');
      } else {
        document.querySelectorAll(`.filter-pill[data-filter-group="${group}"]`).forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        updateFilters(group, value);
      }
    });
  });
});

function updateFilters(group, value) {
  const url = new URL(window.location);
  if (value) {
    url.searchParams.set(group, value);
  } else {
    url.searchParams.delete(group);
  }
  window.location.href = url.toString();
}

// Client-side search for lists
function setupSearch(inputId, itemSelector) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase();
    document.querySelectorAll(itemSelector).forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(q) ? '' : 'none';
    });
  });
}
