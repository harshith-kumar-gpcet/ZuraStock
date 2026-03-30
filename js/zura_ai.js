/**
 * ZuraAI — Intelligent Financial Assistant logic
 */

class ZuraAI {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.currentSymbol = this.getVisibleSymbol();
        this.init();
    }

    init() {
        this.createChatElements();
        this.setupEventListeners();
        this.loadGreeting();
    }

    getVisibleSymbol() {
        // Try to get symbol from URL or page elements
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('symbol')) return urlParams.get('symbol');
        
        const symEl = document.querySelector('.ticker-symbol, .pick-sym');
        if (symEl) return symEl.innerText.split(' ')[0];

        // If on dashboard, return 'THE MARKET'
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
            return 'THE MARKET';
        }

        return 'RELIANCE';
    }

    createChatElements() {
        const chatHTML = `
            <div class="zura-ai-toggle" id="zuraToggle">
                <div class="zura-logo-z">Z</div>
                <span class="zura-toggle-text">Zura AI</span>
                <div class="badge" id="zuraBadge" style="display:none;">1</div>
            </div>

            <div class="zura-chat-window" id="zuraChat">
                <div class="chat-header">
                    <div class="chat-header-info">
                        <div class="zura-logo-z-mini">Z</div>
                        <div class="chat-header-text">
                            <h3>ZuraAI</h3>
                            <span>AI Financial Assistant</span>
                        </div>
                    </div>
                    <div class="chat-close" id="zuraClose"><i class="fas fa-times"></i></div>
                </div>
                
                <div class="chat-messages" id="chatMsgs"></div>
                
                <div class="chat-input-area">
                    <input type="text" id="chatInput" placeholder="${this.currentSymbol === 'THE MARKET' ? 'Ask me about the market...' : 'Ask me about ' + this.currentSymbol + '...'}">
                    <button class="chat-send-btn" id="chatSend"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', chatHTML);
        
        this.toggleBtn = document.getElementById('zuraToggle');
        this.chatWindow = document.getElementById('zuraChat');
        this.closeBtn = document.getElementById('zuraClose');
        this.input = document.getElementById('chatInput');
        this.sendBtn = document.getElementById('chatSend');
        this.msgsContainer = document.getElementById('chatMsgs');
    }

    setupEventListeners() {
        this.toggleBtn.onclick = () => this.toggleChat();
        this.closeBtn.onclick = () => this.toggleChat(false);
        
        this.sendBtn.onclick = () => this.sendMessage();
        this.input.onkeypress = (e) => {
            if (e.key === 'Enter') this.sendMessage();
        };
    }

    toggleChat(force = null) {
        this.isOpen = force !== null ? force : !this.isOpen;
        this.chatWindow.classList.toggle('active', this.isOpen);
        
        if (this.isOpen) {
            document.getElementById('zuraBadge').style.display = 'none';
            this.input.focus();
        }
    }

    async loadGreeting() {
        try {
            const res = await fetch('/api/ai-greeting');
            const data = await res.json();
            this.addMessage(data.message, 'ai');
        } catch (e) {
            this.addMessage("Hello! I'm Zura. How can I assist you with your investments today?", 'ai');
        }
    }

    async sendMessage() {
        const query = this.input.value.trim();
        if (!query) return;

        this.input.value = '';
        this.addMessage(query, 'user');
        
        // Show typing indicator
        const typingId = this.showTyping();
        
        try {
            const res = await fetch('/api/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: query,
                    symbol: this.getVisibleSymbol()
                })
            });
            const data = await res.json();
            
            this.removeTyping(typingId);
            this.addMessage(data.response, 'ai');
        } catch (err) {
            this.removeTyping(typingId);
            this.addMessage("I'm having trouble connecting to my brain right now. Please try again in a moment.", 'ai');
        }
    }

    addMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message msg-${sender}`;
        
        // Simple markdown parsing for bold
        let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        msgDiv.innerHTML = html;
        
        this.msgsContainer.appendChild(msgDiv);
        this.msgsContainer.scrollTop = this.msgsContainer.scrollHeight;
    }

    showTyping() {
        const id = 'typing-' + Date.now();
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message msg-ai typing-indicator-container';
        typingDiv.id = id;
        typingDiv.innerHTML = `
            <div class="typing">
                <span></span><span></span><span></span>
            </div>
        `;
        this.msgsContainer.appendChild(typingDiv);
        this.msgsContainer.scrollTop = this.msgsContainer.scrollHeight;
        return id;
    }

    removeTyping(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    window.zuraAI = new ZuraAI();
});
