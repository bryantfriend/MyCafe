import { db } from '../js/firebase-init.js';
import { recordAnalyticsEvent } from '../packages/domain/analytics/growthAnalytics.js';
import { recordLocalLoyaltyEvent } from '../packages/domain/loyalty/loyaltyEngine.js';

/**
 * Base Game Class
 * Provides common functionality for all games, including UI management and lifecycle hooks.
 */
class Game {
    constructor(config) {
        this.title = config.title || 'Game';
        this.containerId = config.containerId || 'game-container';
        this.container = null; // Will be acquired when needed
        this.isGameOver = false;

        this.ui = {
            turnIndicator: null,
            messageBox: null,
            messageTitle: null,
            messageText: null,
            messageCloseBtn: null
        };
    }

    /**
     * Initializes the game UI and sets up common elements.
     */
    initBaseUI() {
        this.injectBaseStyles();
        this.renderHeader();
        this.renderCommonModals();
        this.setupKeyboardListeners();
        this.trackLoyaltyPlay();
    }

    trackLoyaltyPlay() {
        const gameId = this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'game';
        const dayKey = new Date().toISOString().slice(0, 10);
        const params = new URLSearchParams(window.location.search);
        const cafeId = params.get('cafeId') || params.get('cafe') || '';
        recordLocalLoyaltyEvent('game-play', {
            gameId,
            cafeId,
            dedupeKey: `game-play:${gameId}:${dayKey}`,
            xp: 10
        });
        recordAnalyticsEvent(db, 'game-engagement', {
            cafeId,
            gameId,
            source: cafeId ? 'cafe-waiting-game' : 'games-hub'
        });
    }

    injectBaseStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            .game-header {
                background: white;
                border-bottom: 2px solid #EADDCD;
                margin-bottom: 3rem;
                padding: 1.5rem 0;
                width: 100%;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
                position: relative;
                z-index: 50;
            }
            .back-btn {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                color: #5D4037;
                font-weight: 700;
                padding: 0.75rem 1.25rem;
                border-radius: 1rem;
                transition: all 0.2s;
                text-decoration: none;
                background: #FDFBF7;
                border: 1px solid #E8D5C4;
            }
            .back-btn:hover {
                background: #E8D5C4;
                transform: translateX(-4px);
            }
        `;
        document.head.appendChild(style);
    }

    renderHeader() {
        const header = document.createElement('header');
        header.className = 'game-header';
        header.innerHTML = `
            <div class="max-w-7xl mx-auto px-6 flex items-center justify-between">
                <a href="../index.html" class="back-btn">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                    Back to Games
                </a>
                <div class="text-center">
                    <h1 class="text-4xl md:text-5xl font-black text-amber-900 tracking-tighter uppercase leading-none">${this.title}</h1>
                    <p class="text-sm font-bold text-amber-800/50 uppercase tracking-[0.2em] mt-1">Cafe Edition</p>
                </div>
                <div class="w-40 hidden md:block"></div> 
            </div>
        `;
        document.body.prepend(header);
    }

    renderCommonModals() {
        // Shared Win/Draw Modal
        const modalHtml = `
            <div id="game-message-box" class="fixed inset-0 bg-black/80 flex items-center justify-center opacity-0 pointer-events-none transform scale-95 transition-all duration-300 z-[1000]">
                <div class="bg-stone-900 text-white rounded-3xl p-10 text-center shadow-2xl max-w-md w-full mx-4 border border-white/10">
                    <h2 id="game-message-title" class="text-4xl font-black mb-4 text-amber-400 uppercase tracking-tighter"></h2>
                    <p id="game-message-text" class="text-xl text-stone-300 mb-8 font-medium"></p>
                    <button id="game-message-close-btn" class="bg-amber-600 hover:bg-amber-700 text-white font-black py-4 px-10 rounded-2xl shadow-xl transition-all transform hover:-translate-y-1 active:translate-y-0 uppercase tracking-widest">
                        Play Again
                    </button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        this.ui.messageBox = document.getElementById('game-message-box');
        this.ui.messageTitle = document.getElementById('game-message-title');
        this.ui.messageText = document.getElementById('game-message-text');
        this.ui.messageCloseBtn = document.getElementById('game-message-close-btn');

        this.ui.messageCloseBtn.addEventListener('click', () => {
            this.hideModal(this.ui.messageBox);
            this.restart();
        });
    }

    showModal(modal) {
        modal.classList.remove('opacity-0', 'pointer-events-none', 'scale-95');
        modal.classList.add('opacity-100', 'pointer-events-auto', 'scale-100');
    }

    hideModal(modal) {
        modal.classList.add('opacity-0', 'pointer-events-none', 'scale-95');
        modal.classList.remove('opacity-100', 'pointer-events-auto', 'scale-100');
    }

    showGameOver(title, message) {
        this.isGameOver = true;
        this.ui.messageTitle.textContent = title;
        this.ui.messageText.textContent = message;
        setTimeout(() => this.showModal(this.ui.messageBox), 600);
    }

    setupKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'r' || e.key === 'R') {
                if (this.isGameOver) this.restart();
            }
        });
    }

    // Lifecycle hooks to be overridden by subclasses
    init() { throw new Error('Method "init()" must be implemented.'); }
    start() { throw new Error('Method "start()" must be implemented.'); }
    restart() { throw new Error('Method "restart()" must be implemented.'); }
    cleanup() { /* Optional cleanup */ }
}

export default Game;
