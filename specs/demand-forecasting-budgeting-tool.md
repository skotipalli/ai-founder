# Spec: AI-Powered Demand Forecasting & Budgeting Solution

- **Status:** Draft (market scan complete — see §7)
- **Owner:** Srinivas Kotipalli
- **Last updated:** 2026-10-24

## 1. Problem

The product manufacturing unit struggles to forecast demand accurately and
plan its budget. Root causes called out:

1. **Inaccurate demand forecasts** — downstream production and budget plans
   inherit the error.
2. **Fluctuating raw material prices** — cost estimates go stale quickly.
3. **Weather and political issues affecting raw material procurement** —
   supply-side shocks that forecasts and budgets don't account for.
4. **Incomplete or inaccurate data** — inputs to forecasting/budgeting are
   themselves unreliable.
5. **Production capacity constraints** — plans that ignore real capacity
   limits aren't executable.

These compound: a demand forecast built on bad data, blind to raw-material
volatility and capacity limits, produces a budget that's wrong in multiple
directions at once — and nobody can tell which factor is driving the miss.

## 2. Four pillars (2×2)

| | **Problem** | **User** |
|---|---|---|
| | Inaccurate demand forecasts, volatile raw material prices, weather/political procurement risk, incomplete/inaccurate data, and capacity constraints compound into a budget wrong in multiple directions at once. | Production planners, supply chain managers, procurement teams, finance teams — each working off separate, disconnected views of demand, cost, and capacity today. |
| | **Northstar** | **Persona** |
| | Forecast-to-budget cycle: time to produce a trusted number, plus forecast error (MAPE) and budget variance vs. actual. Target TBD pending baseline. | **Open gap** — no named design partners yet (unlike Tracy/Allan on the exception-tool initiative); currently only a role list, not people who can anchor adoption proof. |

## 3. Users

| Persona | Needs from this solution |
|---|---|
| Production planners | A demand forecast they can plan production runs against, aware of capacity constraints |
| Supply chain managers | Visibility into procurement risk (price, weather, political) feeding into the plan |
| Procurement teams | Cost estimates that reflect current/projected raw material price movement |
| Finance teams | A budget estimate that ties back to the same forecast/plan, not a separate guess |

Open question: is there a single primary persona/owner of this workflow
end-to-end, or do these four hand off to each other today? That shapes
whether this is one tool or a shared forecast feeding four different views.

## 4. Proposed scope

Core loop: **predict demand → plan production (within capacity) → estimate
cost/budget**, with the specific failure modes above addressed directly:

1. **Demand forecasting** — model demand with explicit handling of the
   "incomplete/inaccurate data" problem (data-quality checks/flags on inputs,
   not just a forecast number with no confidence signal).
2. **Production planning** — translate the forecast into a plan that respects
   stated production capacity constraints, surfacing where demand exceeds
   capacity rather than silently overcommitting.
3. **Cost/budget estimation** — tie budget estimates to raw material price
   assumptions that can move (fluctuation ranges, not single-point prices),
   and flag exposure to weather/political procurement risk.

## 5. Out of scope (proposed — confirm)

- Automated procurement execution/ordering — this estimates and flags risk,
  a human still acts on it.
- Multi-plant/multi-region optimization, unless this unit spans multiple
  sites (confirm).

## 6. Success metrics (draft — need baseline data)

- Forecast error reduction (e.g., MAPE before vs. after) — needs current
  baseline from production planners.
- Budget variance reduction (planned vs. actual spend) — needs current
  baseline from finance.
- Time to produce a forecast/budget cycle, before vs. after.

These mirror the kind of benchmarks vendors cite (20–50% forecast error
reduction, 20–30% inventory reduction) — treat those as upper bounds to aim
toward, not commitments, until we have our own baseline.

## 7. Build vs. buy — market scan (2026-10-24)

**Recommendation: don't build the core forecasting engine — buy/reuse
forecasting and commodity-signal engines, build only the integration and
data-quality layer.** Unlike the narrower exception-triage problem in the
separate [[supply-chain-exception-tool]] initiative, demand forecasting *is*
the core competency SAP IBP, Kinaxis, o9, and Anaplan compete on. The gap
isn't "nobody sells demand forecasting" — it's that no single suite ties
raw-material price/weather/political procurement risk directly into a budget
number for these four personas in one shared view, and none of them fixes
this company's own underlying data-quality problem.

**Market sizing is noisy — low confidence.** Estimates vary ~10x across
market-research aggregator sites depending on scope (from ~$0.82B→$2.2B by
2036 to ~$7.4B→$28.6B by 2034), none from a top-tier research firm — treat
as rough directional signal only, not a figure to cite with precision. The
one benchmark with real provenance is the same McKinsey-cited figure used in
the exception-tool scan: **20–50% lower forecast error, 20–30% lower
inventory** — an upper bound to aim toward, not a promise. Adjacent
McKinsey-cited context: up to 65% fewer stockouts, 25–40% lower admin costs,
5–15% lower procurement spend.

**SAP is the real competitor, and it's moving directly at this problem.**
SAP IBP's 2026 roadmap adds AI demand sensing using external signals
*including weather and economic indicators*, plus Joule-powered scenario
planning that turns a described disruption into supply and
financial-commitment impact — targeted GA Q4 2026. If this unit is on SAP,
the real decision is "build the bridge until Joule lands" vs. "wait."

**Vendor landscape (fit for this specific problem):**
- **SAP IBP** — best fit if already on SAP; 9–18 months to value; weak on
  commodity-price risk as a first-class input *today* (coming 2026).
- **Kinaxis** — strong at supply-disruption response; not finance-led;
  9–15 months to full value.
- **o9 Solutions** — strongest AI demand sensing in manufacturing/CPG
  (Kraft Heinz case: +11–14% forecast accuracy across 7,000 SKUs); 9–18
  months, high cost.
- **Anaplan** — the only one of the four that's finance-native (starts from
  FP&A, adds supply planning); 5–9 months, moderate cost, ~$115K/yr median.
- **Commodity/raw-material price risk is its own specialist category**
  (Mintec, ChAI, Impactive AI) — none of the big four plan production or
  budgets with it as a first-class input today.
- **FP&A/budgeting tools** (Planful, Pigment, Prophix, Jedox, Vena, Cube) —
  general AI-assisted budgeting, none manufacturing- or commodity-specific.

No vendor sells "forecast → capacity-aware production plan → budget tied to
live commodity/weather/political risk → one shared view across these 4
roles" as a single product today. That's the real white space — but it's an
integration/orchestration build, not a from-scratch ML forecasting engine.

**Where a narrow build wins:**
1. Wiring a bought commodity/weather/political risk feed directly into the
   budget estimate as a range, not a single point number.
2. A data-quality layer specific to this company's actual ERP data — no
   vendor sells this; it's inherently company-specific (same shape as the
   $420K obsolete-packaging catch in the other initiative).
3. One shared view across the four personas instead of four separate tool
   configurations.

**Don't build:** the core statistical/ML demand-forecasting model — buy or
reuse what SAP (or another suite) already does reasonably well.

**Sources:** SAP's own 2025/2026 IBP roadmap posts (community.sap.com,
techbrainz.com), o9/Kraft Heinz case data, Bolder SCG's SAP IBP vs.
competitors comparison, TryTrusted's 2026 AI demand forecasting platform
comparison, CubeSoftware's FP&A tools roundup, Aon's commodity price risk
survey. Market-sizing figures came from SEO-style aggregator sites, not
primary research firms — flagged as low-confidence above.

## 8. Open questions

- What ERP/planning systems are already in place for this unit (same SAP
  environment as the exception-tool initiative, or different)?
- What does "incomplete or inaccurate data" mean concretely here — missing
  fields, wrong values, stale data, or something else? Needed to scope the
  data-quality component.
- Is there an existing budget/forecast cycle (monthly, quarterly) this needs
  to fit into?
- Who are the actual named design partners (like Tracy/Allan on the other
  initiative) for this one?

## 9. Next step

Market scan is done (§7). Remaining before this spec is actionable: resolve
the open questions in §8 — especially naming real design partners per
persona and confirming the ERP/data environment.
