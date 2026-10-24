# Spec: Supply Chain Exception & Data-Quality Tool

- **Status:** Draft
- **Owner:** Srinivas Kotipalli
- **Last updated:** 2026-10-24

## 1. Problem

Tracy and Allan lose hours every week to two compounding issues on top of SAP:

1. **Exception triage is manual and slow.** Tracy's Monday exception review and
   Allan's Tuesday inventory report each take ~4 hours of manual digging to
   figure out what's actually wrong and what it affects downstream.
2. **Data quality errors hide inside "normal" SAP data.** E.g., $420K of
   obsolete packaging was coded as active, silently distorting inventory and
   planning decisions until someone happens to catch it by hand.

Neither issue is a forecasting-accuracy problem. Both are "the data and the
exceptions exist, but no one has time to connect them to business impact."

## 2. Users

| Persona | Role | Current workflow | Pain |
|---|---|---|---|
| Tracy | Exception review owner | Monday exception review, ~4h manual | Can't quickly tell which exceptions matter (e.g., which late production order actually threatens a customer OTIF commitment) |
| Allan | Inventory reporting owner | Tuesday inventory report, ~4h manual | Can't quickly catch bad/obsolete master data polluting the report before it goes out |

These two are the design partners for this build — their before/after time and
their own words are the adoption proof (see §7).

## 3. Market context (from initial scan)

- AI-in-supply-chain market ≈ $13.9B (2025), growing ~20%/yr. Vendor-cited
  forecasting gains (20–50% lower forecast error, 20–30% lower inventory) are
  **upper-bound benchmarks, not commitments** — not the basis for our ROI case.
- Buy options that fit this problem space (SAP IBP, Kinaxis, o9, Anaplan) are
  module-licensed, quote-only, multi-month implementations. They target
  forecasting/planning broadly, not this specific triage + data-quality pain.
- **SAP is the real competitor**, not the standalone vendors. SAP is adding
  Joule agents to IBP for exception analysis, root-cause, and production-order
  checks. This tool must either do something Joule/IBP doesn't, or serve as
  the bridge until IBP ships that capability for us.

## 4. Decision

**Build a narrow internal tool on top of our existing SAP data**, not buy a
suite. Rationale:
- Buy options take months and don't target this specific pain.
- The win conditions below are a thin, well-scoped slice — not a full
  planning/forecasting system — which is tractable to build and iterate on
  fast with two design partners already in hand.
- Revisit "buy" when SAP IBP + Joule actually ships the equivalent exception
  root-cause capability for our tenant — track this explicitly (see §9).

## 5. Scope — where this tool wins

In scope, v1:

1. **Order-impact linking:** Given a late/at-risk production order, trace it
   to the customer orders it puts at risk of missing OTIF, so Tracy sees
   business impact, not just a raw exception.
2. **Plain-language exception explanation:** Turn a raw SAP exception/alert
   into a one- or two-sentence explanation of what happened and why it
   matters, so triage doesn't require someone to reconstruct context by hand.
3. **Data-quality catch:** Detect master-data errors that distort
   planning/inventory numbers (e.g., obsolete items coded active), surfaced
   before Allan's report ships, not after.

Out of scope, v1:
- Forecasting/demand planning algorithms (that's IBP/Kinaxis/o9 territory).
- Automated remediation — the tool explains and flags; a human still decides.
- Any data source beyond what's already in SAP for Tracy's and Allan's
  current workflows.

## 6. North Star

Time from "exception/report workflow starts" to "Tracy/Allan have a trusted,
actionable answer." Target: **4 hours → 45 minutes** for the Monday exception
review and Tuesday inventory report.

## 7. Adoption proof plan

- **Timing study:** measure Tracy's Monday review and Allan's Tuesday report
  duration before the tool (baseline) and after (target 45 min), same tasks,
  same people.
- **Usage logs:** two weeks of real usage after rollout — did they actually
  keep using it unprompted.
- **Qualitative:** a direct quote from the team lead on whether it's trusted
  enough to rely on.

This is the bar for "adopted," not just "shipped."

## 8. Open questions / risks

- Access/permissions to the SAP data needed for order-impact linking — is
  read access sufficient, or do we need a formal integration?
- How do we define "at risk of missing OTIF" precisely enough to avoid
  false positives that erode trust in week one?
- Who maintains the data-quality rules (e.g., "obsolete packaging") as SAP
  master data categories evolve?

## 9. Build vs. buy tripwire

Re-evaluate buying (SAP IBP + Joule) if/when Joule ships exception
root-cause + production-order impact analysis for our tenant with coverage
equivalent to §5. Owner: revisit at next SAP roadmap review.
