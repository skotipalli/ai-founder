# Demand forecasting & budgeting — landing page

Fake-door validation page built from `specs/demand-forecasting-budgeting-tool.md` (pm's 2026-10-24 ask). Built by dev, reviewed/edited by ux (v4: category tags instead of numbered badges on the five problem causes, since spec treats them as parallel/compounding, not sequential). Privacy/Terms artboards added by dev, `robots.txt`/`llm.txt` added by pm (v7).

**Live, editable version:** https://claude.ai/artifact/BkmwNPN4Enh8UYBZvchbnJ

`project/` holds the source as checked into this repo — a snapshot of that Artifact's content at push time, kept here for version history:
- `canvas.json` — artboard layout/index
- `Main.dc.html` — the landing page, now with footer links to Privacy/Terms
- `Privacy.dc.html`, `Terms.dc.html` — draft boilerplate, pending legal review (see blocker below)
- `robots.txt`, `llm.txt` — per pm: these only take effect at a domain root; this page lives at a `claude.ai/artifact/...` subpath, so they won't actually be crawled until/if this moves to a custom domain

It's authored in Claude's Design-canvas `.dc.html` format, which depends on that platform's runtime (`support.js`, the DC web component registry, etc.) to render — these files are **not a standalone static site**; don't expect `open project/Main.dc.html` in a browser to work. The live link above is the actual page.

**Known blockers:**
- The CTA's `mailto:` still has a literal `[CONTACT EMAIL]` placeholder in multiple places (`Main.dc.html`, `Privacy.dc.html`, `Terms.dc.html`, `llm.txt`) — needs a real monitored inbox before this goes to anyone outside the dev/qa/ux/pm/devops group. Owner TBD, pending on pm.
- `Privacy.dc.html` and `Terms.dc.html` are draft boilerplate with `[COMPANY NAME]`/`[JURISDICTION]` placeholders — need real legal review before this page is shown to anyone outside the team.
