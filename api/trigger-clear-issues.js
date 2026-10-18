export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }

  const { email = '' } = body || {};
  const normalized = String(email).trim().toLowerCase();

  const token = process.env.MY_GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Token not configured' });
  }

  const REPO = 'aiden12910-12910/the-website';
  const FILE_PATH = 'api/allowed-emails.json';
  const API_BASE = 'https://api.github.com';

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  try {
    const getRes = await fetch(`${API_BASE}/repos/${REPO}/contents/${FILE_PATH}`, { headers });
    if (!getRes.ok) {
      return res.status(500).json({ error: 'Failed to read allowed-emails.json' });
    }
    const fileData = await getRes.json();
    const content = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf-8'));
    const developers = (content.developers || []).map(e => e.toLowerCase());

    if (!normalized || !developers.includes(normalized)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const response = await fetch(`${API_BASE}/repos/${REPO}/dispatches`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'clear-issues' })
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: 'GitHub API error', details: text });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
