# Copilot Share

Copilot Share brings VS Code Copilot to a local LAN web hub with [session-oriented workflow](#session-oriented-workflow).

- [Quick Start Demo](https://github.com/warlordy/vscode-extension-copilot-share/blob/main/src/doc/readme/copilot-share-screen-recording-quickstart.gif)

<img src="https://github.com/warlordy/vscode-extension-copilot-share/blob/main/src/doc/readme/copilot-share-screen-recording-quickstart.gif" alt="Quick Start Demo" />

## Why Try Copilot Share

1. 🤗 Use Copilot on phones, tablets, laptops, and other devices on the same local network.
2. 🏖️ Share Copilot access and usage budgets with teammates, family members, or workshop participants.
3. 🚀 Session-oriented workflow:
   - Treat prompts and responses as reusable work assets, with support for searching, summarizing, cloning, exporting, and importing sessions.
   - Organize Copilot-assisted work by session so prompts can be reviewed like code, helping verify outcomes against business requirements and reduce AI uncertainty.
   - Work across multiple sessions through different browser tabs in parallel to keep different tasks moving.
4. ✍️ Built-in Prompt Polish Button: Refine draft prompts before sending for clearer, higher-quality results.
5. 🧏‍♂️ Access control mode: When enabled, protect chat APIs with a bearer access code.

## Use Cases

- Build a knowledge base from long-running technical chats.
- Break large projects into smaller tasks and track each one in its own session for an end-to-end, session-driven workflow.

## Session-Oriented Workflow

Traditionally, code was used to build applications and services. Copilot changes that by making prompts the primary way to generate code, documentation, and resource files.

🦄 In this model:
- Prompts are like source code.
- Sessions are like source files.

♨️ That means prompts and sessions should be:
- Treated as core work assets, just like code and source files.
- Reviewed with the same discipline used for code so you can confirm direction, validate requirements, surface gaps early, and reduce the risk of misleading AI-generated outputs.

😜 Why call it session-oriented?
- A session is a focused container for prompts that work toward a single objective. 
- A large project can be broken into smaller tasks, which can be further broken down into subtasks. Every task across all levels can be tracked in its own session. This creates a practical end-to-end session-driven workflow to manage structured multi-stage Copilot tasks.


## Quick Start

1. Install the extension from the VS Code Marketplace.
2. Click the status bar icon (`Copilot Share`) to open the control menu.
3. Select `Start Sharing` and choose whether to enable access control.
4. Select `Open Local Web` on the host, or select `Copy Public URL` to share Copilot across your LAN.
5. Start chatting.
   1. Create or open a session.
   2. Send prompts, retry prompts, and polish drafts when needed.
   3. Search within one session or across all sessions.
   4. Summarize noisy chat history into focused outcomes.
   5. Export or share sessions as Markdown for review and reuse.

## Screenshots

- [Control Menu](https://github.com/warlordy/vscode-extension-copilot-share/blob/main/src/doc/readme/control-menu-window-combined.png) (start/stop sharing, URLs, access code):

<img src="https://github.com/warlordy/vscode-extension-copilot-share/blob/main/src/doc/readme/control-menu-window-combined.png" alt="Copilot Share control menu" style="display: block; width: min(100%, 460px); height: auto; margin-top: 0.5rem; border: 1px solid #d0d7de; border-radius: 8px;" />

- [Web hub UI modules](https://github.com/warlordy/vscode-extension-copilot-share/blob/main/src/doc/readme/web-hub-ui-modules-annotation.drawio.png):

<img src="https://github.com/warlordy/vscode-extension-copilot-share/blob/main/src/doc/readme/web-hub-ui-modules-annotation.drawio.png" alt="Copilot Share web hub modules" style="display: block; width: min(100%, 980px); height: auto; margin-top: 0.5rem; border: 1px solid #d0d7de; border-radius: 10px; background: #ffffff;" />

## Architecture Snapshot

- VS Code extension backend hosts a local HTTP server.
- Web frontend runs in a browser and calls local APIs.
- Chat requests are forwarded to VS Code Copilot models.
- Optional access control uses bearer access code checks for protected routes.

## Security and Networking Notes

- LAN-first design: no cloud relay required.
- Server binds to a LAN-capable host address.
- Access control can be enabled at share start.


## Documentation

- 🏃 UI guide and detailed operations: [ui-guide-details.md](https://github.com/warlordy/vscode-extension-copilot-share/blob/main/ui-guide-details.md)
- 🎯 Extension architecture and implementation notes: [.github/copilot-instructions.md](https://github.com/warlordy/vscode-extension-copilot-share/blob/main/.github/copilot-instructions.md)

## Feedback and Issues

Ideas, bugs, and workflow suggestions are welcome:

- Issues: https://github.com/warlordy/vscode-extension-copilot-share/issues
- Repository: https://github.com/warlordy/vscode-extension-copilot-share
