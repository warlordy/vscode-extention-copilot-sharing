# Copilot Share

Copilot Share is a VS Code extension that shares Copilot through a web chat app backed by an HTTP service, and provides a status bar control menu for starting or stopping sharing and opening or copying URLs.

## What It Does

- Shows a status item (`Copilot Share`) in the status bar after VS Code startup.
- Opens a control menu with:
  - Start Sharing / Stop Sharing
  - Open Web
  - Copy Local URL
  - Copy LAN URL
  - Set Status Icons (choose running/stopped codicon pair)
- Hosts the web app from `src/webapp/index.html`.
- Exposes API endpoints:
  - `POST /api/chat`
  - `GET /api/server-info`

## How to Use

1. Click the `Copilot Share` status item in the status bar.
2. Choose **Start Sharing**.
3. Use menu actions to:
   - open local web UI (`127.0.0.1`), or
   - copy LAN URL for other devices on the same network.

You can also run command: `Open Copilot Share Control Menu`.

## Server Behavior

- Binds to `0.0.0.0`.
- Detects LAN IPv4 URL(s).
- Uses configured start port and auto-falls forward (`+1`) if occupied.

## Configuration

- `copilot-share.port`
  - Type: `number`
  - Default: `6800`
  - Range: `1` to `65535`

## Limitations

1. `auto` model id (display name: `Auto`) is currently not supported for direct chat calls in this extension.
   - Reason: with the current VS Code LM API behavior, `auto` may be discoverable in model listing but not invokable as a concrete endpoint, which can cause errors like `Endpoint not found for model auto`.

## API (Current)

### `POST /api/chat`

Request example:

```json
{
  "sessionId": "s1",
  "message": "Hello"
}
```

Response example:

```json
{
  "sessionId": "s1",
  "reply": "Server received: Hello",
  "timestamp": 1700000000000
}
```

### `GET /api/server-info`

Returns current local URL, LAN URLs, and active port.

## Development

- Build: `npm run compile`
- Watch: `npm run watch`
