const REPO = 'aiden12910-12910/the-website';
const FILE_PATH = 'public/js/allowed-emails.json';
const API_BASE = 'https://api.github.com';

function ghHeaders(env, extra) {
  return {
    'Authorization': `Bearer ${env.MY_GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'the-website-worker',
    ...(extra || {})
  };
}

function b64ToUtf8(b64) {
  const bin = atob(b64.replace(/\n/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function utf8ToB64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

async function readAllowedEmails(env) {
  const res = await fetch(`${API_BASE}/repos/${REPO}/contents/${FILE_PATH}`, {
    headers: ghHeaders(env)
  });
  if (!res.ok) throw new Error('Failed to read allowed-emails.json');
  const data = await res.json();
  const content = JSON.parse(b64ToUtf8(data.content));
  return { content, sha: data.sha };
}

async function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

async function handleCheckEmail(request, env) {
  let body;
  try { body = await request.json(); } catch (e) { return jsonResponse({ error: 'Invalid JSON' }, 400); }
  const email = String(body && body.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: 'Invalid email format' }, 400);
  }
  if (!env.MY_GITHUB_TOKEN) return jsonResponse({ error: 'Token not configured' }, 500);

  try {
    const { content, sha } = await readAllowedEmails(env);
    const developers = (content.developers || []).map(e => e.toLowerCase());
    const users = (content.users || []).map(e => e.toLowerCase());

    if (developers.includes(email)) return jsonResponse({ ok: true, role: 'developer', email });
    if (users.includes(email)) return jsonResponse({ ok: true, role: 'user', email });

    content.users = content.users || [];
    content.users.push(email);
    const newB64 = utf8ToB64(JSON.stringify(content, null, 2));

    const putRes = await fetch(`${API_BASE}/repos/${REPO}/contents/${FILE_PATH}`, {
      method: 'PUT',
      headers: ghHeaders(env, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        message: `auto-add user: ${email}`,
        content: newB64,
        sha
      })
    });

    if (!putRes.ok) {
      return jsonResponse({ ok: true, role: 'user', email, warning: 'auto-add failed' });
    }
    return jsonResponse({ ok: true, role: 'user', email, added: true });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleLogIssue(request, env) {
  let body;
  try { body = await request.json(); } catch (e) { return jsonResponse({ error: 'Invalid JSON' }, 400); }

  const title = body && body.title;
  const issueBody = body && body.body;
  const type = (body && body.type) || 'log';
  const email = (body && body.email) || '';

  if (typeof title !== 'string' || !title.trim() || typeof issueBody !== 'string' || !issueBody.trim()) {
    return jsonResponse({ error: 'Missing title or body' }, 400);
  }
  if (!env.MY_GITHUB_TOKEN) return jsonResponse({ error: 'Token not configured' }, 500);

  const labelsByType = {
    log: ['User-Log'],
    comment: ['comment'],
    message: ['message'],
    error: ['error']
  };
  const labels = labelsByType[type] || ['no-name'];
  const issue = {
    title: title.trim(),
    body: email ? `**Reporter Email:** ${String(email).trim()}\n\n---\n\n${issueBody}` : issueBody,
    labels
  };

  const post = (payload) => fetch(`${API_BASE}/repos/${REPO}/issues`, {
    method: 'POST',
    headers: ghHeaders(env, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });

  try {
    let res = await post(issue);
    let text = await res.text();

    if (res.status === 422 && /label/i.test(text)) {
      res = await post({ title: issue.title, body: issue.body });
      text = await res.text();
    }

    if (!res.ok) return jsonResponse({ error: 'GitHub API error', details: text }, res.status);

    let data;
    try { data = JSON.parse(text); } catch (e) { return jsonResponse({ error: 'Invalid response from GitHub' }, 502); }
    return jsonResponse({ ok: true, data });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleTriggerClearIssues(request, env) {
  let body;
  try { body = await request.json(); } catch (e) { return jsonResponse({ error: 'Invalid JSON' }, 400); }
  const email = String(body && body.email || '').trim().toLowerCase();
  if (!env.MY_GITHUB_TOKEN) return jsonResponse({ error: 'Token not configured' }, 500);

  try {
    const { content } = await readAllowedEmails(env);
    const developers = (content.developers || []).map(e => e.toLowerCase());
    if (!email || !developers.includes(email)) return jsonResponse({ error: 'Forbidden' }, 403);

    const res = await fetch(`${API_BASE}/repos/${REPO}/dispatches`, {
      method: 'POST',
      headers: ghHeaders(env, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ event_type: 'clear-issues' })
    });
    if (!res.ok) {
      const text = await res.text();
      return jsonResponse({ error: 'GitHub API error', details: text }, res.status);
    }
    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleTriggerScan(request, env) {
  let body;
  try { body = await request.json(); } catch (e) { return jsonResponse({ error: 'Invalid JSON' }, 400); }
  const email = String(body && body.email || '').trim().toLowerCase();
  if (!env.MY_GITHUB_TOKEN) return jsonResponse({ error: 'Token not configured' }, 500);

  try {
    const { content } = await readAllowedEmails(env);
    const developers = (content.developers || []).map(e => e.toLowerCase());
    if (!email || !developers.includes(email)) return jsonResponse({ error: 'Forbidden' }, 403);

    const res = await fetch(`${API_BASE}/repos/${REPO}/actions/workflows/scan.yml/dispatches`, {
      method: 'POST',
      headers: ghHeaders(env, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ref: 'main' })
    });
    if (!res.ok) {
      const text = await res.text();
      return jsonResponse({ error: 'GitHub API error', details: text }, res.status);
    }
    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/check-email' && request.method === 'POST') return handleCheckEmail(request, env);
    if (url.pathname === '/api/log-issue' && request.method === 'POST') return handleLogIssue(request, env);
    if (url.pathname === '/api/trigger-clear-issues' && request.method === 'POST') return handleTriggerClearIssues(request, env);
    if (url.pathname === '/api/trigger-scan' && request.method === 'POST') return handleTriggerScan(request, env);

    return env.ASSETS.fetch(request);
  }
};