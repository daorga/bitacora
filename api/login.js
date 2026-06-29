const bcrypt = require('bcryptjs');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_KEY;

  try {
    const r = await fetch(`${SB_URL}/rest/v1/usuarios?email=eq.${encodeURIComponent(email)}&activo=eq.true`, {
      headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
    });
    const users = await r.json();
    if (!users.length) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    const user = users[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    return res.status(200).json({
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      telefono: user.telefono,
      rol: user.rol
    });
  } catch (e) {
    return res.status(500).json({ error: 'Error del servidor', detail: e.message });
  }
};
