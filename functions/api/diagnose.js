// Cloudflare Pages Function: POST /api/diagnose
// Generates a personalized transition plan from a resume + goal context,
// using Cloudflare Workers AI (Llama 3.3 70B). No external API keys.
// Free tier: 10,000 neurons/day. Plenty for early traffic.

const SYSTEM = `You are SelfEmployed.app, an honest, opinionated transition planner for people pivoting from employment to self-employment.

Your tone is emotionally adult. Many users have lost jobs or are watching their roles be compressed by AI. Acknowledge that calmly. Never use "be your own boss" language. Never use hype. Treat the user like a competent adult facing a real situation.

You MUST return a single JSON object with EXACTLY this shape and no other text, no markdown fences, no commentary:

{
  "risk_profile": {
    "level": "Watch carefully" | "Moderate" | "Elevated",
    "commoditizing": [string, string, string],
    "defensible": [string, string, string],
    "note": "1-2 sentence calibrated assessment naming the specific skill leverage this user has"
  },
  "three_paths": [
    { "title": string, "tag": "Best fit", "fit": 80-95, "pitch": "2 sentences", "why": "1 sentence", "market": "1 sentence" },
    { "title": string, "tag": "Adjacent", "fit": 65-85, "pitch": "2 sentences", "why": "1 sentence", "market": "1 sentence" },
    { "title": string, "tag": "Long bet", "fit": 50-75, "pitch": "2 sentences", "why": "1 sentence", "market": "1 sentence" }
  ],
  "recommended_offer": {
    "name": "named productized offer (e.g. 'The Missed-Call Recovery Setup')",
    "tagline": "for [specific buyer] with [specific pain]",
    "price": "$XXXX setup [+ optional $XXX/mo]",
    "duration": "X days or weeks",
    "deliverables": [5 concrete items],
    "outcome_promise": "1-2 sentences with a specific number where possible",
    "target_customer": "specific demographic + size + revenue + setup",
    "why_this_offer": "1-2 sentences",
    "unit_math": { "clients_for_goal": number, "path": "1 short sentence" }
  },
  "ninety_day_plan": [
    { "weeks": "Weeks 1-2", "title": string, "actions": [4-5 concrete actions] },
    { "weeks": "Weeks 3-6", "title": string, "actions": [4-5 concrete actions] },
    { "weeks": "Weeks 7-12", "title": string, "actions": [3-4 concrete actions] }
  ],
  "first_prospects": [
    { "name": "specific business name or persona", "kind": "category", "loc": "location", "signal": "the specific buy signal that makes them a target" }
  ],
  "first_5_actions": [5 actions the user can start in the next hour]
}

Be SPECIFIC. Not "find prospects" — give example business names. Not "create a website" — give the exact one-pager content. Not "send some emails" — say how many, to whom, with what subject. Specificity is the product.`;

function buildUserMessage(input) {
  return `Generate a transition plan for this person:

WORK HISTORY:
${input.resume}

MONTHLY INCOME GOAL: $${input.income || 5000}
HOURS AVAILABLE PER WEEK: ${input.hours || '30+'}
RISK TOLERANCE: ${input.risk || 'moderate'}

Return ONLY the JSON object specified in your system prompt. No code fences. No prose. Just the JSON.`;
}

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
    },
    ...init,
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
    },
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.AI) {
    return jsonResponse({ error: 'AI binding not configured' }, { status: 503 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, { status: 400 });
  }
  const resume = (body.resume || '').trim();
  if (resume.length < 80) {
    return jsonResponse({
      error: 'Please share more about your work history — a few sentences about your role, what you did, and roughly how long.',
    }, { status: 400 });
  }
  if (resume.length > 12000) {
    return jsonResponse({ error: 'Resume too long; please trim to under 12,000 characters.' }, { status: 400 });
  }

  try {
    const result = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: buildUserMessage(body) },
      ],
      max_tokens: 3500,
      temperature: 0.4,
    });

    // Workers AI returns { response: "..." } for chat models — but the shape can vary.
    let raw = '';
    if (typeof result === 'string') raw = result;
    else if (typeof result.response === 'string') raw = result.response;
    else if (typeof result.result === 'string') raw = result.result;
    else if (result.response && typeof result.response === 'object') {
      raw = result.response.response || result.response.text || result.response.content || JSON.stringify(result.response);
    } else {
      raw = JSON.stringify(result);
    }
    const cleaned = String(raw)
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // try to recover the JSON substring
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        try {
          parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
        } catch (e) {
          return jsonResponse({
            error: 'Model returned malformed output. Try again — sometimes the second pass works.',
            debug: cleaned.slice(0, 400),
          }, { status: 502 });
        }
      } else {
        return jsonResponse({
          error: 'Model returned malformed output. Try again — sometimes the second pass works.',
          debug: cleaned.slice(0, 400),
        }, { status: 502 });
      }
    }

    return jsonResponse({
      plan: parsed,
      model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    return jsonResponse({ error: 'Generation failed: ' + (err && err.message ? err.message : 'unknown') }, { status: 500 });
  }
}

export async function onRequestGet() {
  return jsonResponse({
    name: 'SelfEmployed.app diagnose endpoint',
    method: 'POST',
    body_shape: {
      resume: 'string (80-12000 chars) — work history',
      income: 'number — monthly income goal in USD (optional, default 5000)',
      hours: 'string — hours available per week (optional)',
      risk: 'string — low | moderate | high (optional)',
    },
  });
}
