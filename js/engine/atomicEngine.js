/**
 * ============================================================================
 * الحرب الذرية (Atomic War) - لوحات النظائر الإشعاعية (Radioisotope Palettes)
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
 * محرك اللعبة النووي الخالص (AtomicWarsEngine)
 * يدير مصفوفة المفاعل ثنائية الأبعاد، حساب الكتلة الحرجة، معالجة الانشطار
 * وقواعد الإقصاء الصحيحة متعددة اللاعبين مع دعم أنماط اللعب المتعددة
 * ============================================================================
 */
class AtomicWarsEngine {
    constructor(rows = 7, cols = 7, playersConfig = [], gameMode = 'normal') {
        this.rows = rows;
        this.cols = cols;
        
        // ربط كائن وضع اللعب المختار
        if (typeof gameMode === 'object' && gameMode !== null) {
            this.mode = gameMode;
        } else if (typeof GAME_MODES !== 'undefined' && GAME_MODES[gameMode]) {
            this.mode = GAME_MODES[gameMode];
        } else {
            // كائن احتياطي للوضع
            this.mode = {
                id: gameMode,
                name: gameMode === 'advanced' ? 'البطاقات الذرية' : 'الوضع العادي',
                getOpeningAtoms: () => 3,
                hasOpeningShield: () => true,
                isValidMove: (eng, r, c, pid) => {
                    if (gameMode === 'normal' && eng.players[pid] && eng.players[pid].hasPlayed) {
                        return eng.board[r][c].owner === pid;
                    }
                    return true;
                },
                getAiExpansionBonus: () => (gameMode === 'normal' ? 9 : 4)
            };
        }
        this.gameMode = this.mode.id;

        this.players = playersConfig.map((p, index) => ({
            id: index,
            name: p.name,
            color: p.color,
            darkColor: p.darkColor,
            glow: p.glow,
            isAI: !!p.isAI,
            alive: true,
            hasPlayed: false,
            neutrons: 0,
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
                    criticalMass: criticalMass,         // الكتلة الحرجة التي تؤدي للانشطار (2، 3، 4)
                    hasShield: false,                   // درع طاقة واقٍ في الجولة الأولى
                    shieldPlayer: null,                 // اللاعب صاحب الدرع
                    shieldZoneOwner: null,              // مالك نطاق الحماية 3×3
                    hasControlRod: false                // قضيب تحكم نووي (مهدئ) يمتص انفجارات الخصم
                });
            }
            this.board.push(row);
        }
        this.recalculateStats();
    }

    /**
     * حساب عتبة الكتلة الحرجة للغرفة بحسب موقعها الهندسي ووضع اللعبة
     */
    calculateCriticalMass(r, c) {
        // في الوضع العادي (Normal Mode): كل الغرف متماثلة، تتسع لـ 3 ذرات كحد أقصى وتنفجر عند 4
        if (this.gameMode === 'normal' || (this.mode && typeof this.mode.hasUniformCriticalMass === 'function' && this.mode.hasUniformCriticalMass())) {
            return 4;
        }

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
     * فحص ديناميكي لمالك نطاق الحماية 3×3 (يعتمد حصراً على وجود درع نشط)
     */
    getCellShieldZoneOwner(r, c, board = this.board) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                    const nCell = board[nr][nc];
                    if (nCell.hasShield && nCell.shieldPlayer !== null) {
                        return nCell.shieldPlayer;
                    }
                }
            }
        }
        return null;
    }

    /**
     * فحص ما إذا كان المربع يقع داخل مربع الحماية 3×3 لأي خصم آخر
     */
    isInsideOpponentShieldZone(r, c, playerId) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                    const nCell = this.board[nr][nc];
                    if (nCell.hasShield && nCell.shieldPlayer !== null && nCell.shieldPlayer !== playerId) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /**
     * التحقق من صلاحية إضافة ذرة أو تثبيت قضيب تحكم في الغرفة (r, c)
     * @param {number} r
     * @param {number} c
     * @param {number} playerId
     * @param {number} atomCount عدد الذرات المراد إلقاؤها (1, 2, 3)
     * @param {string} actionType نوع الإجراء ('atom' أو 'controlRod')
     */
    isValidMove(r, c, playerId = this.currentPlayerIndex, atomCount = 1, actionType = 'atom') {
        if (this.isGameOver) return false;
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return false;
        const cell = this.board[r][c];

        if (actionType === 'controlRod' || actionType === 'energyDrain') {
            if (this.mode && typeof this.mode.isValidMove === 'function') {
                return this.mode.isValidMove(this, r, c, playerId, atomCount, actionType);
            }
            return false;
        }

        if (cell.owner !== null && cell.owner !== playerId) return false;

        // حظر نهائي لوضع الذرة داخل مربع الحماية 3×3 لأي خصم ما دام درعه نشطاً
        if (this.isInsideOpponentShieldZone(r, c, playerId)) {
            return false;
        }

        // تطبيق قاعدة الوضع المخصص (مثل الوضع العادي المقيد أو المطور بنظام النيوترونات)
        if (this.mode && typeof this.mode.isValidMove === 'function') {
            if (!this.mode.isValidMove(this, r, c, playerId, atomCount, actionType)) {
                return false;
            }
        }

        return true;
    }

    /**
     * تنفيذ الحركة ومعالجة موجات الانشطار المتسلسلة بنظام الطابور BFS
     * @param {number} r
     * @param {number} c
     * @param {number} atomCount عدد الذرات المراد إلقاؤها من الترسانة
     * @param {string} actionType نوع الإجراء ('atom' أو 'controlRod')
     */
    executeTurn(r, c, atomCount = 1, actionType = 'atom') {
        const playerId = this.currentPlayerIndex;
        if (!this.isValidMove(r, c, playerId, atomCount, actionType)) {
            return { valid: false };
        }

        const cell = this.board[r][c];
        const player = this.players[playerId];
        const isFirstMove = !player.hasPlayed;

        // تنفيذ إجراء تثبيت قضيب التحكم النووي
        if (actionType === 'controlRod') {
            const rodCost = (this.mode && typeof this.mode.getControlRodCost === 'function') ? this.mode.getControlRodCost() : 5;
            player.neutrons = Math.max(0, (player.neutrons || 0) - rodCost);
            cell.hasControlRod = true;

            this.recalculateStats();
            this.updateEliminations();

            if (!this.isGameOver) {
                this.advanceToNextAlivePlayer();
            }

            return {
                valid: true,
                actionType: 'controlRod',
                placedAt: { row: r, col: c, playerId },
                waves: [],
                isGameOver: this.isGameOver,
                winner: this.winner
            };
        }

        // تنفيذ إجراء هجوم إخماد طاقة ذرة معادية
        if (actionType === 'energyDrain') {
            const drainCost = (this.mode && typeof this.mode.getEnergyDrainCost === 'function') ? this.mode.getEnergyDrainCost() : 3;
            player.neutrons = Math.max(0, (player.neutrons || 0) - drainCost);

            let absorbedByRod = false;
            if (cell.hasControlRod) {
                cell.hasControlRod = false; // استهلاك درع الخصم الواقي في امتصاص الهجوم
                absorbedByRod = true;
            } else {
                cell.atoms = 1; // إرجاع الذرة المعادية لمستوى طاقتها الأول
            }

            this.recalculateStats();
            this.updateEliminations();

            if (!this.isGameOver) {
                this.advanceToNextAlivePlayer();
            }

            return {
                valid: true,
                actionType: 'energyDrain',
                placedAt: { row: r, col: c, playerId },
                absorbedByRod: absorbedByRod,
                waves: [],
                isGameOver: this.isGameOver,
                winner: this.winner
            };
        }

        // إذا كان هذا هو الدور الثاني أو اللاحق للاعب، تنتهي صلاحية درعه الخاص
        if (!isFirstMove) {
            this.clearPlayerShield(playerId);
        }

        let atomsToAdd = 1;
        if (isFirstMove) {
            atomsToAdd = (this.mode && typeof this.mode.getOpeningAtoms === 'function' ? this.mode.getOpeningAtoms() : 3);
            player.neutrons = 0;
        } else {
            const hasNeutrons = (this.mode && typeof this.mode.hasNeutronSystem === 'function' && this.mode.hasNeutronSystem());
            if (hasNeutrons) {
                if (cell.owner === null) {
                    // إلقاء ذرة خارجية في غرفة فارغة (تكلفة المستوى: 3 للأحادية، 6 للثنائية، 9 للثلاثية)
                    const cost = (typeof this.mode.getExternalAtomCost === 'function')
                        ? this.mode.getExternalAtomCost(atomCount)
                        : (atomCount === 1 ? 3 : (atomCount === 2 ? 6 : 9));
                    atomsToAdd = Math.max(1, Math.min(3, atomCount));
                    player.neutrons = Math.max(0, (player.neutrons || 0) - cost);
                } else {
                    // تغذية غرفة مملوكة بنواة واحدة فقط (تكلفة 1 نيوترون)
                    atomsToAdd = 1;
                    player.neutrons = Math.max(0, (player.neutrons || 0) - 1);
                }
            } else {
                atomsToAdd = 1;
            }
        }

        cell.owner = playerId;
        cell.atoms += atomsToAdd;
        player.hasPlayed = true;

        // تفعيل درع الطاقة النووي ومربع الحماية 3×3 في الجولة الأولى
        const shouldShield = isFirstMove && (this.mode && typeof this.mode.hasOpeningShield === 'function' ? this.mode.hasOpeningShield() : true);
        if (shouldShield) {
            cell.hasShield = true;
            cell.shieldPlayer = playerId;

            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                        this.board[nr][nc].shieldZoneOwner = playerId;
                    }
                }
            }
        }

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

                explodingCell.atoms -= explodingCell.criticalMass;
                if (explodingCell.atoms <= 0) {
                    explodingCell.atoms = 0;
                    explodingCell.owner = null;
                }

                waveExplosions.push({ row, col, playerId });

                const dirs = [
                    { dr: -1, dc: 0 },
                    { dr: 1,  dc: 0 },
                    { dr: 0,  dc: 1 },
                    { dr: 0,  dc: -1 }
                ];

                for (const d of dirs) {
                    const nr = row + d.dr;
                    const nc = col + d.dc;
                    const inBounds = (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols);

                    if (inBounds) {
                        transfers.push({
                            fromRow: row,
                            fromCol: col,
                            toRow: nr,
                            toCol: nc,
                            playerId: playerId,
                            isVoid: false
                        });
                    } else if (explodingCell.criticalMass === 4) {
                        // في الغرف ذات السعة الموحدة 3 (تنفجر عند 4): المقذوفات المنطلقة للخارج تضيع في حواف الفضاء
                        transfers.push({
                            fromRow: row,
                            fromCol: col,
                            toRow: nr,
                            toCol: nc,
                            playerId: playerId,
                            isVoid: true,
                            outDir: { dr: d.dr, dc: d.dc }
                        });
                    }
                }
            }

            // 2. توزيع الجسيمات المنشطرة على الغرف المجاورة والسيطرة عليها
            const nextQueueCandidates = [];
            for (const t of transfers) {
                if (t.isVoid) {
                    continue; // مقذوف ضائع في الفضاء خارج حدود المفاعل
                }
                const targetCell = this.board[t.toRow][t.toCol];
                
                // إذا كانت الغرفة الهدف داخل مربع حماية 3×3 لخصم آخر أو محمية بدرع
                if (this.isInsideOpponentShieldZone(t.toRow, t.toCol, playerId) || (targetCell.hasShield && targetCell.owner !== null && targetCell.owner !== playerId)) {
                    continue;
                }

                // آلية 2: امتصاص قضيب التحكم النووي (Control Rod Absorber)
                if (targetCell.hasControlRod && targetCell.owner !== null && targetCell.owner !== playerId) {
                    targetCell.hasControlRod = false; // استهلاك قضيب التحكم في امتصاص الصدمة
                    t.absorbedByControlRod = true;
                    t.dampenedAt = { row: t.toRow, col: t.toCol };
                    continue; // تم إخماد المقذوف وحماية الغرفة بالكامل!
                }

                // آلية 3: مقاومة النواة الثلاثية (Triple Atom Resistance)
                const hasCoreResistance = (this.mode && typeof this.mode.hasFortressCoreResistance === 'function' && this.mode.hasFortressCoreResistance());
                if (hasCoreResistance && targetCell.owner !== null && targetCell.owner !== playerId && targetCell.atoms >= 3) {
                    // الذرة الثلاثية فقط من لا تهزم من أول ضربة: تمتص المقذوف وتتحول إلى ذرة أحادية (3 ➔ 1) دون أن تسقط للخصم أو تنفجر!
                    targetCell.atoms = 1;
                    t.coreResisted = true;
                    t.resistedAt = { row: t.toRow, col: t.toCol, remainingAtoms: 1 };
                    continue; // المقذوف تم امتصاصه واستنفاده
                }

                targetCell.owner = playerId;
                targetCell.atoms += 1;
                if (targetCell.atoms >= targetCell.criticalMass) {
                    nextQueueCandidates.push({ row: t.toRow, col: t.toCol });
                }
            }

            this.recalculateStats();
            this.updateEliminations();

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
     * فحص الإقصاء وشروط النصر الدقيقة
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

        // تجدد رصيد النيوترونات للاعب صاحب الدور الجديد إذا كان قد لعب ضربته الافتتاحية
        const nextPlayer = this.players[this.currentPlayerIndex];
        if (nextPlayer && nextPlayer.alive && nextPlayer.hasPlayed) {
            if (this.mode && typeof this.mode.hasNeutronSystem === 'function' && this.mode.hasNeutronSystem()) {
                const perTurn = typeof this.mode.getNeutronPerTurn === 'function' ? this.mode.getNeutronPerTurn() : 2;
                const maxN = typeof this.mode.getMaxNeutrons === 'function' ? this.mode.getMaxNeutrons() : 10;
                nextPlayer.neutrons = Math.min(maxN, (nextPlayer.neutrons || 0) + perTurn);
            }
        }
    }

    /**
     * فحص ما إذا كان للاعب درع نشط على اللوحة
     */
    hasActiveShield(playerId) {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.board[r][c].hasShield && this.board[r][c].shieldPlayer === playerId) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * جلب إحداثيات الخلية المركزية وخلايا نطاق 3×3 لدرع اللاعب
     */
    getPlayerShieldCells(playerId) {
        let centerCell = null;
        const zoneCells = [];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.board[r][c].hasShield && this.board[r][c].shieldPlayer === playerId) {
                    centerCell = { r, c };
                    break;
                }
            }
            if (centerCell) break;
        }

        if (centerCell) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = centerCell.r + dr;
                    const nc = centerCell.c + dc;
                    if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                        zoneCells.push({ r: nr, c: nc });
                    }
                }
            }
        }
        return { centerCell, zoneCells };
    }

    /**
     * تعطيل درع ومربع حماية 3×3 للاعب معين
     */
    clearPlayerShield(playerId) {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.board[r][c].shieldPlayer === playerId) {
                    this.board[r][c].hasShield = false;
                    this.board[r][c].shieldPlayer = null;
                }
                if (this.board[r][c].shieldZoneOwner === playerId) {
                    this.board[r][c].shieldZoneOwner = null;
                }
            }
        }
    }

    /**
     * تعطيل كافة الدروع ومربعات الحماية
     */
    clearAllShields() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                this.board[r][c].hasShield = false;
                this.board[r][c].shieldPlayer = null;
                this.board[r][c].shieldZoneOwner = null;
            }
        }
    }

    /**
     * حساب أفضل حركة للذكاء الاصطناعي (تفويض لخوارزمية AtomicAIBot)
     */
    computeBestAIMove() {
        if (typeof AtomicAIBot !== 'undefined' && typeof AtomicAIBot.computeBestMove === 'function') {
            return AtomicAIBot.computeBestMove(this);
        }
        return null;
    }
}

if (typeof window !== 'undefined') {
    window.ISOTOPE_PALETTES = ISOTOPE_PALETTES;
    window.AtomicWarsEngine = AtomicWarsEngine;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ISOTOPE_PALETTES, AtomicWarsEngine };
}
