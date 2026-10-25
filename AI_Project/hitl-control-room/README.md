# HITL Control Room (Next.js)

A Next.js (App Router, TypeScript) port of the "HITL · MemoryManager" board mockup:
a human-in-the-loop dashboard for people and agents.

```bash
npm install
npm run dev     # http://localhost:3000
```

## Structure

| Path | What |
|---|---|
| `app/layout.tsx` | Root layout and fonts (via `next/font`, self-hosted at build time) |
| `app/page.tsx` | The board (server component) |
| `app/globals.css` | Design tokens (light and dark) and styles carried over from the mockup |
| `lib/board-data.ts` | Typed sample data. Replace this with a real data source. |
| `components/StaticPanels.tsx` | Work in progress, features, roster, strategy (server components) |
| `components/AttentionContext.tsx` | Client state for resolved items, shared by the summary counts and the attention list |
| `components/SummaryStrip.tsx`, `AttentionPanel.tsx` | Live counts, plus Resolve → "Handled" |
| `components/ChatPanel.tsx` | Feed filter tabs and the local-only chat composer |
| `components/DirectivePanel.tsx` | Directive form (mockup; nothing is sent) |

## Behaviour (same as the mockup)

- Clicking an action in **Needs your attention** marks the item handled and updates the summary counts.
- The **Chat** tabs filter the feed. Messages you send appear only in your browser tab.
- **Post directive** only shows a status message.

None of the buttons call a backend yet. To make the board real, replace `lib/board-data.ts`
with fetched data, and back the chat, directive and resolve actions with Server Actions or API routes.
