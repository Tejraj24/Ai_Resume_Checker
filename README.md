# Ai_Resume_Checker — Local run instructions

This project is a static client that analyzes resumes using an AI analysis engine. To avoid exposing your API key in the browser, the repository includes a small local proxy (`server.js`) that forwards requests to the analysis API using the key stored in an environment variable.

Files of note
- `index.html` — main web UI
- `style.css` — stylesheet (served from project root)
- `api.js` — client code; calls the local proxy at `/api/analyze`
- `server.js` — local proxy (Node 18+). Reads `RESUMEIQ_API_KEY` from environment.
- `start.sh` — convenience script to start both static server and proxy

Quick start (Linux)

1. Copy the example env file and set your API key:

```bash
cp .env.example .env
# Edit .env and set RESUMEIQ_API_KEY=sk-...
export RESUMEIQ_API_KEY="sk-..."
```

2. Start the app (the script will only start servers if they're not already running):

```bash
chmod +x start.sh
./start.sh
```

3. Open the UI in your browser:

```
http://localhost:8000
```

Notes
- The proxy listens on port `3000`. The client posts to `/api/analyze` (same origin when you open the static site).
- If the proxy returns a 502 with a `raw` field, the model output couldn't be parsed as JSON — check `proxy.log` for details.
-- The proxy forwards requests using an `x-api-key` header. Keep your key secret; do not commit it to source control.

Troubleshooting
- If ports 8000 or 3000 are already in use, stop the conflicting process or change the ports in `start.sh` and `server.js`.
