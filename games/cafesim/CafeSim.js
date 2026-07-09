import Game from '../Game.js';

/**
 * CafeSim Class
 * A detailed cafe management simulation with isometric graphics.
 */
class CafeSim extends Game {
    constructor() {
        super({ title: 'Café Star', containerId: 'cafe-sim-game' });

        // Economy & Progress
        this.money = 100;
        this.customersServed = 0;
        this.reputation = 50; // 0-100
        this.shopUnlocked = false;

        // Assets (Procedural SVG Base64)
        this.assets = {
            floor: null,
            counter: null,
            machine: null,
            barista: null,
            customer: null,
            plant: null,
            rug: null,
            frother: null,
            dairy: null
        };

        // Entities
        this.customers = [];
        this.barista = {
            x: 4, y: 4, // Grid coords
            targetX: 4, targetY: 4,
            status: 'IDLE',
            carrying: null,
            prepTimer: 0,
            prepRate: 1,
            preppingItem: null
        };

        // Grid Configuration
        this.gridSize = 8;
        this.cellSize = 60; // Base size for isometric drawing

        // Rendering State
        this.canvas = null;
        this.ctx = null;
        this.lastTime = 0;

        // Upgrades Array
        this.upgrades = [
            { id: 'fast_brew', name: 'High-Pressure Pump', desc: 'Brew everything 50% faster', cost: 150, active: false, category: 'EQUIPMENT' },
            { id: 'milk_station', name: 'Milk Frother', desc: 'Unlock Cappuccinos (+$10)', cost: 250, active: false, category: 'MENU' },
            { id: 'dairy_pro', name: 'Dairy Station', desc: 'Unlock Lattes (+$20)', cost: 400, active: false, category: 'MENU' },
            { id: 'auto_milk', name: 'Premium Beans', desc: 'Bonus $5 tip on all orders', cost: 600, active: false, category: 'EQUIPMENT' }
        ];

        this.spawnTimer = 0;
        this.spawnRate = 6000; // ms
    }

    init() {
        this.initBaseUI();
        this.setupCanvas();
        this.generateAssets();
        this.setupAudio();
        this.setupEventListeners();
        this.startLoop();
    }

    setupAudio() {
        if (typeof Tone !== 'undefined') {
            this.synth = new Tone.PolySynth(Tone.Synth).toDestination();
            this.synth.set({
                oscillator: { type: 'sine' },
                envelope: { attack: 0.1, decay: 0.2, sustain: 0.3, release: 1 }
            });
        }
    }

    setupCanvas() {
        this.canvas = document.getElementById('main-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    generateAssets() {
        const createImg = (svg) => {
            const img = new Image();
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
            return img;
        };

        this.assets.barista = createImg(`
            <svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#FAD0C3"/>
                        <stop offset="100%" stop-color="#E8D5C4"/>
                    </linearGradient>
                </defs>
                <path d="M20 40 L80 40 L80 100 L20 100 Z" fill="#4A2C2A"/>
                <path d="M30 40 L30 100 M70 40 L70 100" stroke="#3E2723" stroke-width="2"/>
                <circle cx="50" cy="25" r="18" fill="url(#skin)"/>
                <path d="M35 15 Q50 5 65 15" fill="#2a1b19"/>
                <rect x="15" y="45" width="10" height="30" fill="white" rx="5"/>
                <rect x="75" y="45" width="10" height="30" fill="white" rx="5"/>
            </svg>
        `);

        this.assets.plant = createImg(`
            <svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
                <rect x="25" y="60" width="30" height="30" fill="#8B4513" rx="4"/>
                <path d="M40 60 Q20 30 10 40 Q40 0 40 30 Q70 0 70 40 Q60 30 40 60" fill="#2D5A27"/>
                <path d="M40 60 Q30 40 20 50 Q40 20 40 40 Q50 20 60 50 Q50 40 40 60" fill="#4F7942"/>
            </svg>
        `);

        this.assets.rug = createImg(`
            <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
                <rect x="5" y="5" width="110" height="70" fill="#8B0000" rx="4"/>
                <rect x="15" y="15" width="90" height="50" fill="none" stroke="#D4A373" stroke-width="2" stroke-dasharray="4 2"/>
                <circle cx="60" cy="40" r="15" fill="none" stroke="#D4A373" stroke-width="2"/>
            </svg>
        `);

        this.assets.customer = createImg(`
            <svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="25" r="18" fill="#E8D5C4"/>
                <path d="M25 40 Q50 35 75 40 L80 100 L20 100 Z" fill="#A3B18A"/>
                <path d="M40 70 L60 70" stroke="rgba(255,255,255,0.2)" stroke-width="8" stroke-linecap="round"/>
            </svg>
        `);

        this.assets.machine = createImg(`
            <svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="chrome" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stop-color="#E5E7EB"/>
                        <stop offset="50%" stop-color="#9CA3AF"/>
                        <stop offset="100%" stop-color="#374151"/>
                    </linearGradient>
                </defs>
                <rect x="10" y="10" width="100" height="80" fill="url(#chrome)" rx="5"/>
                <rect x="20" y="20" width="80" height="40" fill="#111" rx="3"/>
                <circle cx="30" cy="75" r="8" fill="#F59E0B"/>
                <circle cx="90" cy="75" r="8" fill="#F59E0B"/>
                <path d="M50 75 L70 75" stroke="white" stroke-width="4" stroke-linecap="round"/>
            </svg>
        `);

        this.assets.frother = createImg(`
            <svg viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="20" width="40" height="50" fill="#E5E7EB" rx="4"/>
                <path d="M20 40 L40 40 L30 65 Z" fill="#333"/>
                <rect x="25" y="10" width="10" height="15" fill="silver"/>
            </svg>
        `);

        this.assets.dairy = createImg(`
            <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="10" width="60" height="60" fill="white" stroke="#DDD" stroke-width="2" rx="4"/>
                <path d="M20 30 L60 30 L60 50 L20 50 Z" fill="#4B90FF" opacity="0.3"/>
                <text x="40" y="45" font-family="Arial" font-size="10" text-anchor="middle" fill="#666">MILK</text>
            </svg>
        `);

        this.assets.counter = createImg(`
            <svg viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 20 L50 0 L100 20 L100 60 L50 80 L0 60 Z" fill="#4A2C2A"/>
                <path d="M0 20 L50 0 L100 20 L50 40 Z" fill="rgba(255,255,255,0.7)"/>
            </svg>
        `);

        // Chalkboard Menu
        this.assets.menu = createImg(`
            <svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="0" width="80" height="100" fill="#2a1b19" stroke="#D4A373" stroke-width="4"/>
                <text x="40" y="20" font-family="Arial" font-size="10" text-anchor="middle" fill="#FDF6F0" opacity="0.8">MENU</text>
                <circle cx="20" cy="40" r="2" fill="white" opacity="0.3"/>
                <rect x="30" y="38" width="30" height="2" fill="white" opacity="0.3"/>
                <circle cx="20" cy="55" r="2" fill="white" opacity="0.3"/>
                <rect x="30" y="53" width="30" height="2" fill="white" opacity="0.3"/>
                <circle cx="20" cy="70" r="2" fill="white" opacity="0.3"/>
                <rect x="30" y="68" width="30" height="2" fill="white" opacity="0.3"/>
            </svg>
        `);
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.handleClick(e));
        document.getElementById('cafesim-back-btn').onclick = () => window.location.href = '../index.html';
        document.getElementById('open-shop-btn').onclick = () => this.toggleShop(true);
        document.getElementById('close-shop-btn').onclick = () => this.toggleShop(false);
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const { x, y } = this.screenToGrid(mouseX, mouseY);
        if (x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize) {
            const gridX = Math.floor(x);
            const gridY = Math.floor(y);

            if (gridX === 0 && gridY === 4) {
                this.moveToMachine();
                return;
            }

            const customer = this.customers.find(c => Math.floor(c.x) === gridX && Math.floor(c.y) === gridY);
            if (customer && customer.status === 'WAITING_ORDER') {
                this.moveToCustomer(customer);
                return;
            }

            this.barista.targetX = gridX;
            this.barista.targetY = gridY;
            this.barista.status = 'MOVING';
            this.barista.interactionTarget = null;
        }
    }

    moveToMachine() {
        this.barista.targetX = 1; this.barista.targetY = 4;
        this.barista.status = 'MOVING_TO_MACHINE';
        this.barista.interactionTarget = 'MACHINE';
    }

    moveToCustomer(customer) {
        this.barista.targetX = customer.x; this.barista.targetY = customer.y;
        this.barista.status = 'MOVING_TO_CUSTOMER';
        this.barista.interactionTarget = customer;
    }

    screenToGrid(screenX, screenY) {
        const originX = this.canvas.width / 2;
        const originY = this.canvas.height / 3;
        const dx = screenX - originX;
        const dy = screenY - originY;
        const gridX = (dx / this.cellSize + dy / (this.cellSize / 2)) / 2;
        const gridY = (dy / (this.cellSize / 2) - dx / this.cellSize) / 2;
        return { x: gridX, y: gridY };
    }

    gridToScreen(gridX, gridY) {
        const originX = this.canvas.width / 2;
        const originY = this.canvas.height / 3;
        const screenX = originX + (gridX - gridY) * this.cellSize;
        const screenY = originY + (gridX + gridY) * (this.cellSize / 2);
        return { x: screenX, y: screenY };
    }

    startLoop() {
        const loop = (time) => {
            const dt = time - (this.lastTime || time);
            this.lastTime = time;
            this.update(dt);
            this.draw();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    update(dt) {
        // Barista Movement
        const moveSpeed = 0.005;
        const b = this.barista;
        const dx = b.targetX - b.x;
        const dy = b.targetY - b.y;

        if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
            b.x += dx * moveSpeed * dt;
            b.y += dy * moveSpeed * dt;
        } else {
            if (b.status === 'MOVING_TO_MACHINE') this.startPrepping();
            else if (b.status === 'MOVING_TO_CUSTOMER') this.serveCustomer(b.interactionTarget);
            else if (b.status !== 'PREPPING') b.status = 'IDLE';
        }

        // Prepping Logic
        if (b.status === 'PREPPING') {
            const prepTimes = { 'ESPRESSO': 2000, 'CAPPUCCINO': 4000, 'LATTE': 5000 };
            const timeToPrepare = prepTimes[b.preppingItem] || 2000;
            b.prepRate = (this.upgrades.find(u => u.id === 'fast_brew').active) ? 2 : 1;
            b.prepTimer += dt * b.prepRate;
            if (b.prepTimer >= timeToPrepare) {
                b.status = 'IDLE'; b.carrying = b.preppingItem; b.prepTimer = 0;
                document.getElementById('barista-status').textContent = `CARRYING ${b.carrying}`;
                if (this.synth) this.synth.triggerAttackRelease('C5', '8n');
            }
        }

        // Easy Serve
        if (b.carrying) {
            const near = this.customers.find(c => c.status === 'WAITING_ORDER' && c.order === b.carrying && Math.hypot(c.x - b.x, c.y - b.y) < 1.4);
            if (near) this.serveCustomer(near);
        }

        // Customers update
        this.customers.forEach(c => c.update(dt, this));

        // Spawn Logic
        this.spawnTimer += dt;
        if (this.spawnTimer > this.spawnRate) {
            this.spawnCustomer();
            this.spawnTimer = 0;
            this.spawnRate = Math.max(3000, this.spawnRate * 0.98);
        }
        this.customers = this.customers.filter(c => c.status !== 'GONE');
    }

    spawnCustomer() {
        if (this.customers.length >= 5) return;
        const options = ['ESPRESSO'];
        if (this.upgrades.find(u => u.id === 'milk_station' && u.active)) options.push('CAPPUCCINO');
        if (this.upgrades.find(u => u.id === 'dairy_pro' && u.active)) options.push('LATTE');
        this.customers.push(new CustomerEntity(options[Math.floor(Math.random() * options.length)]));
    }

    startPrepping() {
        const next = this.customers.find(c => c.status === 'WAITING_ORDER')?.order || 'ESPRESSO';
        this.barista.status = 'PREPPING';
        this.barista.preppingItem = next;
        this.barista.prepTimer = 0;
        document.getElementById('barista-status').textContent = `BREWING ${next}...`;
        if (this.synth) this.synth.triggerAttackRelease('G3', '16n');
    }

    serveCustomer(customer) {
        if (!customer) return;
        if (this.barista.carrying === customer.order && customer.status === 'WAITING_ORDER') {
            customer.status = 'LEAVING';
            this.barista.carrying = null; this.barista.status = 'IDLE';
            let tip = 15;
            if (customer.order === 'CAPPUCCINO') tip = 25;
            else if (customer.order === 'LATTE') tip = 35;
            if (this.upgrades.find(u => u.id === 'auto_milk').active) tip += 5;
            this.money += tip; this.customersServed++;
            document.getElementById('stat-money').textContent = `$${this.money}`;
            document.getElementById('stat-customers').textContent = this.customersServed;
            document.getElementById('barista-status').textContent = 'READY';
            if (this.synth) this.synth.triggerAttackRelease(['G4', 'C5'], '8n');
        }
    }

    toggleShop(open) {
        const modal = document.getElementById('shop-modal');
        if (open) { this.renderShop(); modal.classList.remove('hidden'); setTimeout(() => modal.classList.add('opacity-100'), 10); }
        else { modal.classList.remove('opacity-100'); setTimeout(() => modal.classList.add('hidden'), 300); }
    }

    renderShop() {
        const categories = [...new Set(this.upgrades.map(u => u.category))];
        const container = document.getElementById('shop-items');

        container.innerHTML = categories.map(cat => `
            <div class="mb-6">
                <h3 class="chalk-text text-xl border-b border-amber-900/50 mb-4 pb-1 uppercase tracking-widest text-amber-200/50">${cat}</h3>
                <div class="space-y-3">
                    ${this.upgrades.filter(u => u.category === cat).map(item => `
                        <div class="flex items-center justify-between p-4 bg-stone-900/80 border border-amber-600/20 rounded-xl hover:border-amber-600/50 transition-colors">
                            <div class="flex-1">
                                <p class="font-bold text-amber-100">${item.name}</p>
                                <p class="text-xs text-amber-100/40 italic">${item.desc}</p>
                            </div>
                            <button 
                                onclick="window.game.buyUpgrade('${item.id}')"
                                class="ml-4 px-6 py-2 rounded-lg font-black text-sm transition-all transform active:scale-95 ${item.active ? 'bg-green-800 text-green-100 cursor-not-allowed opacity-50' : 'bg-amber-700 text-white hover:bg-amber-600'}"
                                ${item.active || this.money < item.cost ? 'disabled' : ''}
                            >
                                ${item.active ? 'ACTIVE' : `$${item.cost}`}
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    buyUpgrade(id) {
        const u = this.upgrades.find(upgrade => upgrade.id === id);
        if (u && !u.active && this.money >= u.cost) {
            this.money -= u.cost; u.active = true;
            document.getElementById('stat-money').textContent = `$${this.money}`;
            this.renderShop();
            if (this.synth) this.synth.triggerAttackRelease(['C4', 'E4', 'G4'], '4n');
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const light = this.ctx.createRadialGradient(this.canvas.width / 2, this.canvas.height / 2, 100, this.canvas.width / 2, this.canvas.height / 2, 800);
        light.addColorStop(0, 'rgba(255, 230, 200, 0.05)'); light.addColorStop(1, 'rgba(0,0,0,0.2)');
        this.ctx.fillStyle = light; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const { x, y } = this.gridToScreen(r, c);
                if (r === 4 && c === 4) this.drawSprite(this.assets.rug, x, y - 5, 200);

                this.ctx.beginPath();
                this.ctx.moveTo(x, y); this.ctx.lineTo(x + this.cellSize, y + this.cellSize / 2);
                this.ctx.lineTo(x, y + this.cellSize); this.ctx.lineTo(x - this.cellSize, y + this.cellSize / 2);
                this.ctx.closePath();
                this.ctx.fillStyle = (r + c) % 2 === 0 ? '#3E2723' : '#4A2C2A';
                this.ctx.fill(); this.ctx.strokeStyle = 'rgba(212,163,115,0.1)'; this.ctx.stroke();

                if (r === 0 && c === 4) this.drawSprite(this.assets.machine, x, y - 20, 60);
                if (r === 0 && c === 3 && this.upgrades.find(u => u.id === 'milk_station').active) this.drawSprite(this.assets.frother, x, y - 20, 50);
                if (r === 0 && c === 5 && this.upgrades.find(u => u.id === 'dairy_pro').active) this.drawSprite(this.assets.dairy, x, y - 20, 60);
                if (r === 0 && c === 1) this.drawSprite(this.assets.menu, x, y - 100, 80);
                if (r === 0) this.drawSprite(this.assets.counter, x, y - 10, 80);
                if ((r === 7 && c === 0) || (r === 7 && c === 7)) this.drawSprite(this.assets.plant, x, y - 30, 60);
            }
        }

        this.customers.forEach(cust => {
            const { x, y } = this.gridToScreen(cust.x, cust.y);
            this.drawSprite(this.assets.customer, x, y - 40, 50);
            if (cust.status === 'WAITING_ORDER') this.drawBubble(`${cust.order}?`, x, y - 100);
        });

        const bPos = this.gridToScreen(this.barista.x, this.barista.y);
        this.drawSprite(this.assets.barista, bPos.x, bPos.y - 45, 60);

        if (this.barista.status === 'PREPPING') {
            const barW = 50, barH = 8;
            const prepTimes = { 'ESPRESSO': 2000, 'CAPPUCCINO': 4000, 'LATTE': 5000 };
            const progress = this.barista.prepTimer / (prepTimes[this.barista.preppingItem] || 2000);
            this.ctx.fillStyle = '#111'; this.ctx.fillRect(bPos.x - barW / 2, bPos.y - 80, barW, barH);
            this.ctx.fillStyle = '#D4A373'; this.ctx.fillRect(bPos.x - barW / 2, bPos.y - 80, barW * progress, barH);
        }

        if (this.barista.carrying) {
            const icons = { 'ESPRESSO': '☕', 'CAPPUCCINO': '🥛', 'LATTE': '🧋' };
            this.ctx.font = '20px Arial';
            this.ctx.fillText(icons[this.barista.carrying], bPos.x + 20, bPos.y - 60);
        }

        // Draw Ambient Steam (Machine)
        this.ctx.save();
        const { x: sx, y: sy } = this.gridToScreen(0, 4);
        const steamY = sy - 40 - (Math.sin(Date.now() / 300) * 10);
        this.ctx.globalAlpha = 0.3 + Math.random() * 0.1;
        this.ctx.font = '30px Arial';
        this.ctx.fillText('💨', sx, steamY);
        this.ctx.restore();
    }

    drawSprite(img, x, y, size) {
        if (!img || !img.complete) return;
        this.ctx.drawImage(img, x - size / 2, y, size, size);
    }

    drawBubble(text, x, y) {
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath(); this.ctx.roundRect(x - 50, y - 25, 100, 30, 8); this.ctx.fill();
        this.ctx.fillStyle = '#2a1b19'; this.ctx.font = 'bold 12px Poppins'; this.ctx.textAlign = 'center';
        this.ctx.fillText(text, x, y - 5);
    }
}

class CustomerEntity {
    constructor(order = 'ESPRESSO') {
        this.order = order; this.x = 7; this.y = 4; this.targetX = 1; this.targetY = 4;
        this.status = 'ENTERING'; this.waitTimer = 0;
        this.maxWait = order === 'ESPRESSO' ? 15000 : 25000;
    }

    update(dt, game) {
        const speed = 0.002;
        if (this.status === 'ENTERING') {
            const dx = this.targetX - this.x;
            if (Math.abs(dx) > 0.1) this.x += dx * speed * dt;
            else this.status = 'WAITING_ORDER';
        } else if (this.status === 'WAITING_ORDER') {
            this.waitTimer += dt;
            if (this.waitTimer > this.maxWait) {
                this.status = 'LEAVING';
                game.money = Math.max(0, game.money - 5);
                document.getElementById('stat-money').textContent = `$${game.money}`;
            }
        } else if (this.status === 'LEAVING') {
            const dx = 7 - this.x;
            if (Math.abs(dx) > 0.1) this.x += dx * speed * dt;
            else this.status = 'GONE';
        }
    }
}

export default CafeSim;
