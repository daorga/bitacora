module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { nombre, email, password, telefono } = req.body;
  if (!nombre || !email || !password) return res.status(400).json({ error: 'Nombre, email y contraseña requeridos' });

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_KEY;

  try {
    // Simple SHA-256 hash — no external deps needed
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'bitacora_salt_2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const password_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const r = await fetch(`${SB_URL}/rest/v1/usuarios`, {
      method: 'POST',
      headers: {
        'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json', 'Prefer': 'return=representation'
      },
      body: JSON.stringify({ nombre, email, password_hash, telefono: telefono || null, rol: 'admin' })
    });

    if (!r.ok) {
      const err = await r.json();
      if (err.code === '23505') return res.status(409).json({ error: 'Este email ya está registrado' });
      return res.status(500).json({ error: 'Error al crear usuario', detail: JSON.stringify(err) });
    }
    const d = await r.json();
    return res.status(200).json({ id: d[0].id, nombre: d[0].nombre, email: d[0].email });
  } catch (e) {
    return res.status(500).json({ error: 'Error del servidor', detail: e.message });
  }
};
