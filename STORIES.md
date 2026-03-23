# Command Center — Stories & Build Plan

## Audit: Current State

### Working

| Feature | Location | Notes |
|---------|----------|-------|
| Auth / Login | `LoginScreen`, `App.tsx` | Token + Ed25519 device identity handshake works |
| Gateway client | `lib/gateway.ts` | WebSocket connect, reconnect w/ backoff, request/response, event dispatch |
| Agent feed | `useAgents.ts`, `AgentFeed.tsx`, `AgentCard.tsx` | Lists sessions, real-time create/update/remove events, sorted by status |
| Kill agent / kill all | `useAgents.ts` | `sessions.kill` and `sessions.killAll` with confirmation UX |
| Mobile layout | `AppShell`, `BottomNav` | 2-tab shell with safe-area insets |
| Notification permission | `useNotifications.ts` | Requests permission on mount |

### Broken

| Bug | Location | Detail |
|-----|----------|--------|
| Wrong chat event name | `useChat.ts:44` | Subscribes to `"chat.message"` — gateway sends `"chat"` events |
| Wrong send params | `useChat.ts:54` | Sends `{ text }` — protocol expects `{ sessionKey, message, deliver, idempotencyKey }` |
| Treats send response as message | `useChat.ts:56` | `chat.send` returns `{ runId, status: "started" }`, not a ChatMessage |
| No streaming assembly | `useChat.ts` | "chat" events deliver response **chunks** that must be assembled into a complete message |
| Missing sessionKey | `useChat.ts:28` | `chat.history` sent without `sessionKey` param |
| Wrong ChatMessage shape | `types/protocol.ts:79-84` | Type has `sender`/`text` but gateway sends `role`/`content`/`timestamp` |
| Wrong ChatSendParams shape | `types/protocol.ts:86-89` | Has `text`/`channel` but protocol needs `sessionKey`/`message`/`deliver`/`idempotencyKey` |
| Notification event mismatch | `useNotifications.ts:12` | Also subscribes to `"chat.message"` instead of `"chat"` |
| Notifications won't work on iPhone PWA | `lib/notifications.ts` | Uses `new Notification()` (foreground-only) instead of service-worker push |

### Missing (4 of 6 panels not built)

- **Agent Status** — per-agent active/idle/stuck, current task, time on task
- **Metrics** — PR velocity, test counts, Pi health (CPU/RAM/disk), token burn
- **Push Notifications** — service-worker web push (iPhone PWA compatible)
- **Controls** — gateway stop (kill switch), per-agent pause, approve/deny

### Structural gaps

- `BottomNav` only has 2 tabs; needs to support 6 panels
- No `sessionKey` management (create/select/persist)
- No `chat.abort` integration
- No streaming state indicator (typing / thinking)

---

## Epics & Stories

### Epic 1: Fix Chat Protocol (Priority: Critical)

Everything in chat is non-functional due to protocol mismatches. This must land first.

---

#### Story 1.1: Align ChatMessage type with gateway protocol

**What:** Update `ChatMessage` and related types in `types/protocol.ts` to match the actual gateway schema.

**Changes:**
- `ChatMessage`: `sender` -> `role`, `text` -> `content`, `ts` -> `timestamp`; add optional `runId`
- `ChatSendParams`: replace `text`/`channel` with `sessionKey`/`message`/`deliver`/`idempotencyKey`
- `ChatHistoryParams`: replace `channel` with `sessionKey`
- Add `ChatSendResponse` type: `{ runId: string; status: string }`
- Add `ChatStreamEvent` type for incoming "chat" event chunk payloads

**Acceptance criteria:**
- [ ] Types compile and match the gateway protocol spec
- [ ] All existing imports still resolve (update consumers)
- [ ] `MessageBubble` renders using the new field names (`role`, `content`)

**Dependencies:** None
**Estimate:** Small (< 1 hour)

---

#### Story 1.2: Fix chat event subscription and streaming assembly

**What:** Rewrite `useChat.ts` to subscribe to `"chat"` events (not `"chat.message"`), handle the non-blocking `chat.send` flow, and assemble streamed chunks into complete messages.

**Changes:**
- Subscribe to `"chat"` event instead of `"chat.message"`
- On send: call `chat.send` with correct params (`sessionKey`, `message`, `deliver: false`, `idempotencyKey`); add optimistic user message to state; do **not** treat the response as a message
- Accumulate streamed chunks keyed by `runId` into a growing assistant message
- Expose a `streaming` boolean for UI to show typing indicator

**Acceptance criteria:**
- [ ] Sending a message shows the user's message immediately
- [ ] Assistant response streams in progressively as chunks arrive
- [ ] Final message is complete and stable after streaming ends
- [ ] `streaming` state is true while chunks are arriving, false after

**Dependencies:** Story 1.1
**Estimate:** Medium (1-2 hours)

---

#### Story 1.3: Session key management

**What:** Implement session key creation, selection, and persistence so `chat.send` and `chat.history` have a valid `sessionKey`.

**Changes:**
- On connect, request or create a default chat session (or use a well-known key)
- Persist selected session key in state (and optionally localStorage)
- Pass `sessionKey` to `chat.history` and `chat.send`

**Acceptance criteria:**
- [ ] Chat works end-to-end: send a message, see streamed response
- [ ] Refreshing the page reconnects to the same session and loads history
- [ ] History loads with correct `sessionKey` param

**Dependencies:** Story 1.2
**Estimate:** Small-Medium (1 hour)

---

#### Story 1.4: Implement chat.abort

**What:** Add an abort button that calls `chat.abort` to cancel an in-progress response.

**Changes:**
- Add `abortChat` function to `useChat` that calls `client.request("chat.abort", { sessionKey })`
- Show a stop/abort button in `ChatView` when `streaming` is true
- On abort, finalize the partial message in state

**Acceptance criteria:**
- [ ] Abort button visible only while streaming
- [ ] Tapping abort stops the stream and shows partial response
- [ ] Can send a new message after aborting

**Dependencies:** Story 1.2, 1.3
**Estimate:** Small (< 1 hour)

---

### Epic 2: Controls Panel — Safety Features (Priority: High)

The kill switch and approval flow are critical safety features for managing autonomous agents.

---

#### Story 2.1: Expand BottomNav to support all panels

**What:** Refactor `BottomNav` and the `Tab` type to support up to 6 panels. Use a scrollable or icon-only nav to fit on mobile.

**Changes:**
- Update `Tab` type to include: `"chat" | "agents" | "status" | "metrics" | "notifications" | "controls"`
- Redesign nav to work with 6 items (smaller icons, no labels, or horizontal scroll)
- Update `App.tsx` to route each tab to its panel (placeholder `<div>` for unbuilt panels)

**Acceptance criteria:**
- [ ] All 6 tabs visible and tappable on a 375px-wide screen
- [ ] Active tab is highlighted
- [ ] Switching tabs renders the correct panel (or placeholder)
- [ ] Safe-area insets still respected

**Dependencies:** None
**Estimate:** Small (< 1 hour)

---

#### Story 2.2: Gateway kill switch (openclaw gateway stop)

**What:** Add a prominent kill switch to the Controls panel that calls `gateway.stop` (or equivalent RPC) to shut down the entire gateway.

**Changes:**
- Create `ControlsPanel` component
- Add a large, red "Emergency Stop" button with a two-step confirmation (tap -> confirm)
- Call the gateway stop RPC method on confirmation
- Show connection-lost state gracefully after gateway shuts down

**Acceptance criteria:**
- [ ] Kill switch requires explicit confirmation before firing
- [ ] Successfully sends the stop command to the gateway
- [ ] UI handles the resulting disconnection gracefully
- [ ] Button is visually prominent and hard to tap accidentally

**Dependencies:** Story 2.1
**Estimate:** Small-Medium (1 hour)

---

#### Story 2.3: Per-agent pause/resume

**What:** Add pause and resume controls for individual agents in the Controls panel (or as an enhancement to AgentCard).

**Changes:**
- Add pause/resume RPC calls (`sessions.pause`, `sessions.resume` or equivalent)
- Add pause/resume buttons to agent entries in the Controls panel
- Show paused state in agent status badge

**Acceptance criteria:**
- [ ] Can pause a running agent
- [ ] Can resume a paused agent
- [ ] Paused state reflected in the UI immediately
- [ ] Paused agents don't show "Kill" as the only option

**Dependencies:** Story 2.1
**Estimate:** Small (< 1 hour)

---

#### Story 2.4: Approve/deny flow for agent actions

**What:** Subscribe to approval-request events from the gateway and present an approve/deny UI.

**Changes:**
- Subscribe to approval event type (e.g., `"approval.requested"`)
- Show pending approvals as cards with context (agent, action, risk level)
- Approve/deny buttons that call the corresponding RPC
- Badge on Controls tab when approvals are pending

**Acceptance criteria:**
- [ ] Incoming approval requests appear in real-time
- [ ] Approve and deny both send the correct RPC and remove the card
- [ ] Tab badge shows count of pending approvals
- [ ] Expired or resolved approvals are cleared

**Dependencies:** Story 2.1
**Estimate:** Medium (1-2 hours)

---

### Epic 3: Push Notifications (Priority: Medium-High)

Current notifications are foreground-only and won't work on iPhone PWA. Real push requires a service worker.

---

#### Story 3.1: Register service worker and subscribe to web push

**What:** Create a service worker that handles push events and manages the push subscription lifecycle.

**Changes:**
- Create `public/sw.js` (or `src/sw.ts` with build step) with `push` and `notificationclick` handlers
- Register the service worker in `main.tsx` or `App.tsx`
- Implement `subscribeToPush()` that gets a `PushSubscription` and sends it to the gateway
- Replace `new Notification()` calls with service-worker-mediated push

**Acceptance criteria:**
- [ ] Service worker registers successfully on app load
- [ ] Push subscription is created and sent to the gateway
- [ ] Notifications appear when app is backgrounded or closed
- [ ] `notificationclick` opens/focuses the app

**Dependencies:** None (parallel with other epics)
**Estimate:** Medium (1-2 hours)

---

#### Story 3.2: Fix notification event subscription

**What:** Update `useNotifications.ts` to subscribe to `"chat"` events instead of `"chat.message"` and use the correct payload fields.

**Changes:**
- Change event name from `"chat.message"` to `"chat"`
- Read `role`/`content` instead of `sender`/`text`
- Only notify for assistant messages (not user echoes)

**Acceptance criteria:**
- [ ] Notifications fire for incoming assistant messages
- [ ] No notification for the user's own messages
- [ ] Notification body matches the message content

**Dependencies:** Story 1.1
**Estimate:** Small (< 30 min)

---

#### Story 3.3: Notifications settings panel

**What:** Build the Notifications panel where users can manage push subscription and notification preferences.

**Changes:**
- Create `NotificationsPanel` component
- Show current push subscription status (subscribed / not subscribed / denied)
- Toggle to enable/disable push
- Optionally: per-event-type toggles (chat, agent alerts, approvals)

**Acceptance criteria:**
- [ ] Panel shows accurate subscription status
- [ ] Can subscribe and unsubscribe from push
- [ ] Preferences persist across sessions
- [ ] Graceful handling of "denied" permission state

**Dependencies:** Story 2.1, 3.1
**Estimate:** Small-Medium (1 hour)

---

### Epic 4: Agent Status Panel (Priority: Medium)

Provides deeper visibility into what each agent is doing, beyond the feed.

---

#### Story 4.1: Agent Status panel with per-agent detail

**What:** Build the Agent Status panel showing active/idle/stuck classification, current task, and time-on-task for each agent.

**Changes:**
- Create `AgentStatusPanel` component
- Derive agent state: "active" (recent events), "idle" (running but quiet), "stuck" (running, no events for > threshold)
- Show current task description, elapsed time, and model
- Subscribe to `"agent"` events for real-time activity stream per agent

**Acceptance criteria:**
- [ ] Panel shows all agents with status classification
- [ ] "Stuck" detection triggers after configurable idle threshold
- [ ] Time-on-task updates in real-time (or every few seconds)
- [ ] Tapping an agent could expand to show recent activity (stretch)

**Dependencies:** Story 2.1
**Estimate:** Medium (1-2 hours)

---

### Epic 5: Metrics Panel (Priority: Low)

Dashboard for operational metrics. Depends on the gateway exposing the relevant data.

---

#### Story 5.1: Metrics panel scaffold and Pi health

**What:** Build the Metrics panel with Pi health gauges (CPU, RAM, disk).

**Changes:**
- Create `MetricsPanel` component
- Poll or subscribe for system health metrics from the gateway
- Render gauges/bars for CPU usage, RAM usage, disk usage
- Show alert states when thresholds exceeded

**Acceptance criteria:**
- [ ] CPU, RAM, disk metrics displayed and updating
- [ ] Visual indication when metrics exceed warning thresholds
- [ ] Handles missing/unavailable metrics gracefully

**Dependencies:** Story 2.1, gateway metrics RPC availability
**Estimate:** Medium (1-2 hours)

---

#### Story 5.2: PR velocity and test counts

**What:** Add PR velocity (merged/open/review) and test pass/fail counts to the Metrics panel.

**Changes:**
- Call gateway RPC for PR stats and test results (or subscribe to events)
- Render counts with trend indicators

**Acceptance criteria:**
- [ ] PR counts displayed (merged, open, in review)
- [ ] Test pass/fail counts displayed
- [ ] Data refreshes on panel visit or via subscription

**Dependencies:** Story 5.1, gateway PR/test RPCs
**Estimate:** Small-Medium (1 hour)

---

#### Story 5.3: Token burn tracking

**What:** Display token usage / cost metrics.

**Changes:**
- Call gateway RPC for token usage data
- Show total tokens used, cost estimate, per-agent breakdown

**Acceptance criteria:**
- [ ] Total token usage displayed
- [ ] Per-agent or per-session breakdown available
- [ ] Historical trend (today, this week) if data available

**Dependencies:** Story 5.1, gateway token-usage RPC
**Estimate:** Small-Medium (1 hour)

---

## Recommended Build Order

```
Phase 1 — Fix what's broken (chat is non-functional)
  1.1  Align types          ─┐
  2.1  Expand BottomNav     ─┤  (parallel — no dependencies between them)
  3.1  Service worker       ─┘
  1.2  Fix chat streaming   ── (blocked on 1.1)
  3.2  Fix notification sub ── (blocked on 1.1; parallel with 1.2)
  1.3  Session key mgmt     ── (blocked on 1.2)
  1.4  Chat abort           ── (blocked on 1.2 + 1.3)

Phase 2 — Safety features
  2.2  Kill switch           ── (blocked on 2.1)
  2.3  Per-agent pause       ── (blocked on 2.1; parallel with 2.2)
  2.4  Approve/deny flow     ── (blocked on 2.1)

Phase 3 — Push notifications
  3.3  Notifications panel   ── (blocked on 2.1 + 3.1)

Phase 4 — Visibility & metrics
  4.1  Agent Status panel    ── (blocked on 2.1)
  5.1  Metrics scaffold      ── (blocked on 2.1)
  5.2  PR velocity / tests   ── (blocked on 5.1)
  5.3  Token burn            ── (blocked on 5.1)
```

### Rationale

1. **Types first (1.1)** — every chat-related story depends on correct types. It's the smallest change with the widest unblock.
2. **BottomNav (2.1) in parallel** — it's a prerequisite for every new panel but has zero overlap with chat fixes.
3. **Service worker (3.1) in parallel** — long-ish task with no dependencies; starting early means it's ready when we build the notifications panel.
4. **Chat streaming (1.2) immediately after types** — this is the core broken feature; fixing it makes the app usable.
5. **Safety before features** — kill switch and approvals protect against autonomous agent mishaps. Ship these before nice-to-have dashboards.
6. **Metrics last** — these are read-only dashboards with external data dependencies (gateway RPCs that may not exist yet). Lowest risk if deferred.
