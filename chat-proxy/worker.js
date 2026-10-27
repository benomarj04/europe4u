// Cloudflare Worker: hält den FreeLLMAPI-Key geheim und leitet Chat-Anfragen weiter.
//
// Secrets / Variablen (wrangler.toml bzw. `wrangler secret put`):
//   FREELLMAPI_URL  z.B. https://llm.example.com/v1  (eigene FreeLLMAPI-Instanz)
//   FREELLMAPI_KEY  Unified Key aus dem Dashboard (Keys-Seite), freellmapi-...
//   ALLOWED_ORIGIN  z.B. https://benomarj04.github.io

const SYSTEM_PROMPT = `أنت مستشار السفر الذكي لشركة Europe4you.
Europe4you تنظم رحلات سياحية فاخرة وخاصة إلى سويسرا والنمسا (جبال الألب) للعائلات العربية:
- إشراف كامل باللغة العربية
- فيلات خاصة ونقل خاص بسيارات مرسيدس V-Class
- طعام حلال مضمون
أجب دائماً باللغة التي يكتب بها العميل (العربية افتراضياً)، باختصار وبأسلوب ودود ومهني.
لا تخترع أسعاراً أو تواريخ أو عروضاً محددة. للأسعار والحجز وأي تفاصيل دقيقة، اطلب من العميل التواصل عبر واتساب: +43 660 1500001.
أجب فقط عن الأسئلة المتعلقة بالسفر وخدمات Europe4you.`;

const MAX_MESSAGES = 12;
const MAX_CHARS = 1000;

function corsHeaders(env) {
    return {
        'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
}

function json(body, status, env) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
    });
}

export default {
    async fetch(request, env) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders(env) });
        }
        if (request.method !== 'POST' || new URL(request.url).pathname !== '/chat') {
            return json({ error: 'not found' }, 404, env);
        }
        if (request.headers.get('Origin') !== env.ALLOWED_ORIGIN) {
            return json({ error: 'forbidden' }, 403, env);
        }

        let body;
        try {
            body = await request.json();
        } catch {
            return json({ error: 'invalid json' }, 400, env);
        }

        // Nur user/assistant-Nachrichten vom Browser akzeptieren, kein eigener System-Prompt
        const messages = (Array.isArray(body.messages) ? body.messages : [])
            .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
            .slice(-MAX_MESSAGES)
            .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
        if (!messages.length || messages[messages.length - 1].role !== 'user') {
            return json({ error: 'no message' }, 400, env);
        }

        const upstream = await fetch(`${env.FREELLMAPI_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${env.FREELLMAPI_KEY}`,
            },
            body: JSON.stringify({
                model: 'auto',
                max_tokens: 500,
                messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
            }),
        });
        if (!upstream.ok) {
            return json({ error: 'upstream error' }, 502, env);
        }

        const data = await upstream.json();
        const reply = data.choices?.[0]?.message?.content?.trim();
        if (!reply) {
            return json({ error: 'empty reply' }, 502, env);
        }
        return json({ reply }, 200, env);
    },
};
