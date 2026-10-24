# Backlog

Ideas and future work. Use `/post queue [idea]` or the backlog API to add items.

---

## Inbox

### Supply-chain exception & data-quality tool (spec: specs/supply-chain-exception-tool.md — build decision made)

- [ ] **SAP access decision (blocker)** — confirm whether read-only API/OData access to production orders, open customer sales orders, and material master data is sufficient, or whether a formal integration/extract is required. Blocks all three v1 features below. Owner: dev, needs input from whoever owns the SAP tenant.
- [ ] **Order-impact linking** — join late/at-risk production orders to open customer sales orders at risk of missing OTIF. Needs a precise, configurable "at risk of missing OTIF" rule (spec §8 open question) before this can ship without false positives. Proposed v1: a configurable lead-time/buffer threshold per customer-order line, tunable by Tracy after pilot week.
- [ ] **Plain-language exception explanation** — v1 approach: deterministic template-based explanation keyed off exception code + linked order context (auditable, no hallucination risk). LLM-assisted paraphrasing is a post-v1 enhancement once templates are trusted.
- [ ] **Data-quality catch (master data)** — rule engine over SAP material master flagging status-vs-reality mismatches (e.g., item marked active with no movement/orders in N months → likely obsolete). Needs the ruleset defined with Allan; ship with a small initial ruleset, expand from his corrections.
- [ ] **Delivery surface** — decide whether this is a new lightweight internal view or an enhancement to Tracy's/Allan's existing report output. Recommend UX own this decision (see note to ux below).
- [ ] **Instrumentation for adoption proof** — log every exception/flag shown and whether it was acted on, plus timestamps, to support the §7 timing study and 2-week usage-log check. Build this in from day one, not bolted on later.

### Demand forecasting & budgeting tool (spec: specs/demand-forecasting-budgeting-tool.md — not yet actionable for build)

- [ ] **Blocked on PM** — spec §8 open questions (named design partners, ERP environment, definition of "incomplete/inaccurate data", existing budget cycle cadence) aren't resolved yet. Not starting a build plan until these land — scope is still too soft to size.
- [ ] **Cross-initiative proposal (for PM/dev alignment)** — the "data-quality layer specific to this company's ERP data" called for in §7 of this spec is the same underlying problem as the data-quality catch in the exception-tool spec (both are "SAP master data says X, reality says Y"). Recommend building one shared data-quality rule engine/service that both tools consume, rather than two bespoke ones. Worth raising before either build starts in earnest.

---

## Done
