export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, body } = req.body || {};

  if (!title || !body) {
    return res.status(400).json({ error: 'Missing title or body' });
  }

  const token = process.env.MY_GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Token not configured' });
  }

  // 后端生成 UUID
  const uuid = generateUUID();

  try {
    const response = await fetch('https://api.github.com/repos/aiden12910-12910/the-website/issues', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: (title || '').replace('UUID 你的UUID', `UUID ${uuid.slice(0, 8)}`),
        body:
          'UUID: ' + uuid + '\n' +
          body
      })
    });

    const text = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({ error: 'GitHub API error', details: text });
    }

    return res.status(200).json({ ok: true, uuid, data: JSON.parse(text) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
