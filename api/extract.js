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
            { type: 'text', text: `Eres un sistema de lectura de identificaciones oficiales para control de acceso en México.

Analiza la imagen y detecta automáticamente qué tipo de documento es, luego extrae la información visible. Acepta cualquiera de estos documentos:

- INE / IFE (Credencial para Votar): contiene NOMBRE, CURP, CLAVE DE ELECTOR, FECHA DE NACIMIENTO
- Licencia de conducir: contiene NOMBRE, fecha de nacimiento, número de licencia, vigencia
- Pasaporte mexicano: contiene NOMBRE, fecha de nacimiento, número de pasaporte, nacionalidad
- Cualquier otra identificación oficial mexicana

Aunque la imagen tenga reflejos, esté inclinada o no sea perfecta, haz tu mejor esfuerzo para leer los datos. Prefiere devolver datos parciales a rechazar el documento.

Responde ÚNICAMENTE con un objeto JSON válido, sin backticks, sin texto adicional:
{"esINE":true,"tipoDoc":"INE","nombre":"nombre completo en orden natural","curp":"CURP si aplica y es legible","claveElector":"si aplica","fechaNac":"fecha de nacimiento si es legible","observaciones":"nota breve solo si hay problema importante"}

Valores válidos para tipoDoc: "INE", "Licencia", "Pasaporte", "Otra"

Si definitivamente no es ninguna identificación oficial: {"esINE":false,"tipoDoc":"","nombre":"","curp":"","claveElector":"","fechaNac":"","observaciones":"La imagen no muestra una identificación oficial"}` }
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
