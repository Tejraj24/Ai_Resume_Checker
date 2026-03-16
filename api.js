/* ============================================
   api.js — Client -> local proxy (server-side API key)
   ============================================ */

// Send the extracted resume (or image base64) to the local proxy which
// forwards the request to the analysis backend using a server-side API key.
async function callAnalysisAPI(resumeText, jdText, imageData) {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeText, jdText, imageData }),
  });

  if (!response.ok) {
    let errBody;
    try { errBody = await response.json(); } catch (e) { errBody = await response.text(); }
    throw new Error(errBody?.error || `Proxy error ${response.status}`);
  }

  return await response.json();
}

// Note: old name `callClaudeAPI` removed to avoid vendor mentions.
