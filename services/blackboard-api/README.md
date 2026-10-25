# Blackboard API

An Express HTTP wrapper over the kapi blackboard, backed by SQLite via
`better-sqlite3` (no `pg`, no separate database server to provision).
Lets the team (humans, dashboards, other services) read and write the
shared coordination blackboard over HTTP instead of needing direct
file/CLI access to the database.

Deployed on `srini-vm01` at `/opt/blackboard-api`, running as the
`blackboard-api` systemd service on `127.0.0.1:8788`, publicly reachable
at `https://samsumanalytics.com/api/blackboard/*` (see
[Deployment status](#deployment-status) below). Originally built against
Node's built-in `node:sqlite`, but switched to `better-sqlite3` because
the VM runs Node 20.20.2 and `node:sqlite` needs 22.5+. `better-sqlite3`
13.x also requires Node >=22 (prebuilt binary ABI mismatch — segfaults on
Node 20); pinned to `12.11.1`, which explicitly supports Node 20.x. No
prebuilt binary existed for this exact platform/Node combo either, so it
compiles from source on install — the VM needed `build-essential` +
`python3` installed for `node-gyp` (done as part of this deploy).

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
npm install
BLACKBOARD_DB=/var/lib/blackboard/blackboard.db \
BLACKBOARD_API_PORT=8788 \
node server.js
```

Binds to `127.0.0.1` only by default (override with `BLACKBOARD_API_HOST`)
— same posture as `services/waitlist`: not meant to be reachable directly
from the internet. Requires Node >= 18.

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

## Deployment status

Done, directly on `srini-vm01` (not through a PR — ran ahead of the
normal `GIT_WORKFLOW.md` flow at the user's explicit direction, since
devops hadn't picked up the earlier handoff):

- `/opt/blackboard-api` (`server.js`, `db.js`, `package.json` +
  `node_modules`), owned by a new unprivileged `blackboard` system user.
- `/var/lib/blackboard/blackboard.db`, same owner.
- systemd unit `blackboard-api.service`, `enabled` (survives reboot),
  `ExecStart=/usr/bin/node /opt/blackboard-api/server.js`,
  `BLACKBOARD_DB=/var/lib/blackboard/blackboard.db`,
  `BLACKBOARD_API_PORT=8788`. Verified `active` and all endpoints working
  against `http://127.0.0.1:8788` directly on the VM (register,
  duplicate-name 409, log, claim win, agents list).
- Added `build-essential` + `python3` to the VM (needed for
  `better-sqlite3`'s `node-gyp` build — see above).
- Added a `location /api/blackboard/ { proxy_pass
  http://127.0.0.1:8788/api/; ... }` block to the live nginx server
  block (`/etc/nginx/conf.d/cloudflare-aop.conf`, the one that already
  serves `samsumanalytics.com` — confirmed via `nginx -T` and the access
  log that this is the right/only block handling that domain).

**Fixed (2026-10-25).** Public access via
`https://samsumanalytics.com/api/blackboard/*` was 404ing even though the
service worked fine locally on the VM. Root cause turned out to be
unrelated to Cloudflare rules (the earlier theory): Cloudflare was
reaching the origin over **plain HTTP (port 80)**, not the HTTPS /
Authenticated-Origin-Pulls vhost — i.e. the `default` server block in
`/etc/nginx/sites-enabled/default`, not
`/etc/nginx/conf.d/cloudflare-aop.conf`. The `location /api/blackboard/`
proxy block had only ever been added to the port-443 AOP vhost, so
requests arriving on port 80 fell through to that vhost's catch-all
`try_files ... =404`. `/` and `/hitl` worked via Cloudflare because both
exist in *both* vhosts; `/api/blackboard/` only existed in the one
Cloudflare doesn't actually use.

Fix: added the same `location /api/blackboard/ { proxy_pass
http://127.0.0.1:8788/api/; proxy_set_header X-Real-IP $remote_addr; }`
block to `/etc/nginx/sites-enabled/default` (backed up the prior file
first), `nginx -t` passed, reloaded. Verified
`https://samsumanalytics.com/api/blackboard/health` returns `{"ok":true}`
and `/api/blackboard/agents` returns `[]`, with `/robots.txt` and `/hitl`
unaffected.

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
