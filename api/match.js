export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { nombreDetectado, visitasEsperadas } = req.body;
  if (!nombreDetectado || !visitasEsperadas?.length) return res.status(200).json({ match: null });

  const apiKey = process.env.ANTHROPIC_API_KEY;

  try {
    const lista = visitasEsperadas.map((v, i) => `${i+1}. "${v.nombre}" (ID: ${v.id})`).join('\n');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Compara el nombre detectado en una identificación con una lista de visitas esperadas. Considera que los nombres mexicanos pueden estar en diferente orden (apellido paterno, apellido materno, nombre), pueden tener un apellido o dos, y puede haber variaciones menores de acentos o lectura.

Nombre detectado en la identificación: "${nombreDetectado}"

Lista de visitas esperadas hoy:
${lista}

Responde SOLO con JSON sin backticks:
{"match": true, "id": <ID del match>, "confianza": "alta|media", "nombreEsperado": "<nombre como está en la lista>"} 
Si no hay match claro: {"match": false}`
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';
    
    let parsed;
    try { parsed = JSON.parse(text.replace(/```json|```/g, '').trim()); }
    catch { parsed = { match: false }; }

    if (parsed.match && parsed.id) {
      const visita = visitasEsperadas.find(v => v.id === parsed.id);
      if (visita) parsed.visita = visita;
    }

    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ match: false, error: e.message });
  }
}
