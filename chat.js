// KI-Reiseberater-Chat (FreeLLMAPI über den Proxy in chat-proxy/worker.js)
(function () {
    // URL des Cloudflare-Workers nach dem Deployment hier eintragen
    const CHAT_ENDPOINT = 'https://europe4u-chat.YOUR-SUBDOMAIN.workers.dev/chat';
    const WHATSAPP_NUMBER = '436601500001';
    const MAX_HISTORY = 12;

    const history = [];

    const toggle = document.createElement('button');
    toggle.className = 'chat-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'افتح المحادثة مع المستشار الذكي');
    toggle.textContent = '💬';

    const panel = document.createElement('div');
    panel.className = 'chat-panel';
    panel.hidden = true;
    panel.innerHTML = `
        <div class="chat-header">
            <span>مستشار السفر الذكي</span>
            <button type="button" class="chat-close" aria-label="إغلاق">×</button>
        </div>
        <div class="chat-messages" aria-live="polite"></div>
        <form class="chat-form">
            <input type="text" class="chat-input" placeholder="اكتب سؤالك هنا..." maxlength="500" required>
            <button type="submit" class="chat-send">إرسال</button>
        </form>
        <a class="chat-whatsapp" href="https://wa.me/${WHATSAPP_NUMBER}" target="_blank" rel="noopener">تحدث مع مستشار حقيقي عبر واتساب</a>
    `;

    document.body.appendChild(toggle);
    document.body.appendChild(panel);

    const messages = panel.querySelector('.chat-messages');
    const form = panel.querySelector('.chat-form');
    const input = panel.querySelector('.chat-input');
    const sendButton = panel.querySelector('.chat-send');

    function addMessage(role, text) {
        const bubble = document.createElement('div');
        bubble.className = `chat-msg chat-msg-${role}`;
        bubble.textContent = text;
        messages.appendChild(bubble);
        messages.scrollTop = messages.scrollHeight;
        return bubble;
    }

    function setOpen(open) {
        panel.hidden = !open;
        toggle.hidden = open;
        if (open) {
            if (!messages.childElementCount) {
                addMessage('assistant', 'مرحباً! أنا مستشار السفر الذكي لـ Europe4you. كيف يمكنني مساعدتك في التخطيط لرحلتك إلى سويسرا أو النمسا؟');
            }
            input.focus();
        }
    }

    toggle.addEventListener('click', () => setOpen(true));
    panel.querySelector('.chat-close').addEventListener('click', () => setOpen(false));

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        addMessage('user', text);
        history.push({ role: 'user', content: text });

        sendButton.disabled = true;
        const pending = addMessage('assistant', '...');

        try {
            const response = await fetch(CHAT_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: history.slice(-MAX_HISTORY) }),
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            pending.textContent = data.reply;
            history.push({ role: 'assistant', content: data.reply });
        } catch (error) {
            // Fehlgeschlagene Frage nicht in der History lassen
            history.pop();
            pending.textContent = 'عذراً، المستشار الذكي غير متاح حالياً. يرجى التواصل معنا عبر واتساب.';
        } finally {
            sendButton.disabled = false;
            input.focus();
        }
    });
})();
