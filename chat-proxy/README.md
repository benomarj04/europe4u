# KI-Chat (FreeLLMAPI)

The chat widget on the site (`chat.js`) talks to this Cloudflare Worker. The Worker
forwards the requests to a self-hosted [FreeLLMAPI](https://github.com/tashfeenahmed/freellmapi)
instance. The API key and the system prompt stay on the server, so visitors never see them.

```
Browser (chat.js) ──► Cloudflare Worker (worker.js, holds the key) ──► FreeLLMAPI /v1 ──► free LLM providers
```

## Setup

1. **Run FreeLLMAPI** somewhere that has a public HTTPS URL (VPS + Docker, see
   its [install guide](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/install/01-install.md)).
   In the dashboard, add provider keys (e.g. Google, Groq) and copy the unified key from the **Keys** page.
2. **Deploy the Worker:**
   ```bash
   cd chat-proxy
   # edit ALLOWED_ORIGIN and FREELLMAPI_URL in wrangler.toml
   npx wrangler secret put FREELLMAPI_KEY   # paste freellmapi-...
   npx wrangler deploy
   ```
3. Put the Worker URL (`https://europe4u-chat.<subdomain>.workers.dev/chat`) into
   `CHAT_ENDPOINT` at the top of `chat.js`.

To change what the assistant knows or says, edit `SYSTEM_PROMPT` in `worker.js`.
