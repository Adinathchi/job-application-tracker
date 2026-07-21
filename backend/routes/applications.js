const express = require('express');
const crypto = require('crypto');
const { readDB, writeDB } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Every route here is protected — req.user is set by requireAuth
router.use(requireAuth);

/* GET /api/applications — list only the logged-in user's applications */
router.get('/', (req, res) => {
  const db = readDB();
  const mine = db.applications.filter((a) => a.userId === req.user.id);
  res.json({ applications: mine });
});

/* POST /api/applications — create a new application */
router.post('/', (req, res) => {
  const { company, role, status, appliedDate, deadline, link, notes } = req.body;

  if (!company || !role) {
    return res.status(400).json({ error: 'Company and role are required.' });
  }

  const db = readDB();
  const now = new Date().toISOString();

  const application = {
    id: crypto.randomUUID(),
    userId: req.user.id,
    company: company.trim(),
    role: role.trim(),
    status: status || 'applied',
    appliedDate: appliedDate || now.slice(0, 10),
    deadline: deadline || '',
    link: link || '',
    notes: notes || '',
    createdAt: now,
    updatedAt: now
  };

  db.applications.push(application);

  db.history.push({
    id: crypto.randomUUID(),
    applicationId: application.id,
    userId: req.user.id,
    company: application.company,
    role: application.role,
    fromStatus: null,
    toStatus: application.status,
    changedAt: now
  });

  writeDB(db);
  res.status(201).json({ application });
});

/* PUT /api/applications/:id — update fields and/or move status (logs history on status change) */
router.put('/:id', (req, res) => {
  const db = readDB();
  const application = db.applications.find(
    (a) => a.id === req.params.id && a.userId === req.user.id
  );

  if (!application) {
    return res.status(404).json({ error: 'Application not found.' });
  }

  const { company, role, status, appliedDate, deadline, link, notes } = req.body;
  const previousStatus = application.status;

  if (company !== undefined) application.company = company.trim();
  if (role !== undefined) application.role = role.trim();
  if (appliedDate !== undefined) application.appliedDate = appliedDate;
  if (deadline !== undefined) application.deadline = deadline;
  if (link !== undefined) application.link = link;
  if (notes !== undefined) application.notes = notes;
  if (status !== undefined) application.status = status;

  application.updatedAt = new Date().toISOString();

  if (status !== undefined && status !== previousStatus) {
    db.history.push({
      id: crypto.randomUUID(),
      applicationId: application.id,
      userId: req.user.id,
      company: application.company,
      role: application.role,
      fromStatus: previousStatus,
      toStatus: status,
      changedAt: application.updatedAt
    });
  }

  writeDB(db);
  res.json({ application });
});

/* DELETE /api/applications/:id */
router.delete('/:id', (req, res) => {
  const db = readDB();
  const exists = db.applications.some(
    (a) => a.id === req.params.id && a.userId === req.user.id
  );

  if (!exists) {
    return res.status(404).json({ error: 'Application not found.' });
  }

  db.applications = db.applications.filter((a) => a.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

/* GET /api/applications/history/all — full status-change timeline for the "History" button */
router.get('/history/all', (req, res) => {
  const db = readDB();
  const mine = db.history
    .filter((h) => h.userId === req.user.id)
    .sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));
  res.json({ history: mine });
});

module.exports = router;
