export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { telefono, nombreVisitante, instruccion, lugar, hora } = req.body;
  if (!telefono || !nombreVisitante) return res.status(400).json({ error: 'Teléfono y nombre requeridos' });

  const TWILIO_SID   = process.env.TWILIO_SID;
  const TWILIO_TOKEN = process.env.TWILIO_TOKEN;
  const TWILIO_FROM  = process.env.TWILIO_FROM;

  const mensajes = {
    'acceso':    `✅ Bitácora: ${nombreVisitante} acaba de ingresar por ${lugar||'recepción'} a las ${hora}. Acceso autorizado.`,
    'llamar':    `📞 Bitácora: ${nombreVisitante} llegó a ${lugar||'recepción'} a las ${hora}. Requiere tu autorización para ingresar.`,
    'acompañar': `🚶 Bitácora: ${nombreVisitante} llegó a ${lugar||'recepción'} a las ${hora}. El guardia lo acompañará a su destino.`,
  };

  const body = mensajes[instruccion] || `Bitácora: ${nombreVisitante} llegó a las ${hora}.`;

  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ To: telefono, From: TWILIO_FROM, Body: body }).toString()
    });

    const data = await r.json();
    if (!r.ok) return res.status(500).json({ error: data.message || 'Error Twilio' });
    return res.status(200).json({ ok: true, sid: data.sid });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
