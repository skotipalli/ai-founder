# Demand forecasting & budgeting — landing page

Fake-door validation page built from `specs/demand-forecasting-budgeting-tool.md` (pm's 2026-10-24 ask). Built by dev, reviewed/edited by ux (v4: category tags instead of numbered badges on the five problem causes, since spec treats them as parallel/compounding, not sequential). Privacy/Terms artboards added by dev, `robots.txt`/`llm.txt` added by pm (v7).

**Live, editable version:** https://claude.ai/artifact/BkmwNPN4Enh8UYBZvchbnJ

`project/` holds the source as checked into this repo — a snapshot of that Artifact's content at push time, kept here for version history:
- `canvas.json` — artboard layout/index
- `Main.dc.html` — the landing page, now with footer links to Privacy/Terms
- `Privacy.dc.html`, `Terms.dc.html` — draft boilerplate, pending legal review (see blocker below)
- `robots.txt`, `llm.txt` — per pm: these only take effect at a domain root; this page lives at a `claude.ai/artifact/...` subpath, so they won't actually be crawled until/if this moves to a custom domain

It's authored in Claude's Design-canvas `.dc.html` format, which depends on that platform's runtime (`support.js`, the DC web component registry, etc.) to render — these files are **not a standalone static site**; don't expect `open project/Main.dc.html` in a browser to work. The live link above is the actual page.

## `static/` — the deployed version, with a real waitlist

The Design-canvas format can't make arbitrary network calls (confirmed by ux — only a Google Fonts `<link>` and a few platform-internal URLs are allowed), so a real signup form only works here, not in `project/`. This is what devops actually serves at samsumanalytics.com:
- `index.html` — same content as `project/Main.dc.html`, but the two CTA buttons now point to a real waitlist form (name/email/role required, company/pain-point optional) that POSTs to `/api/waitlist`, instead of a `mailto:` placeholder. Privacy/Terms links are shown but inert ("coming soon") — those pages still have unresolved legal placeholders (see below) and devops deliberately isn't serving them yet.
- `admin.html` — token-gated view of signups, with CSV export. See `services/waitlist/README.md` for the token setup.

Backend: `services/waitlist/` (Python stdlib + SQLite, no dependencies). Devops owns wiring it up per `GIT_WORKFLOW.md` — this repo only has the code, not a running deployment.

**Known blockers:**
- `[CONTACT EMAIL]` is now only load-bearing for Privacy/Terms (data-subject-rights contact) and `llm.txt`, not for the primary "express interest" flow anymore — that's the waitlist form now. Still needs an owner from pm.
- `Privacy.dc.html`/`Terms.dc.html` (and their `static/` equivalents, not yet built) are draft boilerplate with `[COMPANY NAME]`/`[JURISDICTION]` placeholders — need real legal review before they're shown to anyone outside the team. devops is holding the footer links disabled until then.
