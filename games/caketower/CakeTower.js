import Game from '../Game.js';

/**
 * CakeTower Class
 * A physics-based stacking game where players take turns building a pastry tower.
 */
class CakeTower extends Game {
    constructor() {
        super({ title: 'Patisserie Pile-up', containerId: 'cake-tower-game' });

        // Matter.js components
        this.engine = null;
        this.render = null;
        this.runner = null;
        this.world = null;

        // Game State
        this.gameStarted = false;
        this.gameOver = false;
        this.currentPlayer = 1;
        this.pieceCount = 0;
        this.currentPiece = null;
        this.floor = null;
        this.plate = null;
        this.stabilityInterval = null;

        // Pastry Types with "Graphical Upgrades" using multi-part bodies
        this.pastryTypes = [
            {
                name: 'Golden Waffle',
                generator: (x, y) => {
                    const base = Matter.Bodies.rectangle(x, y, 120, 30, { chamfer: { radius: 5 } });
                    // Add some "grid" lines for waffle texture
                    const part1 = Matter.Bodies.rectangle(x - 30, y, 2, 30, { isStatic: false });
                    const part2 = Matter.Bodies.rectangle(x + 30, y, 2, 30, { isStatic: false });
                    return Matter.Body.create({
                        parts: [base, part1, part2],
                        render: { fillStyle: '#D4A373', strokeStyle: '#A0522D', lineWidth: 2 },
                        label: 'pastry'
                    });
                }
            },
            {
                name: 'Dark Brownie',
                generator: (x, y) => {
                    const cake = Matter.Bodies.rectangle(x, y, 90, 80, { chamfer: { radius: 8 } });
                    const frosting = Matter.Bodies.rectangle(x, y - 35, 90, 15, { chamfer: { radius: 4 } });
                    return Matter.Body.create({
                        parts: [cake, frosting],
                        render: {
                            fillStyle: '#3E2723',
                            strokeStyle: '#2a1b19',
                            lineWidth: 3
                        },
                        label: 'pastry'
                    });
                }
            },
            {
                name: 'Cream Macaron',
                generator: (x, y) => {
                    const top = Matter.Bodies.rectangle(x, y - 10, 80, 25, { chamfer: { radius: 15 } });
                    const cream = Matter.Bodies.rectangle(x, y, 75, 10);
                    const bottom = Matter.Bodies.rectangle(x, y + 10, 80, 25, { chamfer: { radius: 15 } });
                    return Matter.Body.create({
                        parts: [top, cream, bottom],
                        render: { fillStyle: '#FDF6F0', strokeStyle: '#D2B48C', lineWidth: 3 },
                        label: 'pastry'
                    });
                }
            },
            {
                name: 'Cheesecake',
                generator: (x, y) => Matter.Bodies.polygon(x, y, 3, 60, {
                    render: { fillStyle: '#FFF3E0', strokeStyle: '#D4A373', lineWidth: 3 },
                    label: 'pastry'
                })
            },
            {
                name: 'Cupcake',
                generator: (x, y) => {
                    const top = Matter.Bodies.rectangle(x, y - 20, 60, 40, { chamfer: { radius: 20 } });
                    const bottom = Matter.Bodies.trapezoid(x, y + 15, 50, 30, 0.4, { chamfer: { radius: 5 } });
                    return Matter.Body.create({
                        parts: [top, bottom],
                        render: { fillStyle: '#F4A261', strokeStyle: '#A1887F', lineWidth: 3 },
                        label: 'pastry'
                    });
                }
            },
            {
                name: 'Matcha Roll',
                generator: (x, y) => Matter.Bodies.circle(x, y, 55, {
                    render: { fillStyle: '#4CAF50', strokeStyle: '#2e7d32', lineWidth: 4 },
                    label: 'pastry'
                })
            }
        ];

        // Audio Setup
        this.synth = null;
    }

    init() {
        this.initBaseUI();

        // Initialize Audio on first interaction
        const initAudio = () => {
            if (!this.synth) {
                this.synth = new Tone.PolySynth(Tone.Synth).toDestination();
                this.synth.volume.value = -10;
                Tone.start();
            }
            window.removeEventListener('click', initAudio);
        };
        window.addEventListener('click', initAudio);

        const gameHtml = `
            <div id="cake-tower-container" class="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto px-4 py-8 h-[90vh]">
                <!-- Wooden Sign Indicator -->
                <div class="wooden-sign">
                    <div id="cake-status" class="text-3xl font-black font-header text-amber-50 uppercase tracking-wider drop-shadow-md">Player 1's Turn</div>
                </div>

                <!-- Game Canvas Container -->
                <div id="canvas-frame" class="relative w-full flex-grow bg-amber-50 rounded-3xl border-8 border-stone-800 shadow-2xl overflow-hidden">
                    <canvas id="cake-canvas" class="w-full h-full cursor-pointer"></canvas>
                    
                    <!-- Scoring Overlay -->
                    <div class="absolute top-4 right-6 bg-stone-800/80 text-white px-6 py-2 rounded-full font-bold shadow-lg">
                        Layers: <span id="cake-score">0</span>
                    </div>
                </div>

                <!-- Control Panel -->
                <div class="menu-panel w-full">
                    <div class="flex justify-between items-center">
                        <div class="text-sienna font-bold">
                            <p class="text-xs uppercase tracking-widest opacity-60">Game Rules</p>
                            <p class="text-sm">Don't let the tower fall on your turn!</p>
                        </div>
                        <button id="cake-restart-btn" class="wood-btn px-10 py-3 uppercase tracking-widest text-sm">
                            New Game
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('game-mount').innerHTML = gameHtml;

        this.setupPhysics();
        this.setupEventListeners();
        this.start();
    }

    setupPhysics() {
        const { Engine, Render, Runner, World, Bodies, Events } = Matter;
        const container = document.getElementById('canvas-frame');
        const canvas = document.getElementById('cake-canvas');

        // Ensure container has dimensions before initializing
        const width = container.clientWidth || 400;
        const height = container.clientHeight || 600;

        this.engine = Engine.create();
        this.engine.world.gravity.y = 1.3;

        this.render = Render.create({
            canvas: canvas,
            engine: this.engine,
            options: {
                width: width,
                height: height,
                wireframes: false,
                background: 'transparent'
            }
        });

        this.runner = Runner.create();
        this.world = this.engine.world;

        this.initStaticBodies();

        Render.run(this.render);
        Runner.run(this.runner, this.engine);

        Events.on(this.engine, 'collisionStart', (e) => this.handleCollision(e));
    }

    initStaticBodies() {
        const { Bodies, World } = Matter;
        const groundY = this.render.options.height - 40;

        // Static bounds
        this.floor = Bodies.rectangle(this.render.options.width / 2, groundY + 50, this.render.options.width, 100, {
            isStatic: true,
            render: { visible: false },
            label: 'floor'
        });

        // Large, stable plate
        this.plate = Bodies.rectangle(this.render.options.width / 2, groundY, 400, 30, {
            isStatic: true,
            chamfer: { radius: 15 },
            render: { fillStyle: '#4A2C2A' },
            label: 'plate'
        });

        // The "Large Base" foundation (even larger now)
        this.baseLayer = Bodies.rectangle(this.render.options.width / 2, groundY - 45, 260, 60, {
            isStatic: true,
            chamfer: { radius: 10 },
            render: {
                fillStyle: '#FDF6F0',
                strokeStyle: '#D2B48C',
                lineWidth: 6
            },
            label: 'pastry'
        });

        World.add(this.world, [this.floor, this.plate, this.baseLayer]);
    }

    setupEventListeners() {
        const canvas = document.getElementById('cake-canvas');
        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        canvas.addEventListener('click', () => this.handleDrop());

        // Touch supports
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.handleMouseMove(e.touches[0]);
        });
        canvas.addEventListener('touchend', () => this.handleDrop());

        document.getElementById('cake-restart-btn').addEventListener('click', () => this.restart());
        window.addEventListener('resize', () => this.handleResize());
    }

    start() {
        // Wait for layout to settle to avoid "spawning from side" bug
        setTimeout(() => {
            this.handleResize();

            this.gameStarted = true;
            this.gameOver = false;
            this.currentPlayer = 1;
            this.pieceCount = 0;
            this.isGameOver = false;

            if (this.stabilityInterval) clearInterval(this.stabilityInterval);
            this.stabilityInterval = null;

            Matter.World.clear(this.world, false);
            // Re-initialize static bodies to ensure they are correctly positioned for new width
            this.initStaticBodies();

            this.updateUI();
            this.spawnNewPiece();
        }, 100);
    }

    spawnNewPiece() {
        if (this.gameOver) return;

        const pieceType = Matter.Common.choose(this.pastryTypes);
        const xPos = this.render.options.width / 2;
        this.currentPiece = pieceType.generator(xPos, 80);

        Matter.Body.setStatic(this.currentPiece, true);
        Matter.World.add(this.world, this.currentPiece);
    }

    handleMouseMove(e) {
        if (!this.currentPiece || this.gameOver) return;

        const canvas = document.getElementById('cake-canvas');
        const bounds = canvas.getBoundingClientRect();
        const x = e.clientX - bounds.left;

        const pieceWidth = this.currentPiece.bounds.max.x - this.currentPiece.bounds.min.x;
        const clampedX = Math.max(pieceWidth / 2, Math.min(x, this.render.options.width - pieceWidth / 2));

        Matter.Body.setPosition(this.currentPiece, { x: clampedX, y: this.currentPiece.position.y });
    }

    handleDrop() {
        if (!this.currentPiece || this.gameOver) return;

        const piece = this.currentPiece;
        this.currentPiece = null;
        Matter.Body.setStatic(piece, false);

        // Play drop sound
        if (this.synth) {
            this.synth.triggerAttackRelease('G4', '32n');
        }

        // Check for stability more frequently
        let checkCount = 0;
        this.stabilityInterval = setInterval(() => {
            checkCount++;
            if (this.gameOver) {
                clearInterval(this.stabilityInterval);
                this.stabilityInterval = null;
                return;
            }

            // If piece has settled or 2 seconds passed
            if (piece.speed < 0.2 || checkCount > 20) {
                clearInterval(this.stabilityInterval);
                this.stabilityInterval = null;
                if (!this.gameOver) {
                    this.pieceCount++;
                    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
                    this.updateUI();
                    this.spawnNewPiece();
                    // Success sound
                    if (this.synth) this.synth.triggerAttackRelease('C5', '16n');
                }
            }
        }, 100);
    }

    handleCollision(event) {
        if (this.gameOver) return;

        const pairs = event.pairs;
        for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i];

            // Check if any pastry part hits the floor
            const isPastryA = pair.bodyA.label === 'pastry' || (pair.bodyA.parent && pair.bodyA.parent.label === 'pastry');
            const isPastryB = pair.bodyB.label === 'pastry' || (pair.bodyB.parent && pair.bodyB.parent.label === 'pastry');

            if ((pair.bodyA.label === 'floor' && isPastryB) ||
                (pair.bodyB.label === 'floor' && isPastryA)) {
                this.endGame();
                break;
            }
        }
    }

    updateUI() {
        const status = document.getElementById('cake-status');
        const score = document.getElementById('cake-score');

        if (status) status.textContent = `Player ${this.currentPlayer}'s Turn`;
        if (score) score.textContent = this.pieceCount;
    }

    endGame() {
        if (this.gameOver) return;
        this.gameOver = true;
        this.isGameOver = true;

        if (this.stabilityInterval) clearInterval(this.stabilityInterval);
        this.stabilityInterval = null;

        // Crash sound (Chord)
        if (this.synth) {
            this.synth.triggerAttackRelease(['C2', 'E2', 'G2'], '4n');
        }

        const winner = this.currentPlayer === 1 ? 2 : 1;
        this.showGameOver(`TOWER COLLAPSED!`, `Player ${winner} built the steadier hand! Final height: ${this.pieceCount} layers.`);
    }

    handleResize() {
        const container = document.getElementById('canvas-frame');
        if (!container || !this.render) return;

        this.render.canvas.width = container.clientWidth;
        this.render.canvas.height = container.clientHeight;
        this.render.options.width = container.clientWidth;
        this.render.options.height = container.clientHeight;

        Matter.Body.setPosition(this.floor, { x: this.render.options.width / 2, y: this.render.options.height + 10 });
        Matter.Body.setPosition(this.plate, { x: this.render.options.width / 2, y: this.render.options.height - 40 });
    }

    restart() {
        this.start();
    }
}

export default CakeTower;
