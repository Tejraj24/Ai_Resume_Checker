// Lightweight proxy using only Node built-ins + global fetch (Node 18+)
// No external dependencies required. Reads RESUMEIQ_API_KEY from env.

const http = require('http');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGINS = new Set(['http://localhost:8000', 'http://127.0.0.1:8000']);

const MODEL_NAME = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 1000;
const API_ENDPOINT = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `You are an expert resume analyst and career coach. Analyze the provided resume and return a structured JSON object with this exact format:
{
  "ats_score": <integer 0-100>,
  "ats_reasoning": "<2-3 sentences explaining the score, focusing on keywords, formatting, and structure>",
  "strengths": ["<item>", "<item>", "<item>", "<item>", "<item>"],
  "weaknesses": ["<item>", "<item>", "<item>", "<item>"],
  "suggestions": ["<specific actionable suggestion>", "<specific actionable suggestion>", "<specific actionable suggestion>", "<specific actionable suggestion>", "<specific actionable suggestion>"]
}
Return ONLY valid JSON. No markdown, no backticks, no commentary.`;

function buildUserContent(resumeText, jdText, imageData) {
  if (imageData) {
    return [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: imageData.mediaType,
          data: imageData.base64,
        },
      },
      {
        type: 'text',
        text: jdText
          ? `This image contains a resume. Analyze it against this job description:\n\n${jdText}`
          : 'This image contains a resume. Analyze it and provide comprehensive feedback.',
      },
    ];
  }

  return jdText
    ? `RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jdText}\n\nAnalyze this resume against the job description and provide feedback.`
    : `RESUME:\n${resumeText}\n\nAnalyze this resume and provide comprehensive feedback.`;
}

async function handleAnalyze(reqBody) {
  const { resumeText, jdText, imageData } = reqBody || {};
  const userContent = buildUserContent(resumeText, jdText, imageData);

  const body = {
    model: MODEL_NAME,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  };

  // Read the API key from environment. The variable name is intentionally
  // generic (RESUMEIQ_API_KEY) so the implementation details don't appear
  // in the UI or top-level docs.
  const apiKey = process.env.RESUMEIQ_API_KEY || '';
  const resp = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    const err = new Error(`Upstream error ${resp.status}: ${text}`);
    err.status = resp.status;
    throw err;
  }

  const data = await resp.json();
  const raw = (data.content || []).map(b => b.text || '').join('');
  const clean = raw.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(clean);
  } catch (e) {
    const error = new Error('Failed to parse model output as JSON');
    error.raw = clean;
    throw error;
  }
}

function sendJson(res, status, obj, origin) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  res.writeHead(status, headers);
  res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const origin = req.headers.origin || '';

  if (req.method === 'OPTIONS') {
    // Preflight
    res.writeHead(204, {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (url.pathname === '/api/analyze' && req.method === 'POST') {
    try {
      let body = '';
      for await (const chunk of req) body += chunk;
      const parsed = body ? JSON.parse(body) : {};
      const result = await handleAnalyze(parsed);
      sendJson(res, 200, result, origin);
    } catch (err) {
      console.error(err);
      const status = err.status || 500;
      const payload = { error: err.message };
      if (err.raw) payload.raw = err.raw;
      sendJson(res, status, payload, origin);
    }
    return;
  }

  // Not found
  sendJson(res, 404, { error: 'Not found' }, origin);
});

server.listen(PORT, () => {
  console.log(`API proxy listening on http://localhost:${PORT}`);
  if (!process.env.RESUMEIQ_API_KEY) {
    console.warn('Warning: RESUMEIQ_API_KEY is not set. Set it in the environment before calling /api/analyze.');
  }
});
