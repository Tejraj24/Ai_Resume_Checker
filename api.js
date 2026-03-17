/* ============================================
   api.js — Client -> local proxy (server-side API key)
   ============================================ */

// Send the extracted resume (or image base64) to the local proxy which
// forwards the request to the analysis backend using a server-side API key.
async function callAnalysisAPI(resumeText, jdText, imageData) {
  // The static site is served on :8000 while the proxy listens on :3000.
  // Use the proxy origin explicitly so the POST does not hit the static server.
  const proxyOrigin = `${location.protocol}//${location.hostname}:3000`;
  const proxyUrl = `${proxyOrigin}/api/analyze`;

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
