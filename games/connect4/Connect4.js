import Game from '../Game.js';

class Connect4 extends Game {
    constructor() {
        super({ title: 'Connect Four', containerId: 'connect4-board' });

        this.ROWS = 6;
        this.COLS = 7;
        this.PLAYER_ONE_CLASS = 'coffee';
        this.PLAYER_TWO_CLASS = 'cream';

        this.board = [];
        this.currentPlayer = null;
        this.gameMode = 'single';
        this.difficulty = 'hard';
        this.isAIThinking = false;

        this.boardElement = null;
        this.turnIndicator = null;
        this.gameModeSelect = null;
        this.difficultySelect = null;
        this.difficultySelector = null;
    }

    init() {
        // Initialize Base UI from Game class
        this.initBaseUI();

        // Setup Connect 4 Specific UI
        const gameHtml = `
            <div class="flex flex-col items-center gap-6 w-full max-w-[1400px] mx-auto px-4 md:px-8">
                <div id="c4-turn-indicator" class="text-2xl font-bold py-2 transition-all duration-300"></div>

                <div class="table-surface w-full flex justify-center shadow-2xl relative">
                    <div id="connect4-board" class="board"></div>
                </div>

                <div id="controls" class="flex flex-wrap justify-center items-center gap-8 w-full max-w-4xl bg-white border border-stone-200 rounded-3xl p-8 shadow-xl">
                    <div class="flex items-center gap-4">
                        <span class="font-black text-amber-900 uppercase text-xs tracking-widest">Mode</span>
                        <select id="game-mode" class="bg-amber-50 border-2 border-amber-100 rounded-xl px-4 py-3 font-bold text-stone-700 focus:outline-none focus:ring-4 focus:ring-amber-200 transition-all cursor-pointer">
                            <option value="single">Single Player</option>
                            <option value="multi">Local Multiplayer</option>
                        </select>
                    </div>
                    <div id="difficulty-selector" class="flex items-center gap-4">
                        <span class="font-black text-amber-900 uppercase text-xs tracking-widest">Difficulty</span>
                        <select id="difficulty" class="bg-amber-50 border-2 border-amber-100 rounded-xl px-4 py-3 font-bold text-stone-700 focus:outline-none focus:ring-4 focus:ring-amber-200 transition-all cursor-pointer">
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard" selected>Hard</option>
                        </select>
                    </div>
                    <div class="flex gap-4">
                        <button id="instructions-btn" class="bg-stone-500 hover:bg-stone-600 text-white font-black py-4 px-8 rounded-2xl shadow-lg transition-all transform hover:-translate-y-1 active:translate-y-0 text-sm uppercase tracking-widest">
                            How to Play
                        </button>
                        <button id="restart-btn" class="bg-amber-700 hover:bg-amber-800 text-white font-black py-4 px-8 rounded-2xl shadow-lg transition-all transform hover:-translate-y-1 active:translate-y-0 text-sm uppercase tracking-widest">
                            New Game
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('game-mount').innerHTML = gameHtml;

        this.boardElement = document.getElementById('connect4-board');
        this.turnIndicator = document.getElementById('c4-turn-indicator');
        this.gameModeSelect = document.getElementById('game-mode');
        this.difficultySelect = document.getElementById('difficulty');
        this.difficultySelector = document.getElementById('difficulty-selector');

        this.setupEventListeners();
        this.start();
    }

    setupEventListeners() {
        document.getElementById('restart-btn').addEventListener('click', () => this.restart());
        document.getElementById('instructions-btn').addEventListener('click', () => {
            // In a real app we might have a specific instructions modal in Game.js
            alert("Connect four of your checkers in a row to win!");
        });

        this.gameModeSelect.addEventListener('change', () => {
            this.gameMode = this.gameModeSelect.value;
            this.difficultySelector.style.display = this.gameMode === 'single' ? 'flex' : 'none';
            this.restart();
        });

        this.difficultySelect.addEventListener('change', () => {
            this.difficulty = this.difficultySelect.value;
            this.restart();
        });
    }

    start() {
        this.board = Array.from({ length: this.ROWS }, () => Array(this.COLS).fill(null));
        this.currentPlayer = this.PLAYER_ONE_CLASS;
        this.isGameOver = false;
        this.isAIThinking = false;

        this.renderBoard();
        this.updateTurnIndicator();
    }

    renderBoard() {
        this.boardElement.innerHTML = '';
        for (let row = 0; row < this.ROWS; row++) {
            for (let col = 0; col < this.COLS; col++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.addEventListener('click', () => this.handleColumnClick(col));

                cell.addEventListener('mouseenter', () => this.highlightColumn(col, true));
                cell.addEventListener('mouseleave', () => this.highlightColumn(col, false));

                this.boardElement.appendChild(cell);
            }
        }
    }

    highlightColumn(col, isHighlighted) {
        for (let r = 0; r < this.ROWS; r++) {
            const cell = this.boardElement.children[r * this.COLS + col];
            if (isHighlighted) {
                cell.style.background = '#3a2b29';
                cell.style.boxShadow = 'inset 0 8px 12px rgba(0,0,0,0.8), 0 0 20px rgba(211, 162, 106, 0.3)';
            } else {
                cell.style.background = '';
                cell.style.boxShadow = '';
            }
        }
    }

    handleColumnClick(col) {
        if (this.isGameOver || this.isAIThinking) return;

        const row = this.getNextAvailableRow(col);
        if (row === -1) return;

        this.dropPiece(row, col, this.currentPlayer);

        if (this.checkForWin(row, col)) {
            const winner = this.currentPlayer === this.PLAYER_ONE_CLASS ? 'Coffee' : 'Cream';
            this.showGameOver(`${winner} Wins!`, "Satisfying strategy, like a perfect brew.");
        } else if (this.isBoardFull()) {
            this.showGameOver("It's a Draw!", "Equal standing. Care for another cup?");
        } else {
            this.switchPlayer();
        }
    }

    getNextAvailableRow(col) {
        for (let row = this.ROWS - 1; row >= 0; row--) {
            if (!this.board[row][col]) return row;
        }
        return -1;
    }

    dropPiece(row, col, player) {
        this.board[row][col] = player;
        const cell = this.boardElement.children[row * this.COLS + col];
        const piece = document.createElement('div');
        const pieceClass = player === this.PLAYER_ONE_CLASS ? 'piece-coffee' : 'piece-cream';
        piece.classList.add('board-piece', pieceClass, 'piece-fall');
        cell.appendChild(piece);
    }

    switchPlayer() {
        this.currentPlayer = (this.currentPlayer === this.PLAYER_ONE_CLASS) ? this.PLAYER_TWO_CLASS : this.PLAYER_ONE_CLASS;
        this.updateTurnIndicator();

        if (this.gameMode === 'single' && this.currentPlayer === this.PLAYER_TWO_CLASS && !this.isGameOver) {
            this.isAIThinking = true;
            setTimeout(() => this.aiMove(), 800);
        }
    }

    updateTurnIndicator() {
        if (this.isGameOver) return;
        const playerText = this.currentPlayer === this.PLAYER_ONE_CLASS ? 'Coffee' : 'Cream';
        const turnText = this.gameMode === 'single' && this.currentPlayer === this.PLAYER_TWO_CLASS ? "AI's Turn" : `${playerText}'s Turn`;
        const pieceClass = this.currentPlayer === this.PLAYER_ONE_CLASS ? 'piece-coffee' : 'piece-cream';
        this.turnIndicator.innerHTML = `<span class="indicator-piece ${pieceClass}"></span> ${turnText}`;
    }

    isBoardFull() {
        return this.board[0].every(cell => cell !== null);
    }

    restart() {
        this.start();
    }

    // --- Win Logic & AI (Simplified version for migration, keeping hard minimax) ---
    async aiMove() {
        let bestCol = -1;
        if (this.difficulty === 'easy') bestCol = this.getEasyMove();
        else if (this.difficulty === 'medium') bestCol = this.getMediumMove();
        else bestCol = this.getHardMove();

        this.isAIThinking = false;
        this.handleColumnClick(bestCol);
    }

    getEasyMove() {
        const validCols = this.getValidColumns();
        return validCols[Math.floor(Math.random() * validCols.length)];
    }

    getMediumMove() {
        const validCols = this.getValidColumns();
        // Check for immediate win/block
        for (const col of validCols) {
            const row = this.getNextAvailableRow(col);
            this.board[row][col] = this.PLAYER_TWO_CLASS;
            if (this.checkForWin(row, col, false)) {
                this.board[row][col] = null;
                return col;
            }
            this.board[row][col] = null;
        }
        for (const col of validCols) {
            const row = this.getNextAvailableRow(col);
            this.board[row][col] = this.PLAYER_ONE_CLASS;
            if (this.checkForWin(row, col, false)) {
                this.board[row][col] = null;
                return col;
            }
            this.board[row][col] = null;
        }
        return this.getEasyMove();
    }

    getHardMove() {
        const depth = 5;
        const result = this.minimax(this.board, depth, -Infinity, Infinity, true);
        return result.column;
    }

    minimax(tempBoard, depth, alpha, beta, maximizingPlayer) {
        const validCols = this.getValidColumns();
        const isTerminal = this.isTerminalNode(validCols);

        if (depth === 0 || isTerminal) {
            if (isTerminal) {
                if (this.winningMove(this.PLAYER_TWO_CLASS)) return { column: null, score: 1000000 };
                if (this.winningMove(this.PLAYER_ONE_CLASS)) return { column: null, score: -1000000 };
                return { column: null, score: 0 };
            } else {
                return { column: null, score: this.scorePosition(this.PLAYER_TWO_CLASS) };
            }
        }

        if (maximizingPlayer) {
            let score = -Infinity;
            let column = validCols[0];
            for (const col of validCols) {
                const row = this.getNextAvailableRow(col);
                tempBoard[row][col] = this.PLAYER_TWO_CLASS;
                const newScore = this.minimax(tempBoard, depth - 1, alpha, beta, false).score;
                tempBoard[row][col] = null;
                if (newScore > score) {
                    score = newScore;
                    column = col;
                }
                alpha = Math.max(alpha, score);
                if (alpha >= beta) break;
            }
            return { column, score };
        } else {
            let score = Infinity;
            let column = validCols[0];
            for (const col of validCols) {
                const row = this.getNextAvailableRow(col);
                tempBoard[row][col] = this.PLAYER_ONE_CLASS;
                const newScore = this.minimax(tempBoard, depth - 1, alpha, beta, true).score;
                tempBoard[row][col] = null;
                if (newScore < score) {
                    score = newScore;
                    column = col;
                }
                beta = Math.min(beta, score);
                if (alpha >= beta) break;
            }
            return { column, score };
        }
    }

    isTerminalNode(validCols) {
        return this.winningMove(this.PLAYER_ONE_CLASS) || this.winningMove(this.PLAYER_TWO_CLASS) || validCols.length === 0;
    }

    winningMove(player) {
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                if (this.board[r][c] === player) {
                    if (this.checkForWin(r, c, false)) return true;
                }
            }
        }
        return false;
    }

    scorePosition(player) {
        let score = 0;
        // Center preference
        for (let r = 0; r < this.ROWS; r++) {
            if (this.board[r][3] === player) score += 3;
        }
        return score;
    }

    getValidColumns() {
        const cols = [];
        for (let c = 0; c < this.COLS; c++) {
            if (this.getNextAvailableRow(c) !== -1) cols.push(c);
        }
        return cols;
    }

    checkForWin(row, col, shouldHighlight = true) {
        const player = this.board[row][col];
        const directions = [
            { x: 0, y: 1 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: -1 }
        ];

        for (const dir of directions) {
            let count = 1;
            count += this.countDir(row, col, player, dir);
            count += this.countDir(row, col, player, { x: -dir.x, y: -dir.y });

            if (count >= 4) {
                if (shouldHighlight) this.highlightWin(row, col, player, dir);
                return true;
            }
        }
        return false;
    }

    countDir(row, col, player, dir) {
        let r = row + dir.x;
        let c = col + dir.y;
        let count = 0;
        while (r >= 0 && r < this.ROWS && c >= 0 && c < this.COLS && this.board[r][c] === player) {
            count++;
            r += dir.x;
            c += dir.y;
        }
        return count;
    }

    highlightWin(row, col, player, dir) {
        const cells = [{ r: row, c: col }];
        const add = (d) => {
            let r = row + d.x, c = col + d.y;
            while (r >= 0 && r < this.ROWS && c >= 0 && c < this.COLS && this.board[r][c] === player) {
                cells.push({ r, c });
                r += d.x; c += d.y;
            }
        };
        add(dir); add({ x: -dir.x, y: -dir.y });
        cells.forEach(p => {
            const piece = this.boardElement.children[p.r * this.COLS + p.c].querySelector('.board-piece');
            if (piece) piece.classList.add('winning-piece');
        });
    }
}

export default Connect4;
