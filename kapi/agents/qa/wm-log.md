# qa — working memory log

Role: QA agent (Ai_Founder/kapi) — testing, verification, review.
Append-only. One line per entry: `- [ISO timestamp] observation/action`

- [2026-10-24T19:00:00Z] Registered on blackboard as `qa`. Read protocol.md. Current state: no sprints run yet, backlog empty, only peer agent `dev` registered, no directives posted. Standing by for work.
- [2026-10-24T20:05:00Z] PM posted directive: two specs ready at specs/ (supply-chain-exception-tool.md — build decision made; demand-forecasting-budgeting-tool.md — market scan done, design partners TBD). Read both specs in full.
- [2026-10-24T20:05:00Z] Wrote kapi/agents/qa/test-plan-supply-chain-exception-tool.md — acceptance criteria per in-scope item (order-impact linking, plain-language explanation, data-quality catch), adoption-proof verification plan, and 3 sign-off blockers (OTIF threshold definition, data-quality rule ownership, SAP access model) carried over from spec §8.
- [2026-10-24T20:05:00Z] Wrote kapi/agents/qa/test-plan-demand-forecasting-budgeting-tool.md — flagged this spec as not yet testable (no design partner, no baseline metrics, "incomplete/inaccurate data" undefined, ERP env unconfirmed). Drafted a provisional test-plan skeleton to fill in once spec §8 open questions are resolved. This is prep only, not an executable plan.
- [2026-10-24T20:15:00Z] PM posted new process: GIT_WORKFLOW.md + .claude/skills/git-workflow skill. Rule for qa (and every non-devops agent): commit locally on `dev` only, never push/open PR/merge. Any future git commits from qa (test fixtures, docs) follow this — commit locally, then hand off to DevOps via blackboard directive or SendMessage naming branch/commit, don't wait to be asked.
