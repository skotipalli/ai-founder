#!/usr/bin/env python3
"""Waitlist API for the demand-forecasting-budgeting-tool landing page.

Stdlib only (http.server + sqlite3) -- no pip install needed on the host.

Endpoints:
  POST /api/waitlist           {name, email, role, company?, note?} -> 201 {"status": "ok"}
  GET  /api/waitlist/count                                          -> 200 {"count": N}
  GET  /api/admin/waitlist     requires `Authorization: Bearer <WAITLIST_ADMIN_TOKEN>`
                                -> 200 [{id, name, email, role, company, note, created_at}, ...]

Run:
  WAITLIST_DB=/var/lib/waitlist/waitlist.db WAITLIST_PORT=8787 \
  WAITLIST_ADMIN_TOKEN=<a real secret> python3 server.py

If WAITLIST_ADMIN_TOKEN is unset, /api/admin/waitlist is disabled (503) rather
than left open -- signups still work either way.

Binds to 127.0.0.1 only -- put nginx in front, reverse-proxying /api/ to this
port on the same origin as the static page, so the browser needs no CORS
headers. See README.md for the nginx/systemd setup.
"""
import hmac
import json
import os
import re
import sqlite3
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

DB_PATH = os.environ.get("WAITLIST_DB", "waitlist.db")
PORT = int(os.environ.get("WAITLIST_PORT", "8787"))
ADMIN_TOKEN = os.environ.get("WAITLIST_ADMIN_TOKEN")  # None = admin endpoint disabled
MAX_BODY_BYTES = 8192
RATE_LIMIT_PER_HOUR = 5

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
ROLES = {
    "Production planners",
    "Supply chain managers",
    "Procurement teams",
    "Finance teams",
}

_submissions_by_ip = {}  # ip -> list[timestamp]; reset on restart, good enough for v1


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS waitlist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            role TEXT NOT NULL,
            company TEXT,
            note TEXT,
            created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        )
        """
    )
    conn.commit()
    conn.close()


def is_rate_limited(ip):
    now = time.time()
    hits = [t for t in _submissions_by_ip.get(ip, []) if now - t < 3600]
    if len(hits) >= RATE_LIMIT_PER_HOUR:
        _submissions_by_ip[ip] = hits
        return True
    hits.append(now)
    _submissions_by_ip[ip] = hits
    return False


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _is_authorized_admin(self):
        if not ADMIN_TOKEN:
            return False
        auth = self.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return False
        return hmac.compare_digest(auth[len("Bearer "):], ADMIN_TOKEN)

    def do_GET(self):
        if self.path == "/api/waitlist/count":
            conn = sqlite3.connect(DB_PATH)
            count = conn.execute("SELECT COUNT(*) FROM waitlist").fetchone()[0]
            conn.close()
            self._send_json(200, {"count": count})
        elif self.path == "/api/admin/waitlist":
            if not ADMIN_TOKEN:
                self._send_json(503, {"error": "admin endpoint not configured"})
                return
            if not self._is_authorized_admin():
                self._send_json(401, {"error": "unauthorized"})
                return
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                "SELECT id, name, email, role, company, note, created_at "
                "FROM waitlist ORDER BY created_at DESC"
            ).fetchall()
            conn.close()
            self._send_json(200, [dict(r) for r in rows])
        else:
            self._send_json(404, {"error": "not found"})

    def _client_ip(self):
        # Trust X-Real-IP: this service only binds to 127.0.0.1, so the only
        # thing that can set this header is the local nginx proxy in front of
        # it (see README) -- an external client can't reach this port to spoof
        # it directly. Without this, self.client_address is always nginx's own
        # loopback address behind proxy_pass, which would turn the per-IP rate
        # limit into one shared site-wide bucket.
        return self.headers.get("X-Real-IP") or self.client_address[0]

    def do_POST(self):
        if self.path != "/api/waitlist":
            self._send_json(404, {"error": "not found"})
            return

        if is_rate_limited(self._client_ip()):
            self._send_json(429, {"error": "too many requests, try again later"})
            return

        length = int(self.headers.get("Content-Length", 0))
        if length <= 0 or length > MAX_BODY_BYTES:
            self._send_json(400, {"error": "invalid request body"})
            return

        try:
            data = json.loads(self.rfile.read(length))
        except json.JSONDecodeError:
            self._send_json(400, {"error": "invalid JSON"})
            return

        name = str(data.get("name", "")).strip()[:200]
        email = str(data.get("email", "")).strip().lower()[:320]
        role = str(data.get("role", "")).strip()
        company = str(data.get("company", "")).strip()[:200] or None
        note = str(data.get("note", "")).strip()[:2000] or None

        if not name or not EMAIL_RE.match(email) or role not in ROLES:
            self._send_json(400, {"error": "name, a valid email, and role are required"})
            return

        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute(
                "INSERT INTO waitlist (name, email, role, company, note) VALUES (?, ?, ?, ?, ?)",
                (name, email, role, company, note),
            )
            conn.commit()
            self._send_json(201, {"status": "ok"})
        except sqlite3.IntegrityError:
            self._send_json(200, {"status": "already on waitlist"})
        finally:
            conn.close()

    def log_message(self, fmt, *args):
        pass  # quiet by default; run under systemd/journald for request logs


if __name__ == "__main__":
    init_db()
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"waitlist service listening on 127.0.0.1:{PORT}, db={DB_PATH}")
    server.serve_forever()
