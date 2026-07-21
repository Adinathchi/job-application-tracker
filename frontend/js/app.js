/* =========================================================
   BOARDING — Dashboard logic
   Talks to the Express backend via api.js (apiRequest / auth helpers)
   ========================================================= */

// Guard: bounce to login if there's no session
if (!auth.isLoggedIn()) {
  window.location.href = 'login.html';
}

const STATUSES = ['applied', 'interview', 'offer', 'rejected'];

let applications = [];
let searchTerm = '';
let editingId = null;
let draggedCardId = null;

/* ---------- DOM refs ---------- */
const modalOverlay = document.getElementById('modalOverlay');
const appForm = document.getElementById('appForm');
const modalTitle = document.getElementById('modalTitle');
const deleteBtn = document.getElementById('deleteBtn');
const toastEl = document.getElementById('toast');
const searchInput = document.getElementById('searchInput');
const historyOverlay = document.getElementById('historyOverlay');
const historyBody = document.getElementById('historyBody');

/* =========================================================
   ROBOT GREETING — time-of-day aware
   ========================================================= */
function greetUser() {
  const user = auth.getUser();
  const hour = new Date().getHours();

  let timeOfDay, subLine;
  if (hour < 12) {
    timeOfDay = 'Good morning';
    subLine = 'Fresh day, fresh applications. Let’s log a few.';
  } else if (hour < 17) {
    timeOfDay = 'Good afternoon';
    subLine = 'Midday check-in — anything moved stages today?';
  } else if (hour < 21) {
    timeOfDay = 'Good evening';
    subLine = 'Good time to follow up on pending interviews.';
  } else {
    timeOfDay = 'Working late';
    subLine = 'Don’t forget to rest — the board will be here tomorrow.';
  }

  const name = user && user.name ? user.name.split(' ')[0] : 'there';
  document.getElementById('greetingText').textContent = `${timeOfDay}, ${name}!`;
  document.getElementById('greetingSub').textContent = subLine;
}

/* =========================================================
   DATA — loaded from the backend
   ========================================================= */
async function loadApplications() {
  try {
    const data = await apiRequest('/applications');
    applications = data.applications;
    renderAll();
  } catch (err) {
    showToast(err.message);
    if (err.message.includes('log in')) {
      setTimeout(() => (window.location.href = 'login.html'), 1200);
    }
  }
}

/* =========================================================
   RENDERING
   ========================================================= */
function renderAll() {
  STATUSES.forEach(renderColumn);
  renderStats();
}

function renderColumn(status) {
  const container = document.getElementById(`col-${status}`);
  container.innerHTML = '';

  const items = applications
    .filter((a) => a.status === status)
    .filter(matchesSearch)
    .sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'));

  document.getElementById(`count${capitalize(status)}`).textContent = items.length;

  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = searchTerm ? 'No matches' : 'No applications here yet';
    container.appendChild(empty);
    return;
  }

  items.forEach((app) => container.appendChild(buildCard(app)));
}

function buildCard(app) {
  const card = document.createElement('div');
  card.className = 'card';
  card.draggable = true;
  card.dataset.id = app.id;

  const deadlineHTML = app.deadline ? deadlineBadge(app.deadline) : '';

  card.innerHTML = `
    <div class="card__top">
      <div>
        <div class="card__company">${escapeHTML(app.company)}</div>
        <div class="card__role">${escapeHTML(app.role)}</div>
      </div>
    </div>
    <div class="card__meta">
      <span>${app.appliedDate ? formatDate(app.appliedDate) : 'no date'}</span>
      ${deadlineHTML}
    </div>
  `;

  card.addEventListener('click', () => openModal(app.id));

  card.addEventListener('dragstart', () => {
    draggedCardId = app.id;
    card.classList.add('dragging');
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    draggedCardId = null;
  });

  return card;
}

function deadlineBadge(dateStr) {
  const daysLeft = daysUntil(dateStr);
  let cls = 'deadline--later';
  let label = formatDate(dateStr);

  if (daysLeft < 0) {
    cls = 'deadline--later';
    label = 'past';
  } else if (daysLeft <= 2) {
    cls = 'deadline--soon';
    label = daysLeft === 0 ? 'today' : `${daysLeft}d left`;
  } else if (daysLeft <= 7) {
    cls = 'deadline--upcoming';
    label = `${daysLeft}d left`;
  }

  return `<span class="card__deadline ${cls}">⏰ ${label}</span>`;
}

function renderStats() {
  const total = applications.length;
  const applied = applications.filter((a) => a.status === 'applied').length;
  const interview = applications.filter((a) => a.status === 'interview').length;
  const offer = applications.filter((a) => a.status === 'offer').length;
  const rejected = applications.filter((a) => a.status === 'rejected').length;

  const responded = interview + offer + rejected;
  const rate = total > 0 ? Math.round((responded / total) * 100) : 0;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statApplied').textContent = applied;
  document.getElementById('statInterview').textContent = interview;
  document.getElementById('statOffer').textContent = offer;
  document.getElementById('statRate').textContent = `${rate}%`;
}

/* =========================================================
   DRAG & DROP (native HTML5 API) — persists status change to backend
   ========================================================= */
document.querySelectorAll('.dropzone').forEach((zone) => {
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });

  zone.addEventListener('dragleave', () => {
    zone.classList.remove('drag-over');
  });

  zone.addEventListener('drop', async (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    if (!draggedCardId) return;

    const app = applications.find((a) => a.id === draggedCardId);
    if (!app || app.status === zone.dataset.status) return;

    const newStatus = zone.dataset.status;
    try {
      const data = await apiRequest(`/applications/${app.id}`, {
        method: 'PUT',
        body: { status: newStatus }
      });
      app.status = data.application.status;
      renderAll();
      showToast(`Moved ${app.company} to ${capitalize(newStatus)}`);
    } catch (err) {
      showToast(err.message);
    }
  });
});

/* =========================================================
   MODAL — add / edit
   ========================================================= */
document.getElementById('addBtn').addEventListener('click', () => openModal(null));
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (modalOverlay.classList.contains('open')) closeModal();
    if (historyOverlay.classList.contains('open')) closeHistory();
  }
});

function openModal(id) {
  editingId = id;
  appForm.reset();

  if (id) {
    const app = applications.find((a) => a.id === id);
    if (!app) return;
    modalTitle.textContent = 'Edit application';
    document.getElementById('cardId').value = app.id;
    document.getElementById('company').value = app.company;
    document.getElementById('role').value = app.role;
    document.getElementById('status').value = app.status;
    document.getElementById('appliedDate').value = app.appliedDate || '';
    document.getElementById('deadline').value = app.deadline || '';
    document.getElementById('link').value = app.link || '';
    document.getElementById('notes').value = app.notes || '';
    deleteBtn.style.display = 'inline-flex';
  } else {
    modalTitle.textContent = 'Log a new application';
    document.getElementById('cardId').value = '';
    document.getElementById('appliedDate').value = new Date().toISOString().slice(0, 10);
    deleteBtn.style.display = 'none';
  }

  modalOverlay.classList.add('open');
  document.getElementById('company').focus();
}

function closeModal() {
  modalOverlay.classList.remove('open');
  editingId = null;
}

appForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    company: document.getElementById('company').value.trim(),
    role: document.getElementById('role').value.trim(),
    status: document.getElementById('status').value,
    appliedDate: document.getElementById('appliedDate').value,
    deadline: document.getElementById('deadline').value,
    link: document.getElementById('link').value.trim(),
    notes: document.getElementById('notes').value.trim()
  };

  if (!payload.company || !payload.role) return;

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    if (editingId) {
      const data = await apiRequest(`/applications/${editingId}`, { method: 'PUT', body: payload });
      const idx = applications.findIndex((a) => a.id === editingId);
      applications[idx] = data.application;
      showToast('Application updated');
    } else {
      const data = await apiRequest('/applications', { method: 'POST', body: payload });
      applications.push(data.application);
      showToast('Application logged');
    }
    closeModal();
    renderAll();
  } catch (err) {
    showToast(err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save application';
  }
});

deleteBtn.addEventListener('click', async () => {
  if (!editingId) return;
  try {
    await apiRequest(`/applications/${editingId}`, { method: 'DELETE' });
    applications = applications.filter((a) => a.id !== editingId);
    showToast('Application deleted');
    closeModal();
    renderAll();
  } catch (err) {
    showToast(err.message);
  }
});

/* =========================================================
   HISTORY MODAL
   ========================================================= */
document.getElementById('historyBtn').addEventListener('click', openHistory);
document.getElementById('historyClose').addEventListener('click', closeHistory);
historyOverlay.addEventListener('click', (e) => {
  if (e.target === historyOverlay) closeHistory();
});

async function openHistory() {
  historyOverlay.classList.add('open');
  historyBody.innerHTML = '<p class="empty-state">Loading…</p>';

  try {
    const data = await apiRequest('/applications/history/all');
    renderHistory(data.history);
  } catch (err) {
    historyBody.innerHTML = `<p class="empty-state">${escapeHTML(err.message)}</p>`;
  }
}

function closeHistory() {
  historyOverlay.classList.remove('open');
}

function renderHistory(history) {
  if (!history.length) {
    historyBody.innerHTML = '<p class="empty-state">No activity yet — log your first application to start a history.</p>';
    return;
  }

  const timeline = document.createElement('div');
  timeline.className = 'timeline';

  history.forEach((h) => {
    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.dataset.status = h.toStatus;

    const action = h.fromStatus
      ? `moved from <strong>${capitalize(h.fromStatus)}</strong> to <strong>${capitalize(h.toStatus)}</strong>`
      : `application created as <strong>${capitalize(h.toStatus)}</strong>`;

    item.innerHTML = `
      <div class="timeline-item__title">${escapeHTML(h.company)} — ${escapeHTML(h.role)}</div>
      <div class="timeline-item__meta">${formatDateTime(h.changedAt)}</div>
      <span class="timeline-item__badge">${action}</span>
    `;
    timeline.appendChild(item);
  });

  historyBody.innerHTML = '';
  historyBody.appendChild(timeline);
}

/* =========================================================
   LOGOUT
   ========================================================= */
document.getElementById('logoutBtn').addEventListener('click', () => {
  auth.clearSession();
  window.location.href = 'login.html';
});

/* =========================================================
   SEARCH
   ========================================================= */
searchInput.addEventListener('input', (e) => {
  searchTerm = e.target.value.trim().toLowerCase();
  renderAll();
});

function matchesSearch(app) {
  if (!searchTerm) return true;
  return (
    app.company.toLowerCase().includes(searchTerm) ||
    app.role.toLowerCase().includes(searchTerm)
  );
}

/* =========================================================
   UTILITIES
   ========================================================= */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateTime(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function daysUntil(dateStr) {
  const target = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

let toastTimer = null;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
}

/* =========================================================
   INIT
   ========================================================= */
greetUser();
loadApplications();
