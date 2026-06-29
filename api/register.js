const bcrypt = require('bcryptjs');

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
    const hash = await bcrypt.hash(password, 10);
    const r = await fetch(`${SB_URL}/rest/v1/usuarios`, {
      method: 'POST',
      headers: {
        'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json', 'Prefer': 'return=representation'
      },
      body: JSON.stringify({ nombre, email, password_hash: hash, telefono: telefono || null, rol: 'admin' })
    });
    if (!r.ok) {
      const err = await r.json();
      if (err.code === '23505') return res.status(409).json({ error: 'Este email ya está registrado' });
      return res.status(500).json({ error: 'Error al crear usuario' });
    }
    const data = await r.json();
    return res.status(200).json({ id: data[0].id, nombre: data[0].nombre, email: data[0].email });
  } catch (e) {
    return res.status(500).json({ error: 'Error del servidor', detail: e.message });
  }
};
