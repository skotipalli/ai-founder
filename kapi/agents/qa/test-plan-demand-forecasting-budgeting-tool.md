# QA Test Plan — Demand Forecasting & Budgeting Tool

Source: `specs/demand-forecasting-budgeting-tool.md` (Status: Draft — market
scan done, design partners still open)
Prepared by: qa · 2026-10-24

## Status: not yet testable — prep only

Per the spec's own §9, this is **not actionable** until §8's open questions
are resolved. Unlike the exception-tool spec, there's no build decision, no
named design partner, and no baseline metric. QA cannot write real
acceptance thresholds yet. What follows is a provisional test-plan skeleton
plus the specific blockers QA needs cleared before it can do more.

## Blockers (mirrors spec §8 — QA's read on why each one matters for testing)
1. **No named design partner.** Without a named persona/owner (like
   Tracy/Allan), QA has no one to validate "is this explanation/number
   actually trusted" against — the same qualitative bar used on the
   exception tool (§7 there) has no owner here yet.
2. **No baseline for MAPE / budget variance / cycle time (spec §6).** Can't
   define pass/fail thresholds for forecast error or budget variance without
   a current-state number to improve on.
3. **"Incomplete/inaccurate data" undefined (spec §8).** Is it missing
   fields, wrong values, stale data? The data-quality layer (§7, "where a
   narrow build wins" #2) can't be tested until this is concrete — same
   class of problem as the exception tool's data-quality rules, but with no
   equivalent of the $420K obsolete-packaging example to anchor test cases.
4. **ERP/environment not confirmed.** If it's the same SAP environment as
   the exception-tool initiative, some test infrastructure/sandbox access
   may be reusable — otherwise QA needs a separate environment plan.

## Provisional test-plan skeleton (to flesh out once unblocked)

### Core loop (spec §4)
- Demand forecast → production plan (capacity-aware) → budget estimate.
- Test: a forecast that exceeds stated capacity must surface the overcommit,
  never silently clip or silently overcommit (spec §4.2 explicit requirement).

### Data-quality flags on forecast inputs (spec §4.1)
- Forecast output must carry a confidence/data-quality signal, not just a
  bare number (explicit requirement — "not just a forecast number with no
  confidence signal").
- Test: feed known-bad inputs (once "incomplete/inaccurate" is defined) and
  confirm the flag surfaces rather than silently degrading the forecast.

### Budget tied to commodity/weather/political risk (spec §4.3, §7 "where a
narrow build wins" #1)
- Budget must be expressed as a range tied to live commodity-price
  assumptions, not a single-point number — test that the range updates when
  the underlying risk feed changes, and that it's traceable to which feed/
  assumption drove the range.

### Shared view across 4 personas (spec §7, win condition #3)
- Production planner, supply chain manager, procurement, finance should see
  one consistent number/view, not four divergent tool configurations — test
  for consistency across persona-specific views of the same forecast/budget
  cycle.

### Out-of-scope guardrails (spec §5, proposed)
- No automated procurement execution — flag/estimate only, human acts.
- Confirm single-site scope unless multi-site is explicitly confirmed later.

## Next step for QA
Re-draft this plan once PM/dev resolve spec §8's open questions — especially
the named design partner and the baseline metrics. Until then, this is
prep, not an executable plan.
