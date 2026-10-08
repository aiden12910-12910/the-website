export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;

  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }

  const { title, body: issueBody, type = 'log' } = body || {};

  if (!title || !issueBody) {
    console.error('Missing title or body:', { title, issueBody });
    return res.status(400).json({ error: 'Missing title or body' });
  }

  const token = process.env.MY_GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Token not configured' });
  }

  try {
    const labels = ['User-Log'];

    if (type === 'comment') labels.push('comment');
    else if (type === 'message') labels.push('message');
    else if (type === 'error') labels.push('error');

    const response = await fetch('https://api.github.com/repos/aiden12910-12910/the-website/issues', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        body: issueBody,
        labels
      })
    });

    const text = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({ error: 'GitHub API error', details: text });
    }

    return res.status(200).json({ ok: true, data: JSON.parse(text) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
