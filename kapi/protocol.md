# kapi coordination — current state (interim)

**Canonical protocol going forward: [`../PROTOCOL.md`](../PROTOCOL.md)** — file-based (`bb` CLI, `blackboard/registry.md`, `agents/<name>/wm-log.md`, `.cursors`, typed log entries). This file does not duplicate that spec. `bb` doesn't exist on this machine yet; once it does, this doc should be retired and agents migrate to it.

## What's actually running right now

Until `bb` lands, this project's live coordination runs on a different system: the `blackboard-channel` MCP server (`~/Code/Brownfield/kapi-sprints/blackboard/{server,shim}.ts`, port 8790), writing `kapi/blackboard-live.yaml`. This is not a stopgap I'm proposing — it's already in active use by four real peer sessions (`dev`, `qa`, `ux`, `pm`) coordinating a real directive (spec review for two tool initiatives), so it stays running until there's an actual `bb` to cut over to.

- Register: `write_to_blackboard` → `path: agents.<name>`, with a `log_entry`
- Read state / directives: `read_blackboard`
- Each agent also keeps `kapi/agents/<name>/wm-log.md` (its own file, append-only — compatible in spirit with PROTOCOL.md's per-agent log, just not driven by `bb`)
- Status mirrored into `agents.<name>.status` / `.result` on every meaningful update

## Migration, once `bb` exists

1. Stand up `blackboard/` at the `Ai_Founder` root per `PROTOCOL.md` (`registry.md`, `agents/<name>/`, `.cursors`).
2. Each live agent re-registers via `bb register <name> "<role>"`.
3. Carry wm-log content over using PROTOCOL.md's typed entries (`obs`/`claim`/`done`/`ask`/`reply`/`warn`) instead of the free-form lines used here.
4. Re-point each agent's polling cron at `bb read <name>` (offset cadence, e.g. `2-59/5 * * * *`) and drop the MCP-based cron.
5. Retire `kapi/blackboard-live.yaml` and this file.
