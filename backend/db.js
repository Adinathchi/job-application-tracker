/**
 * db.js — a tiny file-based "database".
 *
 * Why not a real database? For a student project, SQLite/Postgres add setup
 * friction (installs, native binaries, connection strings) that isn't worth it
 * for a resume project. This module gives you the same read/write/query shape
 * a real DB layer would, backed by a single JSON file. Swapping this for
 * Mongo/Postgres later only means rewriting this file — nothing above it changes.
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

function readDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read db.json, reinitializing:', err.message);
    const fresh = { users: [], applications: [], history: [] };
    writeDB(fresh);
    return fresh;
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = { readDB, writeDB };
