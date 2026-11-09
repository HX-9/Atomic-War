/**
 * ============================================================================
 * الحرب الذرية (Atomic War) - محاكي المعركة الخلفية الحية (4 روبوتات تتنافس في الخلفية)
 * يعمل تلقائياً على Canvas الشاشة الترحيبية خلف طبقة البلور
 * مع نظام إقصاء دقيق: الروبوت الذي يُباد تماماً يخرج من المعركة ولا يعود إطلاقاً
 * ============================================================================
 */
class WelcomeBackgroundSimulation {
    constructor(canvasId = 'welcomeBgCanvas') {
        this.canvasId = canvasId;
        this.canvas = null;
        this.ctx = null;
        this.isRunning = false;
        this.stepInterval = null;
        this.animFrameId = null;

        this.rows = 7;
        this.cols = 7;
        this.bots = [];
        this.board = [];
        this.currentBot = 0;
        this.turnCount = 0;
        this.matchEndCountdown = -1;
        this.flyingParticles = [];

        this.handleResize = this.resize.bind(this);
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', this.handleResize);
        }
        this.init();
    }

    init() {
        if (typeof document === 'undefined') return;
        this.canvas = document.getElementById(this.canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        this.initBoard();
    }

    resize() {
        if (typeof window === 'undefined') return;
        if (!this.canvas && typeof document !== 'undefined') {
            this.canvas = document.getElementById(this.canvasId);
        }
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    initBoard() {
        this.bots = [
            { id: 0, name: 'يورانيوم', color: '#10b981', dark: '#064e3b', alive: true, hasPlayed: false, atoms: 0, cells: 0 },
            { id: 1, name: 'بلوتونيوم', color: '#ef4444', dark: '#7f1d1d', alive: true, hasPlayed: false, atoms: 0, cells: 0 },
            { id: 2, name: 'كوبالت',   color: '#0284c7', dark: '#0c4a6e', alive: true, hasPlayed: false, atoms: 0, cells: 0 },
            { id: 3, name: 'سيزيوم',  color: '#f59e0b', dark: '#78350f', alive: true, hasPlayed: false, atoms: 0, cells: 0 }
        ];

        this.board = [];
        for (let r = 0; r < this.rows; r++) {
            const row = [];
            for (let c = 0; c < this.cols; c++) {
                const isCorner = (r === 0 || r === this.rows - 1) && (c === 0 || c === this.cols - 1);
                const isEdge = (r === 0 || r === this.rows - 1 || c === 0 || c === this.cols - 1);
                const crit = isCorner ? 2 : (isEdge ? 3 : 4);
                row.push({ owner: null, atoms: 0, crit: crit });
            }
            this.board.push(row);
        }

        this.turnCount = 0;
        this.currentBot = 0;
        this.matchEndCountdown = -1;
        this.flyingParticles = [];
    }

    start() {
        if (this.isRunning) return;
        if (!this.canvas || !this.ctx) this.init();
        if (!this.canvas) return;

        this.isRunning = true;
        this.resize();
        if (this.board.length === 0) this.initBoard();

        if (this.stepInterval) clearInterval(this.stepInterval);
        this.stepInterval = setInterval(() => this.step(), 360);

        const renderLoop = () => {
            if (!this.isRunning) return;
            this.draw();
            this.animFrameId = requestAnimationFrame(renderLoop);
        };
        this.animFrameId = requestAnimationFrame(renderLoop);
    }

    stop() {
        this.isRunning = false;
        if (this.stepInterval) {
            clearInterval(this.stepInterval);
            this.stepInterval = null;
        }
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
    }

    /**
     * تحديث إحصائيات الذرات وفحص الإقصاء التام
     */
    updateEliminations() {
        for (const b of this.bots) {
            b.atoms = 0;
            b.cells = 0;
        }

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = this.board[r][c];
                if (cell.owner !== null && cell.atoms > 0) {
                    this.bots[cell.owner].atoms += cell.atoms;
                    this.bots[cell.owner].cells += 1;
                }
            }
        }

        // إقصاء أي روبوت لعب ضربته الافتتاحية وفقد جميع ذراته (لا يمكنه العودة إطلاقاً)
        for (const b of this.bots) {
            if (b.hasPlayed && b.atoms === 0) {
                b.alive = false;
            }
        }
    }

    step() {
        if (!this.canvas || !this.isRunning) return;

        // إذا انتهت المباراة، ننتظر مهلة قصيرة لعرض الانتصار ثم نبدأ مباراة جديدة
        if (this.matchEndCountdown > 0) {
            this.matchEndCountdown--;
            if (this.matchEndCountdown === 0) {
                this.initBoard();
            }
            return;
        }

        this.updateEliminations();

        const aliveBots = this.bots.filter(b => b.alive);
        const playedCount = this.bots.filter(b => b.hasPlayed).length;

        // إذا بقي روبوت واحد فقط بعد لعب الجميع للضربة الافتتاحية، تعلن نهاية المباراة
        if (playedCount >= this.bots.length && aliveBots.length <= 1) {
            this.matchEndCountdown = 5; // انتظار 5 نبضات ثم إعادة
            return;
        }

        // إذا تجاوزت المباراة 120 حركة، إعادة ضبط
        if (this.turnCount > 120 || aliveBots.length === 0) {
            this.initBoard();
            return;
        }

        // التأكد من أن الروبوت الحالي لا يزال حياً، وإلا الانتقال للحي التالي
        if (!this.bots[this.currentBot].alive) {
            this.advanceToNextAliveBot();
            if (!this.bots[this.currentBot].alive) {
                this.initBoard();
                return;
            }
        }

        const bot = this.bots[this.currentBot];
        const isOpening = !bot.hasPlayed;
        const validMoves = [];

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = this.board[r][c];
                if (isOpening) {
                    // في الضربة الأولى، يضع في غرفة فارغة فقط
                    if (cell.owner === null) {
                        validMoves.push({ r, c });
                    }
                } else {
                    // في الأدوار العادية: يضع حصرياً في غرفه الخاصة (ممنوع وضع ذرات جديدة في أماكن فارغة حتى لا يعود الموتى)
                    if (cell.owner === this.currentBot) {
                        validMoves.push({ r, c });
                    }
                }
            }
        }

        if (validMoves.length === 0) {
            bot.alive = false;
            this.advanceToNextAliveBot();
            return;
        }

        // اختيار أفضل حركة تكتيكية للروبوت
        let chosen = null;
        for (const m of validMoves) {
            const cell = this.board[m.r][m.c];
            if (cell.atoms + 1 >= cell.crit) {
                chosen = m;
                break;
            }
        }
        if (!chosen) {
            chosen = validMoves[Math.floor(Math.random() * validMoves.length)];
        }

        const cell = this.board[chosen.r][chosen.c];
        cell.owner = this.currentBot;
        cell.atoms += isOpening ? 3 : 1;
        bot.hasPlayed = true;
        this.turnCount++;

        // معالجة الانشطار المتسلسل
        let fissionQueue = [];
        if (cell.atoms >= cell.crit) {
            fissionQueue.push({ r: chosen.r, c: chosen.c });
        }

        let safety = 0;
        while (fissionQueue.length > 0 && safety < 120) {
            safety++;
            const cur = fissionQueue.shift();
            const cCell = this.board[cur.r][cur.c];
            if (cCell.atoms < cCell.crit) continue;

            cCell.atoms -= cCell.crit;
            if (cCell.atoms <= 0) {
                cCell.atoms = 0;
                cCell.owner = null;
            }

            const dirs = [[-1, 0], [1, 0], [0, 1], [0, -1]];
            for (const [dr, dc] of dirs) {
                const nr = cur.r + dr;
                const nc = cur.c + dc;
                if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                    const target = this.board[nr][nc];
                    target.owner = this.currentBot;
                    target.atoms += 1;

                    this.flyingParticles.push({
                        fromR: cur.r, fromC: cur.c,
                        toR: nr, toC: nc,
                        progress: 0,
                        color: this.bots[this.currentBot].color
                    });

                    if (target.atoms >= target.crit) {
                        fissionQueue.push({ r: nr, c: nc });
                    }
                }
            }
        }

        this.updateEliminations();
        this.advanceToNextAliveBot();
    }

    advanceToNextAliveBot() {
        const total = this.bots.length;
        let attempts = 0;
        do {
            this.currentBot = (this.currentBot + 1) % total;
            attempts++;
        } while (!this.bots[this.currentBot].alive && attempts <= total);
    }

    draw() {
        if (!this.ctx || !this.canvas) return;
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const padding = 60;
        const size = Math.min(this.canvas.width - padding, this.canvas.height - padding) * 0.95;
        const cellSize = size / this.cols;
        const startX = (this.canvas.width - size) / 2;
        const startY = (this.canvas.height - size) / 2;

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = this.board[r][c];
                const x = startX + c * cellSize;
                const y = startY + r * cellSize;

                ctx.strokeStyle = cell.owner !== null ? this.bots[cell.owner].color + '70' : 'rgba(51, 65, 85, 0.45)';
                ctx.lineWidth = 1.5;
                ctx.fillStyle = cell.owner !== null ? this.bots[cell.owner].color + '1a' : 'rgba(15, 23, 42, 0.45)';

                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(x + 3, y + 3, cellSize - 6, cellSize - 6, 8);
                } else {
                    ctx.rect(x + 3, y + 3, cellSize - 6, cellSize - 6);
                }
                ctx.fill();
                ctx.stroke();

                if (cell.atoms > 0 && cell.owner !== null) {
                    const bot = this.bots[cell.owner];
                    const cx = x + cellSize / 2;
                    const cy = y + cellSize / 2;
                    const count = Math.min(cell.atoms, 4);
                    const radius = cellSize * 0.12;

                    ctx.shadowColor = bot.color;
                    ctx.shadowBlur = 12;
                    ctx.fillStyle = bot.color;

                    if (count === 1) {
                        ctx.beginPath();
                        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                        ctx.fill();
                    } else if (count === 2) {
                        const offset = radius * 1.15;
                        ctx.beginPath(); ctx.arc(cx - offset, cy, radius, 0, Math.PI * 2); ctx.fill();
                        ctx.beginPath(); ctx.arc(cx + offset, cy, radius, 0, Math.PI * 2); ctx.fill();
                    } else {
                        const step = (Math.PI * 2) / count;
                        const dist = radius * 1.35;
                        for (let i = 0; i < count; i++) {
                            const px = cx + Math.cos(step * i + Date.now() * 0.002) * dist;
                            const py = cy + Math.sin(step * i + Date.now() * 0.002) * dist;
                            ctx.beginPath();
                            ctx.arc(px, py, radius, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                    ctx.shadowBlur = 0;
                }
            }
        }

        for (let i = this.flyingParticles.length - 1; i >= 0; i--) {
            const p = this.flyingParticles[i];
            p.progress += 0.085;
            if (p.progress >= 1) {
                this.flyingParticles.splice(i, 1);
                continue;
            }
            const x1 = startX + p.fromC * cellSize + cellSize / 2;
            const y1 = startY + p.fromR * cellSize + cellSize / 2;
            const x2 = startX + p.toC * cellSize + cellSize / 2;
            const y2 = startY + p.toR * cellSize + cellSize / 2;

            const curX = x1 + (x2 - x1) * p.progress;
            const curY = y1 + (y2 - y1) * p.progress;

            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(curX, curY, cellSize * 0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }
}

if (typeof window !== 'undefined') {
    window.WelcomeBackgroundSimulation = WelcomeBackgroundSimulation;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WelcomeBackgroundSimulation };
}
