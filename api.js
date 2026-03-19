/* ============================================
   api.js — Client -> local proxy (server-side API key)
   ============================================ */

// Send the extracted resume (or image base64) to the local proxy which
// forwards the request to the analysis backend using a server-side API key.
async function callAnalysisAPI(resumeText, jdText, imageData) {
  // The proxy lives on port 3000 for local development only. When the app is
  // running on localhost (or 127.0.0.1) use the explicit proxy origin so the
  // POST goes to the local proxy. When the app is served from a remote host
  // (for example a Netlify/HTTPS site) we MUST NOT try to reach
  // "https://<remote-host>:3000" — that times out and is unreachable. In
  // that case use a relative path so the request goes to the same origin
  // (where a real backend/proxy should be hosted in production).
  const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname === '';
  const proxyUrl = isLocalhost
    ? `${location.protocol}//${location.hostname}:3000/api/analyze`
    : '/api/analyze';

  const resp = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeText, jdText, imageData }),
  });

  // Read the raw text once (avoids "body stream already read" errors)
  const raw = await resp.text();

  if (!resp.ok) {
    // Try to parse JSON error body, otherwise include raw text
    try {
      const parsed = JSON.parse(raw || '{}');
      throw new Error(parsed.error || `Proxy error ${resp.status}`);
    } catch (e) {
      throw new Error(raw || `Proxy error ${resp.status}`);
    }
  }

  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error('Invalid JSON from analysis proxy: ' + raw);
  }
}

// Note: old name `callClaudeAPI` removed to avoid vendor mentions.
