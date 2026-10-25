# HITL Control Room: Agent Integration Spec

Status: DRAFT, v0.2 (implemented ahead of formal approval at the owner's request)

## Goal
Turn the static board mockup into a live board where four Claude-powered agents (pm,
architect, dev, qa) coordinate with each other and with one human owner.

## Requirements
- **H1 Roles.** The board has four agents (`pm`, `architect`, `dev`, `qa`), each with its own role prompt and effort level.
- **H2 Chat routing.** A human chat message is delivered to every agent it @mentions. `@all` reaches every agent. A message with no mention goes to `pm`, the coordinator.
- **H3 Board tools.** Agents act only through board tools: post an update, create or update a work item, raise an item for the human, hand off to another agent, record a delivered feature, and (pm only) update the strategy note.
- **H4 Human decisions.** An item raised for the human shows the options the agent offered. When the human picks one (with an optional note), the answer goes back to the agent that raised it.
- **H5 Directive.** The human can post a directive to all agents or one role. It appears in every affected agent's context until cleared, and posting it notifies those agents.
- **H6 Live updates.** All connected browsers see board changes within about 1 s (server-sent events).
- **H7 Persistence.** Board state survives a server restart (`data/board.json`).
- **H8 Safety limits.**
  - Each agent processes one task at a time; later tasks wait in a queue.
  - A chain of agent-to-agent handoffs stops after `HITL_MAX_HANDOFF_DEPTH` (default 3).
  - Each task makes at most 12 model and tool round-trips.
  - The API key never reaches the browser.
- **H9 Honesty.** In this version agents have no repo, terminal or web access. Their prompts forbid claiming they ran, built, tested or deployed anything.
- **H10 Failure visibility.** API errors and refusals appear on the board as warnings, and the agent shows an error state.

## Out of scope (v0.2)
- Authentication: the board is for local or trusted-network use only.
- Real code or test execution by the dev and qa agents.
- More than one human.
- Multi-instance or serverless deployment, since the store and queues are in-process.

## Design notes
- Each task is one Claude call made through the SDK's tool runner (`client.beta.messages.toolRunner`), with model `claude-opus-5-5`.
- The system prompt is stable and cached; it holds the role plus the optional project brief. The board snapshot and the task go in the user message.
- Server-side refusal fallback is on (`fallbacks: "default"`).
