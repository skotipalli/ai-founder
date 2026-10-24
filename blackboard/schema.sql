-- wm-log storage for the kapi blackboard (see ../PROTOCOL.md).
-- Replaces per-agent wm-log.md files: concurrent appends from multiple
-- agents are just independent INSERTs (MVCC handles that for free), and
-- claim conflicts get resolved by the database instead of a timestamp race.

CREATE TYPE log_kind AS ENUM ('obs', 'claim', 'done', 'ask', 'reply', 'warn');

CREATE TABLE agents (
    name          TEXT PRIMARY KEY CHECK (name ~ '^[a-z0-9-]+$'),
    role          TEXT NOT NULL,
    cwd           TEXT,
    status        TEXT NOT NULL DEFAULT 'active',
    registered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The log itself. Append-only: agents only ever INSERT, never UPDATE/DELETE
-- a row. `id` (not created_at) is the authoritative order, so clock skew
-- between agents' machines can't reorder entries.
CREATE TABLE wm_log (
    id           BIGSERIAL PRIMARY KEY,
    agent        TEXT NOT NULL REFERENCES agents(name),
    kind         log_kind NOT NULL,
    body         TEXT NOT NULL,
    addressed_to TEXT REFERENCES agents(name),   -- set for ask/reply @name, else NULL
    reply_to     BIGINT REFERENCES wm_log(id),   -- for kind='reply': entry being answered
    claim_key    TEXT,                           -- for kind='claim'/'done': what's being claimed
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX wm_log_agent_idx ON wm_log (agent, id);
CREATE INDEX wm_log_addressed_idx ON wm_log (addressed_to, id) WHERE addressed_to IS NOT NULL;

-- Per-agent read pointer, replaces the .cursors files. One row per agent;
-- "unread" = id > last_seen_id. Advancing it is a single UPDATE, so two
-- concurrent pollers for the same agent just race to the same end state.
CREATE TABLE read_cursors (
    reader       TEXT PRIMARY KEY REFERENCES agents(name),
    last_seen_id BIGINT NOT NULL DEFAULT 0,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Active claims. A claim is still logged as a normal wm_log row (kind='claim'),
-- but exclusivity is enforced here: the partial unique index means two agents
-- racing to claim the same key can both INSERT, but only one survives.
CREATE TABLE claims (
    id          BIGSERIAL PRIMARY KEY,
    claim_key   TEXT NOT NULL,
    agent       TEXT NOT NULL REFERENCES agents(name),
    wm_log_id   BIGINT NOT NULL REFERENCES wm_log(id),
    claimed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    released_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX one_active_claim_per_key
    ON claims (claim_key) WHERE released_at IS NULL;

-- ---------------------------------------------------------------------------
-- Usage
-- ---------------------------------------------------------------------------

-- Register (once per agent name; fails loudly if taken, matching `bb register`):
--   INSERT INTO agents (name, role, cwd) VALUES ($1, $2, $3);

-- Log an entry (bb log <name> <kind> "<text>"):
--   INSERT INTO wm_log (agent, kind, body, addressed_to, reply_to, claim_key)
--   VALUES ($1, $2, $3, $4, $5, $6)
--   RETURNING id;

-- Read unread peer entries (bb read <name> — excludes your own rows):
--   SELECT * FROM wm_log
--   WHERE id > (SELECT last_seen_id FROM read_cursors WHERE reader = $1)
--     AND agent <> $1
--   ORDER BY id;
--
--   -- then advance the cursor to the max id just read:
--   INSERT INTO read_cursors (reader, last_seen_id, updated_at)
--   VALUES ($1, $2, now())
--   ON CONFLICT (reader) DO UPDATE SET last_seen_id = EXCLUDED.last_seen_id,
--                                       updated_at   = EXCLUDED.updated_at;

-- Claim work atomically (first writer wins, no timestamp race):
--   WITH logged AS (
--     INSERT INTO wm_log (agent, kind, body, claim_key)
--     VALUES ($1, 'claim', $2, $3)
--     RETURNING id
--   )
--   INSERT INTO claims (claim_key, agent, wm_log_id)
--   SELECT $3, $1, id FROM logged
--   ON CONFLICT (claim_key) WHERE released_at IS NULL DO NOTHING
--   RETURNING id;
--   -- NULL result (0 rows) = you lost the race; post a 'reply' releasing your
--   -- attempt and pick something else, per PROTOCOL.md §4.

-- Release a claim (on 'done', or when conceding a lost race):
--   UPDATE claims SET released_at = now()
--   WHERE claim_key = $1 AND agent = $2 AND released_at IS NULL;
