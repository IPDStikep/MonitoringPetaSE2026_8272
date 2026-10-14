// Vercel server-side proxy. Secrets are configured in Vercel Environment Variables.
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Metode tidak diizinkan.' });
  }

  const gasUrl = process.env.GAS_WEB_APP_URL;
  const token = process.env.GAS_API_TOKEN;
  if (!gasUrl || !token) {
    return res.status(500).json({ success: false, message: 'Konfigurasi backend belum lengkap di Vercel.' });
  }

  const body = req.body || {};
  const allowed = new Set(['get', 'create', 'update', 'delete']);
  if (!allowed.has(body.action)) {
    return res.status(400).json({ success: false, message: 'Aksi tidak dikenal.' });
  }

  try {
    const upstream = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...body, token })
    });
    const raw = await upstream.text();
    let data;
    try { data = JSON.parse(raw); }
    catch (_) { throw new Error('Backend Apps Script mengembalikan respons yang tidak valid. Pastikan URL deployment berakhiran /exec.'); }
    if (!upstream.ok) {
      return res.status(502).json({ success: false, message: data.message || 'Backend Google Apps Script gagal.' });
    }
    return res.status(200).json(data);
  } catch (error) {
    return res.status(502).json({ success: false, message: error.message || 'Tidak dapat menghubungi backend.' });
  }
};
