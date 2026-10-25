# Blackboard API

An Express HTTP wrapper over the `bb`/blackboard Postgres schema
(`../../blackboard/schema.sql`, see `../../PROTOCOL.md`). Lets the team
(humans, dashboards, other services) read and write the shared coordination
blackboard over HTTP instead of needing `psql`/CLI access to the database
directly.

This is the application layer only. It does not provision Postgres itself
— see "Wiring it up (devops)" below for what still needs to exist before
this is reachable by anyone but a developer running it locally.

## Running it

```sh
cd services/blackboard-api
npm install
DATABASE_URL=postgresql://user:pass@host:5432/blackboard \
BLACKBOARD_API_PORT=8788 \
node server.js
```

Binds to `127.0.0.1` only by default (override with `BLACKBOARD_API_HOST`)
— same posture as `services/waitlist`: not meant to be reachable directly
from the internet. `DATABASE_URL` is required; the process refuses to
start without it rather than silently running against nothing.

The database must already have `../../blackboard/schema.sql` applied:

```sh
psql "$DATABASE_URL" -f ../../blackboard/schema.sql
```

## API

All bodies/responses are JSON. Agent names must match `^[a-z0-9-]+$`
(same constraint as the `agents` table).

| Method | Path | Maps to | Body |
|---|---|---|---|
| `GET`  | `/api/health` | — | — |
| `POST` | `/api/agents` | `bb register <name> "<role>"` | `{ name, role, cwd? }` |
| `GET`  | `/api/agents` | `bb who` | — |
| `POST` | `/api/log` | `bb log <name> <kind> "<text>"` | `{ agent, kind, body, addressed_to?, reply_to?, claim_key? }` — `kind` is one of `obs/claim/done/ask/reply/warn` |
| `GET`  | `/api/log/:agent` | `bb read <name>` | — unread peer entries, advances that agent's cursor. `?all=true` replays everything instead (`bb read --all`) |
| `POST` | `/api/claims` | atomic claim | `{ agent, claim_key, body }` — `201` if the claim was won, `409 { claimed: false }` if another agent already holds `claim_key` |
| `POST` | `/api/claims/release` | release a claim | `{ agent, claim_key }` — `404` if no active claim matches |

Errors: `400` for invalid input (bad name, unknown `kind`), `409` for a
duplicate agent name or a lost claim race, `503` from `/api/health` if the
database is unreachable.

Tested locally end-to-end (register, duplicate-name conflict, log +
unread-cursor advance, claim win/lose, release, re-release 404) against a
throwaway Postgres database with this repo's `schema.sql` applied.

## Wiring it up (devops — this part is yours per GIT_WORKFLOW.md)

1. Provision a Postgres database for the blackboard (does not need to be
   dedicated hardware — this schema is small) and apply
   `blackboard/schema.sql`.
2. Set `DATABASE_URL` for this service (systemd `Environment=` line, not a
   file that could end up in git), following the same pattern as
   `services/waitlist`'s `WAITLIST_ADMIN_TOKEN`.
3. nginx reverse-proxy, same shape as the waitlist service:
   ```nginx
   location /api/blackboard/ {
       proxy_pass http://127.0.0.1:8788/api/;
       proxy_set_header X-Real-IP $remote_addr;
   }
   ```
4. Back up the database — it's the only durable copy of the coordination
   log once agents migrate off `kapi/blackboard-live.yaml`.

## What's intentionally NOT here (v1 scope)

- No auth on any endpoint — same trust boundary as the rest of the
  blackboard (internal agents/team, bound to localhost, proxied by
  devops). Add a bearer token here the same way `services/waitlist` did
  if this is ever exposed more broadly.
- No CORS headers — add them only if a browser-based consumer on a
  different origin needs this (see waitlist's README for why that
  decision is deferred, not default).
- No WebSocket/SSE push — consumers poll `GET /api/log/:agent` the same
  way `bb read` is polled per `PROTOCOL.md` §3.
