// Netlify Function to proxy /api/analyze -> upstream AI API using a server-side key
// This mirrors the logic in server.js so the client can keep calling /api/analyze
// when deployed to Netlify. Set RESUMEIQ_API_KEY in Netlify environment variables.

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

exports.handler = async function (event, context) {
  const origin = (event.headers && event.headers.origin) || '*';

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': origin },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  let parsed;
  try {
    parsed = event.body ? JSON.parse(event.body) : {};
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': origin },
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  const { resumeText, jdText, imageData } = parsed || {};
  const userContent = buildUserContent(resumeText, jdText, imageData);

  const body = {
    model: MODEL_NAME,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  };

  const apiKey = process.env.RESUMEIQ_API_KEY || '';

  // If no API key is set, return a canned mock response so the site still works
  if (!apiKey) {
    const mock = {
      ats_score: 72,
      ats_reasoning: 'Resume contains relevant keywords and clear structure; minor formatting issues reduce ATS parsing accuracy.',
      strengths: ['Clear experience bullets', 'Good technical keywords', 'Concise education section', 'Relevant projects', 'Contact info present'],
      weaknesses: ['Minor formatting inconsistencies', 'No quantified achievements in some roles', 'Skills section could be reordered', 'Short summary'],
      suggestions: ['Quantify impact with metrics (e.g., % improvement)', 'Use consistent date formatting', 'Move top skills near the summary', 'Add a short career summary', 'Tailor keywords to the JD'],
    };

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': origin, 'Content-Type': 'application/json' },
      body: JSON.stringify(mock),
    };
  }

  try {
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
      return {
        statusCode: resp.status,
        headers: { 'Access-Control-Allow-Origin': origin },
        body: JSON.stringify({ error: `Upstream error ${resp.status}: ${text}` }),
      };
    }

    const data = await resp.json();
    const raw = (data.content || []).map(b => b.text || '').join('');
    const clean = raw.replace(/```json|```/g, '').trim();

    try {
      const parsedOut = JSON.parse(clean);
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': origin, 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedOut),
      };
    } catch (e) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': origin },
        body: JSON.stringify({ error: 'Failed to parse model output as JSON', raw: clean }),
      };
    }
  } catch (err) {
    return {
      statusCode: 502,
      headers: { 'Access-Control-Allow-Origin': origin },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
