/**
 * ============================================================================
 * الحرب الذرية (Atomic War) - التفاعل الانشطاري المتسلسل
 * ملف الجافا سكريبت الرئيسي (Script.js)
 * ============================================================================
 */

/**
 * ============================================================================
 * 1. محاكي الصوتيات النووية (Nuclear Sound Synthesizer - Web Audio API)
 * لا يتطلب أي ملفات خارجية - يعمل بتركيب الترددات الحية
 * ============================================================================
 */
class NuclearSoundManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * صوت نقرة عداد غايغر عند وضع ذرة جديدة
     */
    playPlaceAtom() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // تردد رنيني يحاكي شحن جسيم ذري
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(780, now + 0.08);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);

        // نقرة غايغر سريعة متزامنة
        this.playGeigerClick(now + 0.01);
    }

    playGeigerClick(time) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, time);
        gain.gain.setValueAtTime(0.04, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.02);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(time);
        osc.stop(time + 0.02);
    }

    /**
     * صوت دوي الانشطار النووي لموجة التفاعل المتسلسل
     */
    playFissionWave(waveIndex = 1) {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const subOsc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // تصاعد طاقة الانشطار مع تتابع الموجات المتسلسلة
        const baseFreq = Math.min(130 + waveIndex * 28, 550);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.3, now + 0.22);

        // صدى تحت أرضي عميق
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(90, now);
        subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.25);

        gain.gain.setValueAtTime(0.26, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

        osc.connect(gain);
        subOsc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        subOsc.start(now);
        osc.stop(now + 0.24);
        subOsc.stop(now + 0.25);
    }

    /**
     * نغمة إعلان السيطرة والانتصار النووي
     */
    playVictory() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const notes = [440, 554.37, 659.25, 880, 1108.73];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const start = this.ctx.currentTime + idx * 0.12;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, start);

            gain.gain.setValueAtTime(0.22, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.38);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(start);
            osc.stop(start + 0.39);
        });
    }
}

/**
 * ============================================================================
 * 2. محرك اللعبة النووي الخالص (AtomicWarsEngine)
 * يدير مصفوفة المفاعل ثنائية الأبعاد، حساب الكتلة الحرجة، معالجة الانشطار
 * وقواعد الإقصاء الصحيحة متعددة اللاعبين
 * ============================================================================
 */
class AtomicWarsEngine {
    constructor(rows = 7, cols = 7, playersConfig = []) {
        this.rows = rows;
        this.cols = cols;
        this.players = playersConfig.map((p, index) => ({
            id: index,
            name: p.name,
            color: p.color,
            darkColor: p.darkColor,
            glow: p.glow,
            isAI: !!p.isAI,
            alive: true,
            hasPlayed: false,
            cellCount: 0,
            atomCount: 0
        }));

        this.board = [];
        this.currentPlayerIndex = 0;
        this.turnNumber = 1;
        this.isGameOver = false;
        this.winner = null;
        this.longestChain = 0;

        this.initBoard();
    }

    /**
     * تهيئة مصفوفة غرف المفاعل الذري
     */
    initBoard() {
        this.board = [];
        for (let r = 0; r < this.rows; r++) {
            const row = [];
            for (let c = 0; c < this.cols; c++) {
                const criticalMass = this.calculateCriticalMass(r, c);
                row.push({
                    row: r,
                    col: c,
                    owner: null,                        // معرّف اللاعب المالك
                    atoms: 0,                           // عدد الذرات داخل الغرفة
                    maxStableCapacity: criticalMass - 1, // أقصى استيعاب مستقر (1 زاوية، 2 طرف، 3 قلب)
                    criticalMass: criticalMass          // الكتلة الحرجة التي تؤدي للانشطار (2، 3، 4)
                });
            }
            this.board.push(row);
        }
        this.recalculateStats();
    }

    /**
     * حساب عتبة الكتلة الحرجة للغرفة بحسب موقعها الهندسي
     */
    calculateCriticalMass(r, c) {
        const isTopOrBottom = (r === 0 || r === this.rows - 1);
        const isLeftOrRight = (c === 0 || c === this.cols - 1);

        if (isTopOrBottom && isLeftOrRight) {
            return 2; // غرفة زاوية: تنشطر عند 2
        } else if (isTopOrBottom || isLeftOrRight) {
            return 3; // غرفة طرفية: تنشطر عند 3
        } else {
            return 4; // قلب المفاعل الداخلي: ينشطر عند 4
        }
    }

    /**
     * إرجاع الغرف المجاورة المتعامدة (أعلى، أسفل، يمين، يسار)
     */
    getOrthogonalNeighbors(r, c) {
        const dirs = [
            { dr: -1, dc: 0 },
            { dr: 1,  dc: 0 },
            { dr: 0,  dc: 1 },
            { dr: 0,  dc: -1 }
        ];
        const neighbors = [];
        for (const d of dirs) {
            const nr = r + d.dr;
            const nc = c + d.dc;
            if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                neighbors.push({ row: nr, col: nc });
            }
        }
        return neighbors;
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    /**
     * التحقق من صلاحية إضافة ذرة في الغرفة (r, c)
     */
    isValidMove(r, c, playerId = this.currentPlayerIndex) {
        if (this.isGameOver) return false;
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return false;
        const cell = this.board[r][c];
        return cell.owner === null || cell.owner === playerId;
    }

    /**
     * تنفيذ الحركة ومعالجة موجات الانشطار المتسلسلة بنظام الطابور BFS
     */
    executeTurn(r, c) {
        const playerId = this.currentPlayerIndex;
        if (!this.isValidMove(r, c, playerId)) {
            return { valid: false };
        }

        const cell = this.board[r][c];
        cell.owner = playerId;
        cell.atoms += 1;
        this.players[playerId].hasPlayed = true;

        // طابور الغرف التي بلغت أو تجاوزت الكتلة الحرجة
        let fissionQueue = [];
        if (cell.atoms >= cell.criticalMass) {
            fissionQueue.push({ row: r, col: c });
        }

        const waves = [];
        let safetyCounter = 0;
        const MAX_WAVES = 400; // حماية ضد الحلقات اللانهائية

        while (fissionQueue.length > 0 && safetyCounter < MAX_WAVES) {
            safetyCounter++;

            // إزالة التكرار مع التأكد من أن الغرفة فعلاً بلغت الكتلة الحرجة
            const uniqueCoords = [];
            const seen = new Set();
            for (const item of fissionQueue) {
                const key = `${item.row},${item.col}`;
                if (!seen.has(key) && this.board[item.row][item.col].atoms >= this.board[item.row][item.col].criticalMass) {
                    seen.add(key);
                    uniqueCoords.push(item);
                }
            }

            if (uniqueCoords.length === 0) break;

            const waveExplosions = [];
            const transfers = [];

            // 1. انشطار جميع الغرف غير المستقرة في هذه الموجة بالتزامن
            for (const { row, col } of uniqueCoords) {
                const explodingCell = this.board[row][col];
                const neighbors = this.getOrthogonalNeighbors(row, col);

                // خصم الكتلة الحرجة للخلية
                explodingCell.atoms -= explodingCell.criticalMass;
                if (explodingCell.atoms <= 0) {
                    explodingCell.atoms = 0;
                    explodingCell.owner = null;
                }

                waveExplosions.push({ row, col, playerId });

                for (const n of neighbors) {
                    transfers.push({
                        fromRow: row,
                        fromCol: col,
                        toRow: n.row,
                        toCol: n.col,
                        playerId: playerId
                    });
                }
            }

            // 2. توزيع الجسيمات المنشطرة على الغرف المجاورة والسيطرة عليها
            const nextQueueCandidates = [];
            for (const t of transfers) {
                const targetCell = this.board[t.toRow][t.toCol];
                targetCell.owner = playerId;
                targetCell.atoms += 1;
                if (targetCell.atoms >= targetCell.criticalMass) {
                    nextQueueCandidates.push({ row: t.toRow, col: t.toCol });
                }
            }

            this.recalculateStats();
            this.updateEliminations();

            // لقطة للحالة بعد هذه الموجة للعرض الحركي المتسلسل
            waves.push({
                waveIndex: safetyCounter,
                explosions: waveExplosions,
                transfers: transfers,
                boardSnapshot: this.cloneBoardState(),
                playersSnapshot: JSON.parse(JSON.stringify(this.players)),
                gameOverTriggered: this.isGameOver
            });

            if (this.isGameOver) {
                break;
            }

            fissionQueue = nextQueueCandidates;
        }

        if (waves.length > this.longestChain) {
            this.longestChain = waves.length;
        }

        this.recalculateStats();
        this.updateEliminations();

        if (!this.isGameOver) {
            this.advanceToNextAlivePlayer();
        }

        return {
            valid: true,
            placedAt: { row: r, col: c, playerId },
            waves: waves,
            isGameOver: this.isGameOver,
            winner: this.winner
        };
    }

    cloneBoardState() {
        return this.board.map(row => row.map(cell => ({ ...cell })));
    }

    /**
     * تحديث إحصائيات السيطرة على الغرف ومجموع الذرات لكل قوة نووية
     */
    recalculateStats() {
        for (const p of this.players) {
            p.cellCount = 0;
            p.atomCount = 0;
        }

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = this.board[r][c];
                if (cell.owner !== null && cell.atoms > 0) {
                    this.players[cell.owner].cellCount += 1;
                    this.players[cell.owner].atomCount += cell.atoms;
                }
            }
        }
    }

    /**
     * فحص الإقصاء وشروط النصر الدقيقة:
     * - اللاعب لا يُعتبر مقصياً إلا إذا كان قد أخذ دوره بالفعل (hasPlayed) وفقد جميع ذراته.
     * - اللاعب الذي لم يلعب دوره الأول بعد يظل حياً ومؤهلاً للعب.
     * - تنتهي المباراة فقط إذا شارك لاعبان على الأقل ولم يبقَ سوى لاعب واحد فقط يملك ذرات.
     */
    updateEliminations() {
        for (const p of this.players) {
            if (p.alive && p.hasPlayed && p.atomCount === 0) {
                p.alive = false;
            }
        }

        const alivePlayers = this.players.filter(p => p.alive);
        const playedCount = this.players.filter(p => p.hasPlayed).length;
        const playersWithAtoms = this.players.filter(p => p.atomCount > 0);

        // شروط الفوز الحاسمة
        if (playedCount >= 2 && alivePlayers.length === 1 && playersWithAtoms.length === 1) {
            this.isGameOver = true;
            this.winner = alivePlayers[0];
            this.players.forEach(p => {
                if (p.id !== this.winner.id) p.alive = false;
            });
        }
    }

    /**
     * الانتقال إلى اللاعب التالي الذي لم يُقصَ
     */
    advanceToNextAlivePlayer() {
        const total = this.players.length;
        let attempts = 0;
        do {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % total;
            if (this.currentPlayerIndex === 0) {
                this.turnNumber++;
            }
            attempts++;
        } while (!this.players[this.currentPlayerIndex].alive && attempts <= total);
    }

    /**
     * ذكاء اصطناعي استراتيجي (AI Bot) للمنافس الآلي
     */
    computeBestAIMove() {
        const aiId = this.currentPlayerIndex;
        const validMoves = [];

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.isValidMove(r, c, aiId)) {
                    validMoves.push({ r, c });
                }
            }
        }

        if (validMoves.length === 0) return null;

        let bestScore = -Infinity;
        let bestCandidates = [];

        for (const move of validMoves) {
            const cell = this.board[move.r][move.c];
            const neighbors = this.getOrthogonalNeighbors(move.r, move.c);
            let score = 0;

            const willExplode = (cell.atoms + 1) === cell.criticalMass;
            let enemyRisk = false;

            for (const n of neighbors) {
                const nCell = this.board[n.row][n.col];
                if (nCell.owner !== null && nCell.owner !== aiId) {
                    const enemyReady = (nCell.atoms === nCell.criticalMass - 1);
                    if (willExplode) {
                        score += nCell.atoms * 14 + (enemyReady ? 28 : 10);
                    } else if (enemyReady) {
                        enemyRisk = true;
                        score -= 20;
                    }
                }
            }

            // أفضلية استراتيجية للزوايا والأطراف في المراحل الأولى
            if (cell.owner === null) {
                if (cell.criticalMass === 2) score += 9;      // زاوية
                else if (cell.criticalMass === 3) score += 5; // طرف
            } else {
                if (!enemyRisk) score += 6;
            }

            score += Math.random() * 3;

            if (score > bestScore) {
                bestScore = score;
                bestCandidates = [move];
            } else if (Math.abs(score - bestScore) < 0.6) {
                bestCandidates.push(move);
            }
        }

        return bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
    }
}

/**
 * ============================================================================
 * 3. لوحات النظائر الإشعاعية والتحكم (Radioisotope Palettes)
 * ============================================================================
 */
const ISOTOPE_PALETTES = [
    { name: 'اليورانيوم المشع (U-235)', color: '#10b981', darkColor: '#064e3b', glow: 'rgba(16, 185, 129, 0.5)' },
    { name: 'البلوتونيوم النشط (Pu-239)', color: '#ef4444', darkColor: '#7f1d1d', glow: 'rgba(239, 68, 68, 0.5)' },
    { name: 'الكوبالت الكهربائي (Co-60)', color: '#0284c7', darkColor: '#0c4a6e', glow: 'rgba(2, 132, 199, 0.5)' },
    { name: 'السيزيوم المتوهج (Cs-137)', color: '#f59e0b', darkColor: '#78350f', glow: 'rgba(245, 158, 11, 0.5)' },
    { name: 'الأمريسيوم الذري (Am-241)', color: '#a855f7', darkColor: '#581c87', glow: 'rgba(168, 85, 247, 0.5)' },
    { name: 'الراديوم اللامع (Ra-226)',   color: '#06b6d4', darkColor: '#164e63', glow: 'rgba(6, 182, 212, 0.5)' }
];

/**
 * ============================================================================
 * 4. مدير واجهة المستخدم والتفاعل (AtomicWarsUIController)
 * ============================================================================
 */
class AtomicWarsUIController {
    constructor() {
        this.sound = new NuclearSoundManager();

        this.config = {
            gridSize: 7,
            waveSpeedMs: 210,
            playerCount: 2,
            showNumbers: true,
            playersSetup: [
                { name: 'اليورانيوم الأخضر', paletteIndex: 0, isAI: false },
                { name: 'البلوتونيوم الأحمر', paletteIndex: 1, isAI: false },
                { name: 'الكوبالت الأزرق',   paletteIndex: 2, isAI: true },
                { name: 'السيزيوم الذهبي',  paletteIndex: 3, isAI: true }
            ]
        };

        this.engine = null;
        this.isAnimating = false;
        this.cellElements = [];

        this.cacheDOM();
        this.bindEvents();
        this.startNewGame();
    }

    cacheDOM() {
        this.boardEl = document.getElementById('gameBoard');
        this.boardWrapperEl = document.getElementById('boardWrapper');
        this.playersListEl = document.getElementById('playersListContainer');
        this.currentPlayerNameEl = document.getElementById('currentPlayerName');
        this.turnDotEl = document.getElementById('turnDot');
        this.turnPingEl = document.getElementById('turnPing');
        this.turnCounterBadgeEl = document.getElementById('turnCounterBadge');
        this.chainWaveStatusEl = document.getElementById('chainWaveStatus');
        this.headerBoardInfoEl = document.getElementById('headerBoardInfo');
        this.geigerFillEl = document.getElementById('geigerMeterFill');

        // النوافذ المنبثقة
        this.victoryModal = document.getElementById('victoryModal');
        this.settingsModal = document.getElementById('settingsModal');
        this.rulesModal = document.getElementById('rulesModal');
    }

    bindEvents() {
        // شريط الأزرار العلوي
        document.getElementById('btnRestartFast').addEventListener('click', () => this.startNewGame());

        document.getElementById('btnToggleNumbers').addEventListener('click', () => {
            this.config.showNumbers = !this.config.showNumbers;
            this.renderBoardState(this.engine.board);
        });

        document.getElementById('btnSoundToggle').addEventListener('click', () => {
            this.sound.enabled = !this.sound.enabled;
            const icon = document.getElementById('soundIcon');
            icon.className = this.sound.enabled
                ? 'fa-solid fa-volume-high text-emerald-400'
                : 'fa-solid fa-volume-xmark text-rose-400';
        });

        // نافذة القواعد
        document.getElementById('btnRulesModal').addEventListener('click', () => this.toggleModal(this.rulesModal, true));
        document.getElementById('btnCloseRules').addEventListener('click', () => this.toggleModal(this.rulesModal, false));
        document.getElementById('btnGotItRules').addEventListener('click', () => this.toggleModal(this.rulesModal, false));

        // نافذة الإعدادات
        document.getElementById('btnSettingsModal').addEventListener('click', () => {
            this.populateSettingsModal();
            this.toggleModal(this.settingsModal, true);
        });
        document.getElementById('btnCloseSettings').addEventListener('click', () => this.toggleModal(this.settingsModal, false));

        // أزرار نافذة النصر
        document.getElementById('btnPlayAgainModal').addEventListener('click', () => {
            this.toggleModal(this.victoryModal, false);
            this.startNewGame();
        });
        document.getElementById('btnOpenSettingsFromWin').addEventListener('click', () => {
            this.toggleModal(this.victoryModal, false);
            this.populateSettingsModal();
            this.toggleModal(this.settingsModal, true);
        });

        // خيارات حجم المفاعل
        document.querySelectorAll('.size-option').forEach(btn => {
            btn.addEventListener('click', () => {
                this.config.gridSize = parseInt(btn.dataset.size, 10);
                this.updateButtonGroupHighlight('.size-option', btn, 'purple');
            });
        });

        // خيارات سرعة الانشطار
        document.querySelectorAll('.speed-option').forEach(btn => {
            btn.addEventListener('click', () => {
                this.config.waveSpeedMs = parseInt(btn.dataset.speed, 10);
                this.updateButtonGroupHighlight('.speed-option', btn, 'sky');
            });
        });

        // خيارات عدد القوى النووية (اللاعبين)
        document.querySelectorAll('.pcount-option').forEach(btn => {
            btn.addEventListener('click', () => {
                this.config.playerCount = parseInt(btn.dataset.count, 10);
                this.updateButtonGroupHighlight('.pcount-option', btn, 'emerald');
                this.renderPlayerSetupRows();
            });
        });

        // تطبيق الإعدادات وبدء اللقاء
        document.getElementById('btnApplySettings').addEventListener('click', () => {
            this.savePlayerSetupFromDOM();
            this.toggleModal(this.settingsModal, false);
            this.startNewGame();
        });
    }

    updateButtonGroupHighlight(selector, activeBtn, colorKey) {
        document.querySelectorAll(selector).forEach(btn => {
            btn.classList.remove('border-2', 'border-purple-500', 'border-sky-500', 'border-emerald-500', 'bg-purple-500/20', 'bg-sky-500/20', 'bg-emerald-500/20', 'text-white');
            btn.classList.add('border', 'border-slate-700', 'bg-slate-800/70', 'text-slate-300');
        });
        activeBtn.classList.remove('border', 'border-slate-700', 'bg-slate-800/70', 'text-slate-300');
        activeBtn.classList.add('border-2', `border-${colorKey}-500`, `bg-${colorKey}-500/20`, 'text-white');
    }

    toggleModal(modalEl, show) {
        if (show) {
            modalEl.classList.remove('hidden');
            modalEl.classList.add('flex');
        } else {
            modalEl.classList.add('hidden');
            modalEl.classList.remove('flex');
        }
    }

    /**
     * بدء مباراة جديدة
     */
    startNewGame() {
        this.isAnimating = false;
        const size = this.config.gridSize;
        const activePlayers = this.config.playersSetup.slice(0, this.config.playerCount).map(setup => {
            const palette = ISOTOPE_PALETTES[setup.paletteIndex] || ISOTOPE_PALETTES[0];
            return {
                name: setup.name,
                color: palette.color,
                darkColor: palette.darkColor,
                glow: palette.glow,
                isAI: setup.isAI
            };
        });

        this.engine = new AtomicWarsEngine(size, size, activePlayers);

        document.documentElement.style.setProperty('--grid-cols', size);
        document.documentElement.style.setProperty('--fly-duration', `${this.config.waveSpeedMs}ms`);
        this.headerBoardInfoEl.textContent = `مفاعل ${size}×${size} • ${size * size} غرفة انشطار`;

        this.buildGridDOM();
        this.renderBoardState(this.engine.board);
        this.renderScoreboard(this.engine.players);
        this.updateTurnIndicator();
        this.setWaveStatus('المفاعل في حالة استقرار', 'emerald');
        this.updateGeigerMeter(0);

        this.checkAndTriggerAITurn();
    }

    /**
     * بناء غرف المفاعل في شجرة الـ DOM
     */
    buildGridDOM() {
        this.boardEl.innerHTML = '';
        this.cellElements = [];

        for (let r = 0; r < this.engine.rows; r++) {
            const rowEls = [];
            for (let c = 0; c < this.engine.cols; c++) {
                const cellData = this.engine.board[r][c];
                const cellDiv = document.createElement('div');
                cellDiv.className = 'board-cell';
                cellDiv.dataset.row = r;
                cellDiv.dataset.col = c;

                // مؤشرات السعة الاستيعابية لكل غرفة (فتحات النظائر)
                let capSlotsHtml = '';
                for (let i = 0; i < cellData.maxStableCapacity; i++) {
                    capSlotsHtml += '<span class="capacity-slot"></span>';
                }

                cellDiv.innerHTML = `
                    <div class="capacity-indicator" title="أقصى استقرار: ${cellData.maxStableCapacity} ذرات">${capSlotsHtml}</div>
                    <div class="atom-cluster"></div>
                    <span class="cell-badge hidden">0</span>
                `;

                cellDiv.addEventListener('click', () => this.onCellClicked(r, c));
                this.boardEl.appendChild(cellDiv);
                rowEls.push(cellDiv);
            }
            this.cellElements.push(rowEls);
        }
    }

    async onCellClicked(r, c) {
        if (this.isAnimating || this.engine.isGameOver) return;
        const currentPlayer = this.engine.getCurrentPlayer();
        if (currentPlayer.isAI) return;

        await this.processPlayerMove(r, c);
    }

    /**
     * معالجة حركة اللاعب وعرض الانشطارات المتسلسلة
     */
    async processPlayerMove(r, c) {
        if (!this.engine.isValidMove(r, c)) return;

        this.isAnimating = true;
        const actingPlayer = this.engine.getCurrentPlayer();
        
        // تشغيل صوت وضع الذرة فوراً
        this.sound.playPlaceAtom();

        const result = this.engine.executeTurn(r, c);
        if (!result.valid) {
            this.isAnimating = false;
            return;
        }

        // إذا حدث تفاعل انشطاري متسلسل
        if (result.waves.length > 0) {
            for (let i = 0; i < result.waves.length; i++) {
                const wave = result.waves[i];
                this.setWaveStatus(`انشطار متسلسل • موجة ${wave.waveIndex}`, 'amber');
                this.updateGeigerMeter(Math.min(wave.waveIndex * 18, 100));
                this.sound.playFissionWave(wave.waveIndex);

                await this.animateExplosionWave(wave, actingPlayer);
                this.renderBoardState(wave.boardSnapshot);
                this.renderScoreboard(wave.playersSnapshot);
            }
        } else {
            this.renderBoardState(this.engine.board);
            this.renderScoreboard(this.engine.players);
        }

        this.setWaveStatus('المفاعل في حالة استقرار', 'emerald');
        this.updateGeigerMeter(0);

        if (result.isGameOver && result.winner) {
            this.updateTurnIndicator();
            this.sound.playVictory();
            setTimeout(() => this.showVictoryModal(result.winner), 350);
            this.isAnimating = false;
            return;
        }

        this.updateTurnIndicator();
        this.renderBoardState(this.engine.board);
        this.isAnimating = false;

        this.checkAndTriggerAITurn();
    }

    /**
     * تحريك الجسيمات الذرية المقذوفة نحو الغرف المجاورة
     */
    animateExplosionWave(wave, playerObj) {
        return new Promise(resolve => {
            const duration = this.config.waveSpeedMs;
            const flyingEls = [];

            // وميض الغرف المنشطرة
            for (const exp of wave.explosions) {
                const cellEl = this.cellElements[exp.row][exp.col];
                cellEl.style.setProperty('--explode-color', playerObj.color);
                cellEl.classList.add('cell-exploding');
                const cluster = cellEl.querySelector('.atom-cluster');
                if (cluster) cluster.innerHTML = '';
            }

            const boardRect = this.boardEl.getBoundingClientRect();

            for (const t of wave.transfers) {
                const fromCell = this.cellElements[t.fromRow][t.fromCol];
                const toCell = this.cellElements[t.toRow][t.toCol];

                const fromRect = fromCell.getBoundingClientRect();
                const toRect = toCell.getBoundingClientRect();

                const atomSize = Math.max(16, fromRect.width * 0.38);
                const startX = (fromRect.left - boardRect.left) + (fromRect.width / 2) - (atomSize / 2);
                const startY = (fromRect.top - boardRect.top) + (fromRect.height / 2) - (atomSize / 2);

                const deltaX = (toRect.left - fromRect.left);
                const deltaY = (toRect.top - fromRect.top);

                const flyer = document.createElement('div');
                flyer.className = 'flying-atom';
                flyer.style.width = `${atomSize}px`;
                flyer.style.height = `${atomSize}px`;
                flyer.style.left = `${startX}px`;
                flyer.style.top = `${startY}px`;
                flyer.style.setProperty('--atom-color', playerObj.color);
                flyer.style.setProperty('--atom-dark', playerObj.darkColor);

                this.boardEl.appendChild(flyer);
                
                // إجبار المتصفح على إعادة الحساب (Force Reflow) لضمان نعومة الحركة
                void flyer.offsetWidth;

                flyingEls.push({ el: flyer, deltaX, deltaY });
            }

            requestAnimationFrame(() => {
                for (const item of flyingEls) {
                    item.el.style.transform = `translate(${item.deltaX}px, ${item.deltaY}px)`;
                }
            });

            setTimeout(() => {
                for (const item of flyingEls) {
                    item.el.remove();
                }
                for (const exp of wave.explosions) {
                    this.cellElements[exp.row][exp.col].classList.remove('cell-exploding');
                }
                resolve();
            }, duration);
        });
    }

    /**
     * تحديث رسم خلايا المفاعل في الـ DOM
     */
    renderBoardState(boardMatrix) {
        const currentPlayerId = this.engine.currentPlayerIndex;

        for (let r = 0; r < this.engine.rows; r++) {
            for (let c = 0; c < this.engine.cols; c++) {
                const cell = boardMatrix[r][c];
                const cellEl = this.cellElements[r][c];
                const clusterEl = cellEl.querySelector('.atom-cluster');
                const badgeEl = cellEl.querySelector('.cell-badge');
                const slotEls = cellEl.querySelectorAll('.capacity-slot');

                const canClick = !this.engine.isGameOver && (cell.owner === null || cell.owner === currentPlayerId);
                cellEl.classList.toggle('valid-move', canClick);
                cellEl.classList.toggle('invalid-move', !canClick);

                cellEl.classList.remove('critical-ready', 'stable-cluster');
                clusterEl.className = 'atom-cluster';
                clusterEl.innerHTML = '';

                // تحديث فتحات السعة
                slotEls.forEach((slot, idx) => {
                    if (idx < cell.atoms) {
                        slot.classList.add('filled');
                        if (cell.owner !== null) {
                            slot.style.setProperty('--atom-color', this.engine.players[cell.owner].color);
                        }
                    } else {
                        slot.classList.remove('filled');
                    }
                });

                if (cell.atoms > 0 && cell.owner !== null) {
                    const ownerPlayer = this.engine.players[cell.owner];
                    cellEl.style.borderColor = `${ownerPlayer.color}55`;
                    cellEl.style.backgroundColor = `${ownerPlayer.color}15`;

                    // حالة الكتلة الحرجة (على وشك الانشطار)
                    if (cell.atoms >= cell.maxStableCapacity) {
                        cellEl.classList.add('critical-ready');
                    } else if (cell.atoms > 1) {
                        cellEl.classList.add('stable-cluster');
                    }

                    const visualCount = Math.min(cell.atoms, 4);
                    const countClass = cell.atoms <= 3 ? `atom-count-${cell.atoms}` : 'atom-count-many';
                    clusterEl.classList.add(countClass);

                    // رسم الأنوية الذرية والمدارات الإلكترونية
                    for (let i = 0; i < visualCount; i++) {
                        const nucleus = document.createElement('div');
                        nucleus.className = 'atomic-nucleus';
                        nucleus.style.setProperty('--atom-color', ownerPlayer.color);
                        nucleus.style.setProperty('--atom-dark', ownerPlayer.darkColor);
                        clusterEl.appendChild(nucleus);
                    }

                    // مدار إلكتروني تجميلي
                    const orbit = document.createElement('div');
                    orbit.className = 'electron-orbit orbit-1';
                    orbit.style.setProperty('--atom-color', ownerPlayer.color);
                    clusterEl.appendChild(orbit);

                    if (cell.atoms >= 2) {
                        const orbit2 = document.createElement('div');
                        orbit2.className = 'electron-orbit orbit-2';
                        orbit2.style.setProperty('--atom-color', ownerPlayer.color);
                        clusterEl.appendChild(orbit2);
                    }

                    // شارة الرقم
                    if (this.config.showNumbers) {
                        badgeEl.textContent = cell.atoms;
                        badgeEl.style.borderColor = ownerPlayer.color;
                        badgeEl.classList.remove('hidden');
                    } else {
                        badgeEl.classList.add('hidden');
                    }
                } else {
                    cellEl.style.borderColor = 'rgba(148, 163, 184, 0.16)';
                    cellEl.style.backgroundColor = 'rgba(30, 41, 59, 0.85)';
                    badgeEl.classList.add('hidden');
                }
            }
        }
    }

    /**
     * تحديث لوحة النقاط وقائمة القوى النووية
     */
    renderScoreboard(playersList) {
        this.playersListEl.innerHTML = '';
        const currentId = this.engine.currentPlayerIndex;

        playersList.forEach(p => {
            const isTurn = !this.engine.isGameOver && p.id === currentId;
            const card = document.createElement('div');
            card.className = `p-3 rounded-xl border transition-all duration-300 flex items-center justify-between ${
                !p.alive
                    ? 'bg-slate-900/40 border-slate-800 opacity-50 grayscale'
                    : isTurn
                        ? 'bg-slate-800/95 border-2 shadow-lg scale-[1.02]'
                        : 'bg-slate-800/50 border-slate-700/70'
            }`;

            if (isTurn && p.alive) {
                card.style.borderColor = p.color;
                card.style.boxShadow = `0 0 16px ${p.glow}`;
            }

            const statusLabel = !p.alive
                ? '<span class="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">مُدمّر بالكامل</span>'
                : isTurn
                    ? '<span class="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold animate-pulse">إطلاق نووي</span>'
                    : '';

            card.innerHTML = `
                <div class="flex items-center gap-2.5 min-w-0">
                    <span class="w-4 h-4 rounded-full shrink-0 shadow-sm" style="background-color: ${p.color}; box-shadow: 0 0 8px ${p.color};"></span>
                    <div class="truncate">
                        <div class="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5 truncate">
                            <span>${p.name}</span>
                            ${p.isAI ? '<i class="fa-solid fa-robot text-[11px] text-sky-400" title="ذكاء اصطناعي"></i>' : ''}
                        </div>
                        ${statusLabel}
                    </div>
                </div>
                <div class="flex items-center gap-3 text-left shrink-0">
                    <div class="text-center">
                        <div class="text-[10px] text-slate-400">الغرف</div>
                        <div class="text-xs sm:text-sm font-black text-slate-200">${p.cellCount}</div>
                    </div>
                    <div class="text-center">
                        <div class="text-[10px] text-slate-400">الذرات</div>
                        <div class="text-xs sm:text-sm font-black" style="color: ${p.color}">${p.atomCount}</div>
                    </div>
                </div>
            `;

            this.playersListEl.appendChild(card);
        });

        this.turnCounterBadgeEl.textContent = `الجولة ${this.engine.turnNumber}`;
    }

    updateTurnIndicator() {
        const currentPlayer = this.engine.getCurrentPlayer();
        document.documentElement.style.setProperty('--turn-color', currentPlayer.color);
        document.documentElement.style.setProperty('--turn-glow', currentPlayer.glow);

        this.currentPlayerNameEl.textContent = currentPlayer.name + (currentPlayer.isAI ? ' (آلي)' : '');
        this.currentPlayerNameEl.style.color = currentPlayer.color;
        this.turnDotEl.style.backgroundColor = currentPlayer.color;
        this.turnPingEl.style.backgroundColor = currentPlayer.color;
    }

    setWaveStatus(text, colorKey) {
        this.chainWaveStatusEl.textContent = text;
        if (colorKey === 'amber') {
            this.chainWaveStatusEl.className = 'text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse';
        } else {
            this.chainWaveStatusEl.className = 'text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
        }
    }

    updateGeigerMeter(percent) {
        if (this.geigerFillEl) {
            this.geigerFillEl.style.width = `${Math.max(8, percent)}%`;
        }
    }

    checkAndTriggerAITurn() {
        if (this.engine.isGameOver) return;
        const currentPlayer = this.engine.getCurrentPlayer();
        if (currentPlayer.isAI) {
            this.isAnimating = true;
            setTimeout(async () => {
                const aiMove = this.engine.computeBestAIMove();
                if (aiMove) {
                    await this.processPlayerMove(aiMove.r, aiMove.c);
                } else {
                    this.isAnimating = false;
                }
            }, 420);
        }
    }

    showVictoryModal(winner) {
        const banner = document.getElementById('winnerBannerBox');
        const circle = document.getElementById('winnerColorCircle');
        const nameText = document.getElementById('winnerNameText');

        banner.style.backgroundColor = `${winner.color}18`;
        banner.style.borderColor = winner.color;
        circle.style.backgroundColor = winner.color;
        circle.style.boxShadow = `0 0 14px ${winner.color}`;
        nameText.textContent = winner.name;
        nameText.style.color = winner.color;

        document.getElementById('statTotalTurns').textContent = this.engine.turnNumber;
        document.getElementById('statMaxChain').textContent = `${this.engine.longestChain} موجات`;
        document.getElementById('statFinalCells').textContent = winner.cellCount;

        this.toggleModal(this.victoryModal, true);
    }

    populateSettingsModal() {
        // تحديد أزرار الحجم والسرعة والعدد بناءً على الإعدادات الحالية
        document.querySelectorAll('.size-option').forEach(btn => {
            if (parseInt(btn.dataset.size, 10) === this.config.gridSize) {
                this.updateButtonGroupHighlight('.size-option', btn, 'purple');
            }
        });

        document.querySelectorAll('.speed-option').forEach(btn => {
            if (parseInt(btn.dataset.speed, 10) === this.config.waveSpeedMs) {
                this.updateButtonGroupHighlight('.speed-option', btn, 'sky');
            }
        });

        document.querySelectorAll('.pcount-option').forEach(btn => {
            if (parseInt(btn.dataset.count, 10) === this.config.playerCount) {
                this.updateButtonGroupHighlight('.pcount-option', btn, 'emerald');
            }
        });

        this.renderPlayerSetupRows();
    }

    renderPlayerSetupRows() {
        const container = document.getElementById('playerSetupRows');
        container.innerHTML = '';

        for (let i = 0; i < this.config.playerCount; i++) {
            const pSetup = this.config.playersSetup[i];
            const row = document.createElement('div');
            row.className = 'flex items-center gap-2 bg-slate-800/70 p-2.5 rounded-xl border border-slate-700';

            const colorSwatches = ISOTOPE_PALETTES.map((pal, idx) => `
                <button type="button" data-player="${i}" data-palette="${idx}"
                    class="palette-swatch w-6 h-6 rounded-full border-2 transition transform ${pSetup.paletteIndex === idx ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'}"
                    style="background-color: ${pal.color};" title="${pal.name}">
                </button>
            `).join('');

            row.innerHTML = `
                <input type="text" data-player-name="${i}" value="${pSetup.name}" maxlength="18"
                    class="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white w-28 sm:w-36 focus:outline-none focus:border-purple-500" />
                <div class="flex items-center gap-1.5 flex-1 justify-center">
                    ${colorSwatches}
                </div>
                <label class="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-700">
                    <input type="checkbox" data-player-ai="${i}" ${pSetup.isAI ? 'checked' : ''} class="accent-sky-500 rounded" />
                    <span>آلي</span>
                </label>
            `;
            container.appendChild(row);
        }

        container.querySelectorAll('.palette-swatch').forEach(btn => {
            btn.addEventListener('click', () => {
                const pIdx = parseInt(btn.dataset.player, 10);
                const palIdx = parseInt(btn.dataset.palette, 10);
                this.savePlayerSetupFromDOM();
                this.config.playersSetup[pIdx].paletteIndex = palIdx;
                this.renderPlayerSetupRows();
            });
        });
    }

    savePlayerSetupFromDOM() {
        const container = document.getElementById('playerSetupRows');
        container.querySelectorAll('[data-player-name]').forEach(input => {
            const idx = parseInt(input.dataset.playerName, 10);
            const val = input.value.trim();
            if (val) this.config.playersSetup[idx].name = val;
        });
        container.querySelectorAll('[data-player-ai]').forEach(chk => {
            const idx = parseInt(chk.dataset.playerAi, 10);
            this.config.playersSetup[idx].isAI = chk.checked;
        });
    }
}

// إتاحة الكلاسات للاستخدام الخارجي والاختبار
if (typeof window !== 'undefined') {
    window.NuclearSoundManager = NuclearSoundManager;
    window.AtomicWarsEngine = AtomicWarsEngine;
    window.AtomicWarsUIController = AtomicWarsUIController;
    if (typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('DOMContentLoaded', () => {
            window.atomicWarsApp = new AtomicWarsUIController();
        });
    }
}
if (typeof global !== 'undefined') {
    global.AtomicWarsEngine = AtomicWarsEngine;
    global.NuclearSoundManager = NuclearSoundManager;
    global.AtomicWarsUIController = AtomicWarsUIController;
}
