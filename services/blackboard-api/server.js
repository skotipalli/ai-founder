const express = require('express');
const { db } = require('./db');

const HOST = process.env.BLACKBOARD_API_HOST || '127.0.0.1';
const PORT = Number(process.env.BLACKBOARD_API_PORT || 8788);

const AGENT_NAME_RE = /^[a-z0-9-]+$/;
const LOG_KINDS = new Set(['obs', 'claim', 'done', 'ask', 'reply', 'warn']);

const app = express();
app.use(express.json());

function isAgentName(v) {
  return typeof v === 'string' && AGENT_NAME_RE.test(v);
}

// Translate sqlite constraint errors into the right HTTP status instead of
// leaking a 500 for client mistakes (unknown agent, bad kind, dup name).
function sendSqliteError(res, err) {
  if (err.message && err.message.includes('UNIQUE constraint')) {
    return res.status(409).json({ error: 'already exists' });
  }
  if (err.message && err.message.includes('FOREIGN KEY constraint')) {
    return res.status(400).json({ error: 'references an unknown agent' });
  }
  if (err.message && err.message.includes('CHECK constraint')) {
    return res.status(400).json({ error: 'invalid value' });
  }
  console.error(err);
  return res.status(500).json({ error: 'internal error' });
}

app.get('/api/health', (req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({ ok: false });
  }
});

// Register an agent — bb register <name> "<role>"
app.post('/api/agents', (req, res) => {
  const { name, role, cwd } = req.body || {};
  if (!isAgentName(name)) {
    return res.status(400).json({ error: 'name must match ^[a-z0-9-]+$' });
  }
  if (typeof role !== 'string' || !role.trim()) {
    return res.status(400).json({ error: 'role is required' });
  }
  try {
    const row = db
      .prepare(
        `INSERT INTO agents (name, role, cwd) VALUES (?, ?, ?)
         RETURNING name, role, cwd, status, registered_at`
      )
      .get(name, role, cwd || null);
    res.status(201).json(row);
  } catch (err) {
    sendSqliteError(res, err);
  }
});

// bb who
app.get('/api/agents', (req, res) => {
  try {
    const rows = db
      .prepare('SELECT name, role, cwd, status, registered_at FROM agents ORDER BY registered_at')
      .all();
    res.json(rows);
  } catch (err) {
    sendSqliteError(res, err);
  }
});

// Append a wm_log entry — bb log <name> <kind> "<text>"
app.post('/api/log', (req, res) => {
  const { agent, kind, body, addressed_to, reply_to, claim_key } = req.body || {};
  if (!isAgentName(agent)) {
    return res.status(400).json({ error: 'agent must match ^[a-z0-9-]+$' });
  }
  if (!LOG_KINDS.has(kind)) {
    return res.status(400).json({ error: `kind must be one of ${[...LOG_KINDS].join(', ')}` });
  }
  if (typeof body !== 'string' || !body.trim()) {
    return res.status(400).json({ error: 'body is required' });
  }
  try {
    const row = db
      .prepare(
        `INSERT INTO wm_log (agent, kind, body, addressed_to, reply_to, claim_key)
         VALUES (?, ?, ?, ?, ?, ?)
         RETURNING id, created_at`
      )
      .get(agent, kind, body, addressed_to || null, reply_to || null, claim_key || null);
    res.status(201).json(row);
  } catch (err) {
    sendSqliteError(res, err);
  }
});

// bb read <name> — unread peer entries since this reader's cursor, then
// advances the cursor. ?all=true replays everything instead (bb read --all).
app.get('/api/log/:agent', (req, res) => {
  const reader = req.params.agent;
  if (!isAgentName(reader)) {
    return res.status(400).json({ error: 'agent must match ^[a-z0-9-]+$' });
  }
  const all = req.query.all === 'true';
  const readTxn = db.transaction((reader, all) => {
    if (all) {
      return db.prepare('SELECT * FROM wm_log WHERE agent <> ? ORDER BY id').all(reader);
    }
    const rows = db
      .prepare(
        `SELECT * FROM wm_log
         WHERE id > COALESCE((SELECT last_seen_id FROM read_cursors WHERE reader = ?), 0)
           AND agent <> ?
         ORDER BY id`
      )
      .all(reader, reader);
    if (rows.length > 0) {
      const maxId = rows[rows.length - 1].id;
      db.prepare(
        `INSERT INTO read_cursors (reader, last_seen_id, updated_at)
         VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
         ON CONFLICT(reader) DO UPDATE SET last_seen_id = excluded.last_seen_id,
                                            updated_at   = excluded.updated_at`
      ).run(reader, maxId);
    }
    return rows;
  });
  try {
    res.json(readTxn(reader, all));
  } catch (err) {
    sendSqliteError(res, err);
  }
});

// Claim work atomically — first writer on a claim_key wins, no timestamp race.
app.post('/api/claims', (req, res) => {
  const { agent, body, claim_key } = req.body || {};
  if (!isAgentName(agent)) {
    return res.status(400).json({ error: 'agent must match ^[a-z0-9-]+$' });
  }
  if (typeof claim_key !== 'string' || !claim_key.trim()) {
    return res.status(400).json({ error: 'claim_key is required' });
  }
  if (typeof body !== 'string' || !body.trim()) {
    return res.status(400).json({ error: 'body is required' });
  }
  // Always logged, win or lose — matches blackboard/schema.sql's contract
  // (a losing attempt is still a visible 'claim' entry for peers to see).
  const claimTxn = db.transaction((agent, body, claim_key) => {
    const logged = db
      .prepare("INSERT INTO wm_log (agent, kind, body, claim_key) VALUES (?, 'claim', ?, ?) RETURNING id")
      .get(agent, body, claim_key);

    try {
      return db
        .prepare(
          `INSERT INTO claims (claim_key, agent, wm_log_id) VALUES (?, ?, ?)
           RETURNING id, claim_key, claimed_at`
        )
        .get(claim_key, agent, logged.id);
    } catch (err) {
      if (!err.message.includes('UNIQUE constraint')) throw err;
      return null; // lost the race for this claim_key
    }
  });
  try {
    const claimRow = claimTxn(agent, body, claim_key);
    if (!claimRow) {
      return res.status(409).json({ claimed: false, error: 'lost the race for this claim_key' });
    }
    res.status(201).json({ claimed: true, ...claimRow });
  } catch (err) {
    sendSqliteError(res, err);
  }
});

// Release a claim — on 'done', or when conceding a lost race.
app.post('/api/claims/release', (req, res) => {
  const { agent, claim_key } = req.body || {};
  if (!isAgentName(agent)) {
    return res.status(400).json({ error: 'agent must match ^[a-z0-9-]+$' });
  }
  if (typeof claim_key !== 'string' || !claim_key.trim()) {
    return res.status(400).json({ error: 'claim_key is required' });
  }
  try {
    const row = db
      .prepare(
        `UPDATE claims SET released_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE claim_key = ? AND agent = ? AND released_at IS NULL
         RETURNING id, claim_key, released_at`
      )
      .get(claim_key, agent);
    if (!row) {
      return res.status(404).json({ error: 'no active claim for this agent/claim_key' });
    }
    res.json(row);
  } catch (err) {
    sendSqliteError(res, err);
  }
});

app.listen(PORT, HOST, () => {
  console.log(`blackboard-api listening on http://${HOST}:${PORT}`);
});
