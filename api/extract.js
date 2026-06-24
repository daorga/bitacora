export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { image, mediaType } = req.body;
  if (!image) return res.status(400).json({ error: 'Imagen requerida' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API Key no configurada en el servidor' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image } },
            { type: 'text', text: `Eres un sistema de lectura de credenciales de identificación mexicanas para control de acceso.

Analiza la imagen e intenta extraer la información visible. La imagen puede ser de una INE/IFE (Credencial para Votar), o cualquier identificación oficial mexicana. Aunque la imagen tenga reflejos, esté un poco inclinada o no sea perfecta, haz tu mejor esfuerzo para leer los datos.

En una INE mexicana encontrarás:
- NOMBRE: apellido paterno, apellido materno, nombre(s) — puede estar en varias líneas
- CURP: 18 caracteres alfanuméricos (ej: OECD900804HDFRRN03)
- CLAVE DE ELECTOR: hasta 18 caracteres
- FECHA DE NACIMIENTO: DD/MM/AAAA

Responde ÚNICAMENTE con un objeto JSON válido, sin backticks, sin texto adicional:
{"esINE":true,"nombre":"nombre completo en orden natural","curp":"CURP si es legible","claveElector":"clave si es legible","fechaNac":"fecha si es legible","observaciones":"nota solo si hay problema importante"}

Si definitivamente no es una identificación: {"esINE":false,"nombre":"","curp":"","claveElector":"","fechaNac":"","observaciones":"La imagen no muestra una identificación"}

Extrae lo que puedas leer aunque la imagen no sea perfecta. Prefiere datos parciales a rechazar.` }
          ]
        }]
      })
    });

    if (response.status === 401) return res.status(401).json({ error: 'API Key inválida' });

    const data = await response.json();
    const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';

    let parsed;
    try { parsed = JSON.parse(text.replace(/```json|```/g, '').trim()); }
    catch { parsed = { esINE: false, observaciones: 'No se pudo interpretar la respuesta' }; }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: 'Error al contactar la API', detail: err.message });
  }
}
