# LLM Session Dialog Web UI (High-Level Summary)

This page is a single-file web chat interface for **user ↔ LLM/Agent** conversations, with local session/message persistence and simple integration hooks for your backend logic.

## 1) User Features

- **Session management (left panel)**
	- Create a new session
	- Rename a session
	- Delete a session
	- Select an active session
- **Conversation experience (right panel)**
	- View message history per session (user and agent bubbles)
	- Send user prompts with `Enter` (and multiline via `Shift+Enter`)
	- See a temporary **“LLM is typing...”** placeholder row
- **Persistence**
	- Sessions and message history are saved in `localStorage`
	- Last active session is restored on reload
- **Responsive behavior**
	- Desktop: two-column layout
	- Mobile: session list and dialog switch views with a back button

## 2) Layout Structure

- **Root container**: `.app`
	- Two-column grid: left sidebar + right dialog panel
- **Left column (sessions)**
	- Header with title + **+ New** button
	- Session count
	- Scrollable session list (`.session-list`) with independent scroll
- **Right column (dialog)**
	- Dialog header (session title/subtitle)
	- Scrollable messages area (`.messages`) with independent scroll
	- Fixed input area (`.input-area`) that remains visible while messages grow

## 3) Developer Callback Contract

The page exposes a minimal callback pattern so you can plug in your own request/response pipeline:

### A. Outbound hook (you implement)

Define this function in your own script:

```js
window.onUserSend = async ({ sessionId, text }) => {
	// 1) send request to your backend/LLM service
	// 2) parse response
	// 3) call window.appendAgentMessage(sessionId, parsedText)
};
```

`onUserSend` is called automatically after the UI adds the user message.

### B. Inbound helper (already provided by page)

Use this to append model replies:

```js
window.appendAgentMessage(sessionId, text);
```

What it does:
- Adds an agent message into the target session
- Clears typing indicator for that session
- Re-renders UI
- Persists to `localStorage`

## 4) Data Model (Simplified)

- **Session**
	- `id: string`
	- `name: string`
	- `messages: Message[]`
- **Message**
	- `id: string`
	- `role: "user" | "agent"`
	- `text: string`
	- `timestamp: number`

## 5) Local Storage Keys

- `llm-dialog-sessions-v1`: serialized session list with all messages
- `llm-dialog-active-session`: currently selected session id

