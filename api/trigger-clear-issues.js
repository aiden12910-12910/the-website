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

  // 白名单：只有这些邮箱才能触发
  const ALLOWED_EMAILS = [
    'aidenliu2026@gmail.com'
  ];

  if (!email || !ALLOWED_EMAILS.includes(email)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const token = process.env.MY_GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Token not configured' });
  }

  try {
    const response = await fetch('https://api.github.com/repos/aiden12910-12910/the-website/dispatches', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        event_type: 'clear-issues'
      })
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
