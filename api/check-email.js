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

  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

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
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json'
  };

  try {
    // 1. 读文件
    const getRes = await fetch(`${API_BASE}/repos/${REPO}/contents/${FILE_PATH}`, { headers });
    if (!getRes.ok) {
      return res.status(500).json({ error: 'Failed to read allowed-emails.json' });
    }
    const fileData = await getRes.json();
    const content = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf-8'));
    const sha = fileData.sha;

    const developers = (content.developers || []).map(e => e.toLowerCase());
    const users = (content.users || []).map(e => e.toLowerCase());

    // 2. 判断身份
    if (developers.includes(normalized)) {
      return res.status(200).json({ ok: true, role: 'developer', email: normalized });
    }
    if (users.includes(normalized)) {
      return res.status(200).json({ ok: true, role: 'user', email: normalized });
    }

    // 3. 自动收录到 users
    content.users = content.users || [];
    content.users.push(normalized);

    const newContentBase64 = Buffer.from(JSON.stringify(content, null, 2)).toString('base64');

    const putRes = await fetch(`${API_BASE}/repos/${REPO}/contents/${FILE_PATH}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: `auto-add user: ${normalized}`,
        content: newContentBase64,
        sha: sha
      })
    });

    if (!putRes.ok) {
      const text = await putRes.text();
      console.error('Failed to write file:', text);
      return res.status(200).json({ ok: true, role: 'user', email: normalized, warning: 'auto-add failed' });
    }

    return res.status(200).json({ ok: true, role: 'user', email: normalized, added: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
