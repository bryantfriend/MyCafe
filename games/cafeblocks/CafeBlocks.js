import Game from '../Game.js';

/**
 * CafeBlocks Class
 * A cozy 8x8 block puzzle game with a cafe theme.
 */
class CafeBlocks extends Game {
    constructor() {
        super({ title: 'Café Blocks', containerId: 'cafe-blocks-game' });

        // Game Configuration
        this.gridSize = 8;
        this.grid = Array(8).fill().map(() => Array(8).fill(null));
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('cafeBlocksHighScore')) || 0;
        this.bestCombo = parseInt(localStorage.getItem('cafeBlocksBestCombo')) || 0;
        this.longestRun = parseInt(localStorage.getItem('cafeBlocksLongestRun')) || 0;
        this.currentRunSets = 0;

        // Block State
        this.trayBlocks = [null, null, null];
        this.draggingBlock = null;
        this.dragOffset = { x: 0, y: 0 };

        // Block Definitions (0 = empty, 1 = occupied)
        this.blockShapes = [
            { id: '1x2', shape: [[1, 1]], theme: 'Espresso', flavor: 'coffee', color: '#BC8F8F' },
            { id: '2x1', shape: [[1], [1]], theme: 'Espresso', flavor: 'coffee', color: '#BC8F8F' },
            { id: '2x2', shape: [[1, 1], [1, 1]], theme: 'Pastry Tray', color: '#DEB887' },
            { id: 'L3', shape: [[1, 0], [1, 1]], theme: 'Small table + chair', color: '#8FBC8F' },
            { id: '3x1', shape: [[1, 1, 1]], theme: 'Dessert display', color: '#F4A460' },
            { id: '1x3', shape: [[1], [1], [1]], theme: 'Dessert display', color: '#F4A460' },
            { id: '4x1', shape: [[1, 1, 1, 1]], theme: 'Long counter', color: '#CD853F' },
            { id: '1x4', shape: [[1], [1], [1], [1]], theme: 'Long counter', color: '#CD853F' },
            { id: '5x1', shape: [[1, 1, 1, 1, 1]], theme: 'Long counter', color: '#D2691E' },
            { id: '1x5', shape: [[1], [1], [1], [1], [1]], theme: 'Long counter', color: '#D2691E' },
            { id: '3x3', shape: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], theme: 'Big serving station', color: '#8B4513' },
            { id: 'T3', shape: [[1, 1, 1], [0, 1, 0]], theme: 'Serving counter', color: '#A0522D' }
        ];

        this.synth = null;
    }

    restart() {
        this.score = 0;
        this.gameOver = false;
        this.isGameOver = false;

        // Clear Grid
        this.grid = Array(8).fill().map(() => Array(8).fill(null));
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.remove('occupied');
            cell.style.background = '';
            cell.innerHTML = '';
        });

        // Clear Tray
        this.trayBlocks = [null, null, null];

        this.updateScoreUI();
        this.refreshTray();
    }

    init() {
        this.initBaseUI();
        this.setupAudio();
        this.renderGameLayout();
        this.setupEventListeners();
        this.refreshTray();
    }

    setupAudio() {
        const initAudio = () => {
            if (!this.synth) {
                this.synth = new Tone.PolySynth(Tone.Synth).toDestination();
                this.synth.volume.value = -12;
                Tone.start();
            }
            window.removeEventListener('mousedown', initAudio);
            window.removeEventListener('touchstart', initAudio);
        };
        window.addEventListener('mousedown', initAudio);
        window.addEventListener('touchstart', initAudio);
    }

    renderGameLayout() {
        const layout = `
            <div id="cafe-blocks-container" class="flex flex-col items-center justify-between h-full p-2 w-full mx-auto">
                <!-- Header with Score -->
                <div class="w-full flex justify-between items-center mb-4">
                    <div class="wooden-panel px-6 py-2 rounded-xl text-center">
                        <p class="text-xs uppercase tracking-widest opacity-70">Best Service</p>
                        <p id="high-score" class="text-xl font-bold">${this.highScore}</p>
                    </div>
                    <div class="wooden-panel px-8 py-3 rounded-2xl text-center shadow-lg border-4 border-amber-600">
                        <p class="text-xs uppercase tracking-widest opacity-70">Today's Profit</p>
                        <p id="current-score" class="text-3xl font-black text-amber-100">${this.score}</p>
                    </div>
                    <button id="cafe-back-btn" class="wooden-panel p-2 rounded-xl hover:scale-105 active:scale-95 transition-transform">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    </button>
                </div>

                <!-- 8x8 Grid -->
                <div id="game-grid" class="game-grid w-full aspect-square relative">
                    ${this.renderGridCells()}
                </div>

                <!-- Incoming OrdersTray -->
                <div class="w-full mt-4 flex-shrink-0">
                    <p class="text-amber-50 text-center text-[10px] uppercase tracking-[0.3em] font-bold mb-2 opacity-80">Incoming Orders</p>
                    <div id="block-tray" class="block-tray flex justify-center items-center gap-4 h-28 px-4 shadow-2xl">
                        <div class="tray-slot" data-slot="0"></div>
                        <div class="tray-slot" data-slot="1"></div>
                        <div class="tray-slot" data-slot="2"></div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('game-mount').innerHTML = layout;
    }

    renderGridCells() {
        let cells = '';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                cells += `<div class="grid-cell" data-row="${r}" data-col="${c}" id="cell-${r}-${c}"></div>`;
            }
        }
        return cells;
    }

    refreshTray() {
        this.trayBlocks = [0, 1, 2].map(() => {
            const block = this.blockShapes[Math.floor(Math.random() * this.blockShapes.length)];
            return { ...block, guid: Math.random().toString(36).substr(2, 9) };
        });
        this.renderTray();
        this.checkGameOver();
    }

    renderTray() {
        const slots = document.querySelectorAll('.tray-slot');
        this.trayBlocks.forEach((block, i) => {
            const slot = slots[i];
            slot.innerHTML = '';
            if (block) {
                const blockEl = this.createBlockElement(block, i);
                slot.appendChild(blockEl);
            }
        });
    }

    createBlockElement(block, trayIndex) {
        const el = document.createElement('div');
        el.className = 'block-piece relative touch-none pointer-events-auto';
        el.dataset.trayIndex = trayIndex;
        el.style.webkitUserSelect = 'none';
        el.style.userSelect = 'none';

        // CSS Grid based block layout
        const rows = block.shape.length;
        const cols = block.shape[0].length;
        el.style.display = 'grid';
        el.style.gridTemplateRows = `repeat(${rows}, 20px)`;
        el.style.gridTemplateColumns = `repeat(${cols}, 20px)`;
        el.style.gap = '2px';

        block.shape.forEach((row, r) => {
            row.forEach((cell, c) => {
                const subCell = document.createElement('div');
                subCell.style.width = '20px';
                subCell.style.height = '20px';
                subCell.style.background = cell ? block.color : 'transparent';
                subCell.style.borderRadius = '3px';
                if (cell) subCell.style.boxShadow = 'inset 0 1px 3px rgba(255,255,255,0.4)';
                el.appendChild(subCell);
            });
        });

        return el;
    }

    setupEventListeners() {
        const tray = document.getElementById('block-tray');

        // Pointer events for cross-device support
        document.addEventListener('pointerdown', (e) => this.handleDragStart(e));
        document.addEventListener('pointermove', (e) => this.handleDragMove(e));
        document.addEventListener('pointerup', (e) => this.handleDragEnd(e));

        document.getElementById('cafe-back-btn').onclick = () => window.location.href = '../index.html';
    }

    handleDragStart(e) {
        if (this.isGameOver || this.gameOver) return;

        const target = e.target.closest('.block-piece');
        if (!target) return;

        const trayIndex = target.dataset.trayIndex;
        if (this.trayBlocks[trayIndex] === null) return;

        this.draggingBlock = {
            index: trayIndex,
            data: this.trayBlocks[trayIndex],
            element: target.cloneNode(true)
        };

        // Capture pointer to ensure move/up events continue even if leaving target
        target.setPointerCapture(e.pointerId);

        // Styling for drag state
        this.draggingBlock.element.style.position = 'fixed';
        this.draggingBlock.element.style.pointerEvents = 'none';
        this.draggingBlock.element.style.zIndex = '1000';
        this.draggingBlock.element.style.opacity = '0.5';
        this.draggingBlock.element.style.transform = 'scale(1.1)';
        // Upward shadow ('above' the block)
        this.draggingBlock.element.style.filter = 'drop-shadow(0 -25px 30px rgba(0,0,0,0.7))';

        // Adjust grid for visible display during drag
        const rows = this.draggingBlock.data.shape.length;
        const cols = this.draggingBlock.data.shape[0].length;
        this.draggingBlock.element.style.gridTemplateRows = `repeat(${rows}, 30px)`;
        this.draggingBlock.element.style.gridTemplateColumns = `repeat(${cols}, 30px)`;
        Array.from(this.draggingBlock.element.children).forEach(c => {
            c.style.width = '30px';
            c.style.height = '30px';
        });

        document.body.appendChild(this.draggingBlock.element);
        this.updateDragPosition(e);
        target.style.opacity = '0';
    }

    handleDragMove(e) {
        if (!this.draggingBlock) return;
        this.updateDragPosition(e);
        this.previewPlacement(e);
    }

    updateDragPosition(e) {
        const size = 30;
        const x = e.clientX - (this.draggingBlock.data.shape[0].length * size / 2);
        // Lifted 80px (approx 2 grid spaces) above touch point
        const y = e.clientY - (this.draggingBlock.data.shape.length * size) - 80;
        this.draggingBlock.element.style.left = `${x}px`;
        this.draggingBlock.element.style.top = `${y}px`;
    }

    handleDragEnd(e) {
        if (!this.draggingBlock) return;

        const placement = this.getPlacementPosition(e);
        const originalTarget = document.querySelector(`[data-tray-index="${this.draggingBlock.index}"]`);

        if (placement && this.canPlaceBlock(this.draggingBlock.data, placement.row, placement.col)) {
            this.placeBlock(this.draggingBlock.data, placement.row, placement.col);
            this.trayBlocks[this.draggingBlock.index] = null;

            // Remove the original element since it's used
            originalTarget.parentElement.innerHTML = '';

            if (this.trayBlocks.every(b => b === null)) {
                this.refreshTray();
            } else {
                this.checkGameOver();
            }
        } else {
            // Restore visibility if failed
            if (originalTarget) originalTarget.style.opacity = '1';
        }

        // Cleanup
        this.draggingBlock.element.remove();
        this.draggingBlock = null;
        this.clearPreviews();
    }

    getPlacementPosition(e) {
        const grid = document.getElementById('game-grid');
        const gridRect = grid.getBoundingClientRect();
        const cellSize = gridRect.width / 8;

        // Offset drag position - preview should be ABOVE the visual block
        const x = e.clientX - gridRect.left;
        // 160px lift (approx 4 spaces above finger, 2 spaces above the floating block)
        const y = e.clientY - gridRect.top - (this.draggingBlock.data.shape.length * 30 / 2) - 160;

        const col = Math.floor(x / cellSize);
        const row = Math.floor(y / cellSize);

        if (row >= 0 && row < 8 && col >= 0 && col < 8) {
            return { row, col };
        }
        return null;
    }

    canPlaceBlock(block, startRow, startCol) {
        const shape = block.shape;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[0].length; c++) {
                if (shape[r][c]) {
                    const targetRow = startRow + r;
                    const targetCol = startCol + c;

                    if (targetRow >= 8 || targetCol >= 8 || targetRow < 0 || targetCol < 0) return false;
                    if (this.grid[targetRow][targetCol]) return false;
                }
            }
        }
        return true;
    }

    placeBlock(block, startRow, startCol) {
        const shape = block.shape;
        shape.forEach((row, r) => {
            row.forEach((cell, c) => {
                if (cell) {
                    const tr = startRow + r;
                    const tc = startCol + c;
                    this.grid[tr][tc] = { color: block.color, flavor: block.flavor };
                    const cellEl = document.getElementById(`cell-${tr}-${tc}`);
                    cellEl.classList.add('occupied');
                    cellEl.style.background = block.color;
                }
            });
        });

        this.score += 10;
        this.checkClears();
        this.updateScoreUI();
        if (this.synth) this.synth.triggerAttackRelease('C4', '16n');
    }

    checkClears() {
        let rowsToClear = [];
        let colsToClear = [];

        // Check rows
        for (let r = 0; r < 8; r++) {
            if (this.grid[r].every(cell => cell !== null)) rowsToClear.push(r);
        }

        // Check cols
        for (let c = 0; c < 8; c++) {
            let full = true;
            for (let r = 0; r < 8; r++) {
                if (this.grid[r][c] === null) { full = false; break; }
            }
            if (full) colsToClear.push(c);
        }

        if (rowsToClear.length > 0 || colsToClear.length > 0) {
            this.clearLines(rowsToClear, colsToClear);
        }
    }

    clearLines(rows, cols) {
        const total = rows.length + cols.length;
        if (total > this.bestCombo) {
            this.bestCombo = total;
            localStorage.setItem('cafeBlocksBestCombo', this.bestCombo);
        }

        let bonus = total > 1 ? (total - 1) * 25 : 0;

        // Flavor Bonus Check
        let flavorBonus = 0;
        rows.forEach(r => {
            for (let c = 0; c < 8; c++) {
                if (this.grid[r][c]?.flavor === 'coffee') flavorBonus += 5;
                this.animateClear(r, c);
                this.grid[r][c] = null;
            }
        });

        cols.forEach(c => {
            for (let r = 0; r < 8; r++) {
                if (this.grid[r][c]?.flavor === 'coffee') flavorBonus += 5;
                this.animateClear(r, c);
                this.grid[r][c] = null;
            }
        });

        this.score += (total * 50) + bonus + flavorBonus;

        if (this.synth) {
            const chord = total > 1 ? ['C4', 'E4', 'G4', 'C5'] : ['E4', 'G4', 'C5'];
            this.synth.triggerAttackRelease(chord, '8n');
        }
    }

    animateClear(r, c) {
        const cell = document.getElementById(`cell-${r}-${c}`);
        const steam = document.createElement('div');
        steam.className = 'steam-particle';
        cell.appendChild(steam);

        setTimeout(() => {
            cell.classList.remove('occupied');
            cell.style.background = '';
            steam.remove();
        }, 500);
    }

    previewPlacement(e) {
        this.clearPreviews();
        const placement = this.getPlacementPosition(e);
        if (!placement) return;

        const isValid = this.canPlaceBlock(this.draggingBlock.data, placement.row, placement.col);
        const className = isValid ? 'preview-valid' : 'preview-invalid';

        const shape = this.draggingBlock.data.shape;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[0].length; c++) {
                if (shape[r][c]) {
                    const tr = placement.row + r;
                    const tc = placement.col + c;
                    if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8) {
                        document.getElementById(`cell-${tr}-${tc}`).classList.add(className);
                    }
                }
            }
        }
    }

    clearPreviews() {
        document.querySelectorAll('.grid-cell').forEach(c => {
            c.classList.remove('preview-valid', 'preview-invalid');
        });
    }

    checkGameOver() {
        if (this.trayBlocks.every(b => b === null)) return;

        const anyPossibleMove = this.trayBlocks.some(block => {
            if (!block) return false;
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    if (this.canPlaceBlock(block, r, c)) return true;
                }
            }
            return false;
        });

        if (!anyPossibleMove) {
            this.endGame();
        }
    }

    updateScoreUI() {
        document.getElementById('current-score').textContent = this.score;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            document.getElementById('high-score').textContent = this.highScore;
            localStorage.setItem('cafeBlocksHighScore', this.highScore);
        }
    }

    endGame() {
        if (this.gameOver) return;
        this.gameOver = true;
        this.isGameOver = true;

        if (this.currentRunSets > this.longestRun) {
            this.longestRun = this.currentRunSets;
            localStorage.setItem('cafeBlocksLongestRun', this.longestRun);
        }

        const msg = `
            <div class="text-left space-y-2 mt-4 text-amber-200">
                <p>☕ Happy Customers: ${Math.floor(this.score / 20)}</p>
                <p>🥯 Best Service Combo: ${this.bestCombo} lines</p>
                <p>🕰️ Shift Endurance: ${this.currentRunSets} orders</p>
            </div>
        `;
        this.showGameOver("CAFÉ CLOSED FOR THE DAY", msg);
    }
}

export default CafeBlocks;
