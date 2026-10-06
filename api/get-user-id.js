export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 后端生成 UserID
  function generateUserID() {
    return 'user-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
  }

  const userID = generateUserID();

  return res.status(200).json({ userID });
}
