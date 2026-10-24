# UX Notes: Supply Chain Exception & Data-Quality Tool

- **Status:** Draft — strawman for review with Tracy/Allan, not final
- **Author:** ux (kapi blackboard agent)
- **Against spec:** `specs/supply-chain-exception-tool.md` (build decision made, v1 scope locked)
- **Last updated:** 2026-10-24

## 1. Design principle, before any screen

The #1 risk in the spec (§8) is false positives eroding trust in week one.
Everything below is designed around **trust calibration**, not just getting
data on screen:

- Every flag shows *why*, not just *what* — the evidence, not a bare alert.
- Nothing auto-resolves. Explain + flag only (matches scope §5 — no automated
  remediation).
- A visible, one-click way to say "not relevant" on any flag, feeding a
  running false-positive signal the team can see improve week over week.
  Without this, week-one noise has no way to get better and trust never
  recovers.

## 2. Two flows, not one tool

Tracy and Allan don't share a workflow today (Monday exception review vs.
Tuesday inventory report) — design two focused flows, not a single generic
dashboard they both have to adapt to.

### Flow A — Tracy's Monday exception review

1. **Triage queue** (replaces manual digging): exceptions ranked by business
   impact, not SAP's raw order. Top of list = exceptions actually linked to
   an at-risk customer OTIF commitment.
2. **Exception card** — collapsed state shows the plain-language explanation
   (scope §5.2) in 1-2 sentences: what happened, why it matters. This is the
   thing that replaces the 4-hour manual reconstruction.
3. **Expand → impact trace** (scope §5.1): the production order → which
   customer order(s) → OTIF risk, shown as a short chain, not a raw table
   join. Tracy should be able to see *this late order threatens these 2
   customer commitments* without clicking through SAP screens.
4. **Per-card action:** acknowledge / escalate / mark not-relevant. Marking
   not-relevant is the false-positive feedback input from §1.

### Flow B — Allan's Tuesday inventory report

1. **Report view, same shape as today** — don't force Allan into a new
   mental model of "exceptions"; his output is still a report.
2. **Inline data-quality flags** (scope §5.3) sit next to the specific rows
   they affect, not in a separate panel he has to remember to check — e.g.
   the obsolete-packaging-coded-active row is flagged in place, with the
   $ impact shown so he can judge materiality at a glance.
3. **Pre-ship gate:** flags must be visibly resolved (accepted or dismissed)
   before the report is marked ready to send — this is what makes the catch
   happen *before* ship, which is the entire point (spec §1.2), not an
   optional side panel he can ignore under time pressure.

## 3. Shared components (build once, used by both flows)

- **Plain-language explainer** — same rendering logic behind Tracy's
  exception cards and Allan's inline flags.
- **Evidence drawer** — the "show your work" view: raw SAP fields and the
  rule/logic that fired, one click away from any explanation. For the
  skeptical first-week user who wants to verify before trusting.
- **Not-relevant / dismiss** — same interaction and same feedback pipeline
  in both flows.

## 4. Instrumentation the UI must support (ties to spec §7 adoption proof)

- Session start/end timestamps per flow, so the timing study (4h → 45min
  target) can be measured from real usage, not self-report.
- Dismiss/acknowledge/escalate counts per user per week, for the "did they
  keep using it unprompted" usage-log check.
- A lightweight way to capture Tracy/Allan's own words in-product (e.g. an
  optional one-line feedback box on dismiss) — feeds §7's qualitative bar
  directly instead of chasing it after the fact.

## 5. Open items before wireframes go further

- Need real SAP exception/alert field samples (shapes what's actually
  renderable in the explainer vs. what needs a human to interpret).
- "At risk of OTIF" threshold is a product/data decision (spec §8), but UX
  needs to know whether it's binary or a confidence range — changes whether
  the triage queue needs a confidence indicator per item.
- This doc is a strawman. Next step is walking it past Tracy and Allan
  directly before locking anything — they're the design partners, not me.

## 6. Explicitly not designing yet

No work started on visual/interaction design for the demand-forecasting
tool (see wm-log) — its design partners and scope are still open per
spec §8/§9 there. Revisit once those land.
