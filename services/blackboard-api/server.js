const express = require('express');
const { pool } = require('./db');

const HOST = process.env.BLACKBOARD_API_HOST || '127.0.0.1';
const PORT = Number(process.env.BLACKBOARD_API_PORT || 8788);

const AGENT_NAME_RE = /^[a-z0-9-]+$/;
const LOG_KINDS = new Set(['obs', 'claim', 'done', 'ask', 'reply', 'warn']);

const app = express();
app.use(express.json());

function isAgentName(v) {
  return typeof v === 'string' && AGENT_NAME_RE.test(v);
}

// Translate Postgres constraint errors into the right HTTP status instead
// of leaking a 500 for client mistakes (unknown agent, bad kind, dup name).
function sendPgError(res, err) {
  if (err.code === '23505') return res.status(409).json({ error: 'already exists' });
  if (err.code === '23503') return res.status(400).json({ error: 'references an unknown agent' });
  if (err.code === '23514' || err.code === '22P02') {
    return res.status(400).json({ error: 'invalid value' });
  }
  console.error(err);
  return res.status(500).json({ error: 'internal error' });
}

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({ ok: false });
  }
});

// Register an agent — bb register <name> "<role>"
app.post('/api/agents', async (req, res) => {
  const { name, role, cwd } = req.body || {};
  if (!isAgentName(name)) {
    return res.status(400).json({ error: 'name must match ^[a-z0-9-]+$' });
  }
  if (typeof role !== 'string' || !role.trim()) {
    return res.status(400).json({ error: 'role is required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO agents (name, role, cwd) VALUES ($1, $2, $3)
       RETURNING name, role, cwd, status, registered_at`,
      [name, role, cwd || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    sendPgError(res, err);
  }
});

// bb who
app.get('/api/agents', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT name, role, cwd, status, registered_at FROM agents ORDER BY registered_at'
    );
    res.json(rows);
  } catch (err) {
    sendPgError(res, err);
  }
});

// Append a wm_log entry — bb log <name> <kind> "<text>"
app.post('/api/log', async (req, res) => {
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
    const { rows } = await pool.query(
      `INSERT INTO wm_log (agent, kind, body, addressed_to, reply_to, claim_key)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, created_at`,
      [agent, kind, body, addressed_to || null, reply_to || null, claim_key || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    sendPgError(res, err);
  }
});

// bb read <name> — unread peer entries since this reader's cursor, then
// advances the cursor. ?all=true replays everything instead (bb read --all).
app.get('/api/log/:agent', async (req, res) => {
  const reader = req.params.agent;
  if (!isAgentName(reader)) {
    return res.status(400).json({ error: 'agent must match ^[a-z0-9-]+$' });
  }
  const all = req.query.all === 'true';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let rows;
    if (all) {
      ({ rows } = await client.query(
        'SELECT * FROM wm_log WHERE agent <> $1 ORDER BY id',
        [reader]
      ));
    } else {
      ({ rows } = await client.query(
        `SELECT * FROM wm_log
         WHERE id > COALESCE((SELECT last_seen_id FROM read_cursors WHERE reader = $1), 0)
           AND agent <> $1
         ORDER BY id`,
        [reader]
      ));
      if (rows.length > 0) {
        const maxId = rows[rows.length - 1].id;
        await client.query(
          `INSERT INTO read_cursors (reader, last_seen_id, updated_at)
           VALUES ($1, $2, now())
           ON CONFLICT (reader) DO UPDATE SET last_seen_id = EXCLUDED.last_seen_id,
                                               updated_at   = EXCLUDED.updated_at`,
          [reader, maxId]
        );
      }
    }

    await client.query('COMMIT');
    res.json(rows);
  } catch (err) {
    await client.query('ROLLBACK');
    sendPgError(res, err);
  } finally {
    client.release();
  }
});

// Claim work atomically — first writer on a claim_key wins, no timestamp race.
app.post('/api/claims', async (req, res) => {
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
  try {
    const { rows } = await pool.query(
      `WITH logged AS (
         INSERT INTO wm_log (agent, kind, body, claim_key)
         VALUES ($1, 'claim', $2, $3)
         RETURNING id
       )
       INSERT INTO claims (claim_key, agent, wm_log_id)
       SELECT $3, $1, id FROM logged
       ON CONFLICT (claim_key) WHERE released_at IS NULL DO NOTHING
       RETURNING id, claim_key, claimed_at`,
      [agent, body, claim_key]
    );
    if (rows.length === 0) {
      return res.status(409).json({ claimed: false, error: 'lost the race for this claim_key' });
    }
    res.status(201).json({ claimed: true, ...rows[0] });
  } catch (err) {
    sendPgError(res, err);
  }
});

// Release a claim — on 'done', or when conceding a lost race.
app.post('/api/claims/release', async (req, res) => {
  const { agent, claim_key } = req.body || {};
  if (!isAgentName(agent)) {
    return res.status(400).json({ error: 'agent must match ^[a-z0-9-]+$' });
  }
  if (typeof claim_key !== 'string' || !claim_key.trim()) {
    return res.status(400).json({ error: 'claim_key is required' });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE claims SET released_at = now()
       WHERE claim_key = $1 AND agent = $2 AND released_at IS NULL
       RETURNING id, claim_key, released_at`,
      [claim_key, agent]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'no active claim for this agent/claim_key' });
    }
    res.json(rows[0]);
  } catch (err) {
    sendPgError(res, err);
  }
});

app.listen(PORT, HOST, () => {
  console.log(`blackboard-api listening on http://${HOST}:${PORT}`);
});
