# Blackboard API

An Express HTTP wrapper over the kapi blackboard, backed by SQLite via
Node's built-in `node:sqlite` module (Node >= 22.5 — no `pg`, no separate
database server, no native module to compile). Lets the team (humans,
dashboards, other services) read and write the shared coordination
blackboard over HTTP instead of needing direct file/CLI access to the
database.

The schema is a SQLite port of `../../blackboard/schema.sql` (dev's
original Postgres proposal) — same four tables (`agents`, `wm_log`,
`read_cursors`, `claims`) and the same race-free claim semantics (a
partial unique index on `claims.claim_key WHERE released_at IS NULL`,
which SQLite supports the same way Postgres does). It's created
automatically on startup if the DB file doesn't exist yet, the same way
`services/waitlist/server.py`'s `init_db()` works.

## Running it

```sh
cd services/blackboard-api
npm install   # only dependency is express — sqlite is built into Node
BLACKBOARD_DB=/var/lib/blackboard/blackboard.db \
BLACKBOARD_API_PORT=8788 \
node server.js
```

Binds to `127.0.0.1` only by default (override with `BLACKBOARD_API_HOST`)
— same posture as `services/waitlist`: not meant to be reachable directly
from the internet. Requires Node 22.5+ (built and tested on Node 25);
confirm the VM's Node version supports `node:sqlite` before deploying —
no flag is needed on 22.5+, and there's no fallback if the VM is on an
older Node.

## API

All bodies/responses are JSON. Agent names must match `^[a-z0-9-]+$`.

| Method | Path | Maps to | Body |
|---|---|---|---|
| `GET`  | `/api/health` | — | — |
| `POST` | `/api/agents` | `bb register <name> "<role>"` | `{ name, role, cwd? }` |
| `GET`  | `/api/agents` | `bb who` | — |
| `POST` | `/api/log` | `bb log <name> <kind> "<text>"` | `{ agent, kind, body, addressed_to?, reply_to?, claim_key? }` — `kind` is one of `obs/claim/done/ask/reply/warn` |
| `GET`  | `/api/log/:agent` | `bb read <name>` | — unread peer entries, advances that agent's cursor. `?all=true` replays everything instead (`bb read --all`) |
| `POST` | `/api/claims` | atomic claim | `{ agent, claim_key, body }` — `201` if the claim was won, `409 { claimed: false }` if another agent already holds `claim_key` (the attempt is still logged either way) |
| `POST` | `/api/claims/release` | release a claim | `{ agent, claim_key }` — `404` if no active claim matches |

Errors: `400` for invalid input (bad name, unknown `kind`, logging under an
unregistered agent), `409` for a duplicate agent name or a lost claim
race, `503` from `/api/health` if the database can't be queried.

Tested locally end-to-end against a throwaway SQLite file: register,
duplicate-name conflict, logging under an unknown agent (400), log +
unread-cursor advance, claim win/lose (including that the losing attempt
is still visible via `?all=true`), release, re-release 404.

## Wiring it up (devops — this part is yours per GIT_WORKFLOW.md)

1. Confirm the VM's Node version is >= 22.5 (ideally match what this was
   built on — Node 25 — since `node:sqlite`'s API has moved between
   versions while unflagged).
2. Pick a persistent path for `BLACKBOARD_DB` (e.g.
   `/var/lib/blackboard/blackboard.db`) owned by whatever user runs the
   service, and back it up — same concern as the waitlist's `.db` file.
3. systemd unit, same shape as `services/waitlist`:
   ```ini
   [Unit]
   Description=Blackboard API
   After=network.target

   [Service]
   ExecStart=/usr/bin/node /opt/blackboard-api/server.js
   Environment=BLACKBOARD_DB=/var/lib/blackboard/blackboard.db
   Environment=BLACKBOARD_API_PORT=8788
   Restart=on-failure
   User=blackboard
   WorkingDirectory=/opt/blackboard-api

   [Install]
   WantedBy=multi-user.target
   ```
4. nginx reverse-proxy, same shape as the waitlist service:
   ```nginx
   location /api/blackboard/ {
       proxy_pass http://127.0.0.1:8788/api/;
       proxy_set_header X-Real-IP $remote_addr;
   }
   ```

## What's intentionally NOT here (v1 scope)

- No auth on any endpoint — same trust boundary as the rest of the
  blackboard (internal agents/team, bound to localhost, proxied by
  devops). Add a bearer token here the same way `services/waitlist` did
  if this is ever exposed more broadly.
- No CORS headers — add them only if a browser-based consumer on a
  different origin needs this.
- No WebSocket/SSE push — consumers poll `GET /api/log/:agent` the same
  way `bb read` is polled per `PROTOCOL.md` §3.
- Single SQLite file, no replication/clustering. Fine for this project's
  scale; revisit if write concurrency or multi-host access ever becomes
  a real bottleneck.
