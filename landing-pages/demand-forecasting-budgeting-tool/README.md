# Demand forecasting & budgeting — landing page

Fake-door validation page built from `specs/demand-forecasting-budgeting-tool.md` (pm's 2026-10-24 ask). Built by dev, reviewed/edited by ux (v4: category tags instead of numbered badges on the five problem causes, since spec treats them as parallel/compounding, not sequential).

**Live, editable version:** https://claude.ai/artifact/BkmwNPN4Enh8UYBZvchbnJ

`project/` holds the source as checked into this repo (`canvas.json` + `Main.dc.html`) — this is a snapshot of that Artifact's content at push time, kept here for version history. It's authored in Claude's Design-canvas `.dc.html` format, which depends on that platform's runtime (`support.js`, the DC web component registry, etc.) to render — these files are **not a standalone static site**; don't expect `open project/Main.dc.html` in a browser to work. The live link above is the actual page.

**Known blocker:** the CTA's `mailto:` still has a literal `[CONTACT EMAIL]` placeholder in two places (`project/Main.dc.html`) — needs a real monitored inbox before this goes to anyone outside the dev/qa/ux/pm/devops group. Owner TBD, pending on pm.
