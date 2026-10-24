# QA Test Plan — Supply Chain Exception & Data-Quality Tool

Source: `specs/supply-chain-exception-tool.md` (Status: Draft, build decision made)
Prepared by: qa · 2026-10-24

## Status
Spec is build-ready (decision made in §4, scope fixed in §5). Test plan below is
written against v1 scope and can be executed as soon as dev has a testable build.

## Acceptance criteria by scope item (spec §5)

### 1. Order-impact linking
- Given a late/at-risk production order, tool correctly traces it to every
  customer order it puts at OTIF risk (no missed links, no phantom links).
- Test with: known-good trace (manually verified ground truth from SAP),
  an order with zero downstream customer impact (must not false-positive),
  an order with multiple downstream customer orders (must not truncate).
- **Open risk (spec §8):** "at risk of missing OTIF" has no precise definition
  yet. QA cannot write pass/fail thresholds for this until dev/PM defines the
  rule. Flag back to PM/dev before this criterion can be signed off.

### 2. Plain-language exception explanation
- Every raw SAP exception type Tracy currently sees must map to a 1-2 sentence
  explanation (coverage test — enumerate exception types in scope).
- Explanation must be factually traceable to the underlying SAP fields (no
  hallucinated cause) — spot-check a sample against raw data each test pass.
- Readability/trust check: have Tracy review a sample batch and confirm the
  explanation matches what she'd have concluded manually (ties to §7
  qualitative bar).

### 3. Data-quality catch (e.g., obsolete-coded-active items)
- Seed test data with known bad records (modeled on the $420K obsolete-
  packaging case) and confirm the tool flags them before Allan's report ships.
- False-negative test: confirm it doesn't miss known-bad categories.
- False-positive test: confirm it doesn't flag legitimately-active items —
  this is the trust-eroding failure mode called out in §8's OTIF risk, same
  principle applies here.
- **Open risk (spec §8):** rule ownership/maintenance as master-data
  categories evolve is unresolved — QA should re-run this suite whenever
  rules change, not just once.

## Out-of-scope guardrail tests
- Confirm the tool does not attempt automated remediation (spec §5) — any
  write-back to SAP is a scope violation, not just a bug.
- Confirm no data sources beyond Tracy's/Allan's existing SAP workflow are
  silently pulled in.

## Adoption-proof verification (spec §7)
- **Timing study:** QA to help instrument/measure Tracy's Monday review and
  Allan's Tuesday report duration pre- and post-tool under realistic
  conditions (not a cherry-picked easy week). Target: 4h → 45min.
- **Usage logs:** confirm logging/instrumentation exists from day one of
  rollout so the 2-week unprompted-usage check (§7) is actually measurable —
  this needs to be built in, not bolted on after.
- **Qualitative:** QA to coordinate the trust-quote collection from the team
  lead as part of UAT sign-off, not as a separate afterthought.

## Blockers for full sign-off
1. "At-risk of missing OTIF" threshold definition (spec §8) — needed before
   order-impact-linking test can have real pass/fail criteria.
2. Data-quality rule ownership (spec §8) — needed to define regression cadence.
3. SAP access model (read-only vs. formal integration, spec §8) — affects
   whether QA can test against live-like data or needs a sandboxed extract.

Until (1)-(3) are resolved, QA can test structurally (does it trace, does it
flag, does it explain) but cannot certify accuracy thresholds.
