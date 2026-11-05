export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string' || Buffer.isBuffer(body)) {
    try {
      body = JSON.parse(body.toString());
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }

  const { title, body: issueBody, type = 'log', email = '' } = body || {};
  if (typeof title !== 'string' || !title.trim() || typeof issueBody !== 'string' || !issueBody.trim()) {
    return res.status(400).json({ error: 'Missing title or body' });
  }

  const token = process.env.MY_GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Token not configured' });
  }

  const labelsByType = {
    log: ['User-Log'],
    comment: ['comment'],
    message: ['message'],
    error: ['error']
  };
  const labels = labelsByType[type] || ['no-name'];
  const issue = {
    title: title.trim(),
    body: email
      ? `**Reporter Email:** ${String(email).trim()}\n\n---\n\n${issueBody}`
      : issueBody,
    labels
  };

  try {
    const request = (payload) => fetch('https://api.github.com/repos/aiden12910-12910/the-website/issues', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    let response = await request(issue);
    let text = await response.text();

    // GitHub rejects the whole issue request if a configured label no longer exists.
    // Retry once without labels so user feedback can still be submitted.
    if (response.status === 422 && /label/i.test(text)) {
      response = await request({ title: issue.title, body: issue.body });
      text = await response.text();
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: 'GitHub API error', details: text });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(502).json({ error: 'Invalid response from GitHub' });
    }
    return res.status(200).json({ ok: true, data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
