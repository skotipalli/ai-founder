# HITL Control Room

A live human-in-the-loop board where four Claude agents (**pm**, **architect**, **dev**, **qa**)
coordinate with each other and with you. Requirements are in [SPEC.md](SPEC.md).

## Run it

```powershell
npm install
copy .env.example .env.local   # then set ANTHROPIC_API_KEY (or run `ant auth login`)
npm run dev                    # http://localhost:3000
```

## Using the board

| You do | What happens |
|---|---|
| Chat `@architect design the intake API` | Delivered to the architect, who works on it and posts updates |
| Chat without a mention | Goes to **pm**, who answers or routes it |
| Chat `@all …` | Every agent gets it |
| Click an option on a **Needs your attention** item | Your answer, plus any note, goes back to the agent that asked |
| Post a **Directive** | Pinned in every affected agent's context and sent to them now. Clear it to unpin. |
| **Reset** on an agent in error | Clears the error so its queue can run again |

Agents can hand work to each other. A hand-off chain stops after `HITL_MAX_HANDOFF_DEPTH`
(default 3), so they can't loop forever. Each agent works one task at a time and queues the rest.

## How it works

```
Browser ──POST /api/chat, /api/attention/:id, /api/directive──▶ Next.js route handlers
   ▲                                                                 │ dispatch(task)
   │ SSE /api/board/stream                                           ▼
   └──────────── board store (memory + data/board.json) ◀── per-agent queue → Claude (tool runner)
                                                                   tools: post_update, upsert_work_item,
                                                                   raise_for_human, hand_off,
                                                                   record_feature, update_strategy (pm)
```

| Path | What |
|---|---|
| `lib/server/runner.ts` | Per-agent queues. Each task is one `client.beta.messages.toolRunner` call (`claude-opus-5-5`). |
| `lib/server/tools.ts` | The board tools agents can call (Zod-validated) |
| `lib/server/prompts.ts` | Role prompts, cached, plus the board snapshot sent with each task |
| `lib/server/store.ts` | Board state, change events, persistence to `data/board.json` |
| `app/api/*` | Chat, attention answers, directive, agent reset, board snapshot and SSE stream |
| `components/*` | The board UI, driven by live state |

## Configuration (`.env.local`)

| Variable | Default | |
|---|---|---|
| `ANTHROPIC_API_KEY` | none | Server-side only |
| `HITL_MODEL` | `claude-opus-5-5` | Model for every agent |
| `HITL_PROJECT` / `HITL_OWNER` | `FNOL Processor` / `Owner` | Shown in the header and given to the agents |
| `HITL_PROJECT_BRIEF` | none | A file every agent reads as background, e.g. `../PROTOCOL.md` |
| `HITL_MAX_HANDOFF_DEPTH` | `3` | Agent-to-agent hand-off limit |

Effort per role is set in `runner.ts`: architect `high`, the others `medium`.
Server-side refusal fallback (`fallbacks: "default"`) is on. Remove it in `runner.ts` if you don't want it.

## Limits (v0.2)

- **No repo or tool access.** Agents plan, design and write code in chat, but can't run, test or deploy it.
  The next step is giving dev and qa real tools, for example repo read access or a sandboxed test runner.
- **No authentication.** Run it locally or on a trusted network only.
- **Single process.** State and queues live in memory, so serverless or multi-instance hosting won't work.
- **Cost.** Every message, hand-off and answer is a Claude call billed to your key.
  Delete `data/board.json` to reset the board.
