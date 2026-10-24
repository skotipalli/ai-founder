# Waitlist service

Backs the design-partner signup form on the demand-forecasting-budgeting-tool
landing page (`landing-pages/demand-forecasting-budgeting-tool/static/index.html`).
Python stdlib only (`http.server` + `sqlite3`) — nothing to `pip install`.

## Why this exists, and why it's separate from the Artifact

The canonical landing page is a Claude Design-canvas Artifact
(https://claude.ai/artifact/BkmwNPN4Enh8UYBZvchbnJ), which can't make
arbitrary network calls from the page itself — ux confirmed the format only
allows a Google Fonts `<link>` and a few platform-internal URLs, no `fetch()`
to a custom API. So a real signup form only works on the **static** copy
that's actually deployed (devops converted it to plain HTML/JS for
samsumanalytics.com). This directory is that form's backend.

## Running it

```sh
WAITLIST_DB=/var/lib/waitlist/waitlist.db WAITLIST_PORT=8787 \
WAITLIST_ADMIN_TOKEN=<a real secret, e.g. `openssl rand -hex 32`> python3 server.py
```

Binds to `127.0.0.1` only — it is not meant to be reachable directly from the
internet.

`WAITLIST_ADMIN_TOKEN` gates `GET /api/admin/waitlist` (checked via
`Authorization: Bearer <token>`, constant-time compare). This is an infra
secret devops generates and sets directly — it isn't blocked on pm/legal the
way `[CONTACT EMAIL]`/`[COMPANY NAME]`/`[JURISDICTION]` are. If the variable
is unset, the admin endpoint returns 503 instead of being open — signups
still work either way. Set it in the systemd unit's `Environment=` line, not
in a file that could end up in git.

## Wiring it up (devops — this part is yours per GIT_WORKFLOW.md)

1. **systemd unit** (adjust paths/user):

   ```ini
   [Unit]
   Description=Waitlist API
   After=network.target

   [Service]
   ExecStart=/usr/bin/python3 /opt/waitlist/server.py
   Environment=WAITLIST_DB=/var/lib/waitlist/waitlist.db
   Environment=WAITLIST_PORT=8787
   Environment=WAITLIST_ADMIN_TOKEN=REPLACE_WITH_A_REAL_SECRET
   Restart=on-failure
   User=waitlist
   WorkingDirectory=/opt/waitlist

   [Install]
   WantedBy=multi-user.target
   ```

2. **nginx**, alongside the existing `samsumanalytics.com` server block:

   ```nginx
   location /api/ {
       proxy_pass http://127.0.0.1:8787/api/;
       proxy_set_header X-Real-IP $remote_addr;
   }
   ```

   Same origin as the static page means the browser's `fetch('/api/waitlist')`
   needs no CORS headers — don't add any unless this ever serves a different
   origin.

3. Make sure `/var/lib/waitlist/` (or wherever `WAITLIST_DB` points) is
   writable by whatever user runs the service, and back it up — it's the
   only copy of waitlist signups; nothing else persists this data.

4. **Admin page**: `static/admin.html` (same directory as `index.html`) reads
   `/api/admin/waitlist` with the token typed into the page — it's not
   linked from the public site's nav, but it's also not secret-by-obscurity:
   the token is the actual gate. Don't put it behind a guessable path if
   this ever matters more than it does for a fake-door test.

## What's intentionally NOT here (v1 scope)

- No admin UI to view signups — query the SQLite file directly
  (`sqlite3 waitlist.db "SELECT * FROM waitlist;"`) until there's a real need
  for one.
- Rate limiting is a naive in-memory per-IP cap (5/hour), reset on every
  restart. Fine for a fake-door test's expected traffic; revisit if this
  page gets real promotion/traffic.
- No email confirmation or double opt-in. If this becomes more than a
  validation test, that's worth adding before real design-partner outreach.
