/**
 * ============================================================================
 * الحرب الذرية (Atomic War) - مدير واجهة المستخدم والتفاعل (AtomicWarsUIController)
 * الملف الرئيسي لتنسيق الأحداث والأنيميشن وإدارة المفاعل
 * ============================================================================
 */
class AtomicWarsUIController {
    constructor() {
        this.sound = new NuclearSoundManager();
        this.welcomeSim = new WelcomeBackgroundSimulation('welcomeBgCanvas');
        this.welcomeToastTimeout = null;

        this.config = {
            gameMode: 'normal', // 'normal' | 'advanced' | 'mode2' | 'mode3'
            gridSize: 7,
            waveSpeedMs: 210,
            playerCount: 2,
            showNumbers: false,
            playersSetup: [
                { name: 'اليورانيوم الأخضر', paletteIndex: 0, isAI: false },
                { name: 'البلوتونيوم الأحمر', paletteIndex: 1, isAI: false },
                { name: 'الكوبالت الأزرق',   paletteIndex: 2, isAI: true },
                { name: 'السيزيوم الذهبي',  paletteIndex: 3, isAI: true }
            ]
        };

        this.engine = null;
        this.inBattle = false;
        this.isAnimating = false;
        this.aiTimer = null;
        this.cellElements = [];

        this.cacheDOM();
        this.bindEvents();
        this.renderWelcomePreview();
        this.updateModeUI();

        // تشغيل محاكاة المعركة الخلفية تلقائياً للشاشة الترحيبية
        if (this.welcomeScreenEl && !this.welcomeScreenEl.classList.contains('hidden')) {
            this.welcomeSim.start();
        }
    }

    cacheDOM() {
        // شاشات العرض الرئيسية
        this.welcomeScreenEl = document.getElementById('welcomeScreen');
        this.battleScreenEl = document.getElementById('battleScreen');
        this.welcomePlayersPreviewEl = document.getElementById('welcomePlayersPreview');
        this.welcomeToastEl = document.getElementById('welcomeToast');
        this.welcomeSoundIconEl = document.getElementById('welcomeSoundIcon');

        // عناصر شاشة المعركة واللوحة
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
        this.geigerValEl = document.getElementById('geigerValueText');

        // شارات ونصوص الوضع النشط
        this.activeModeBadgeEl = document.getElementById('activeModeBadge');
        this.rulePlacementDescEl = document.getElementById('rulePlacementDesc');
        this.victoryModeBadgeEl = document.getElementById('victoryModeBadge');

        // النوافذ المنبثقة
        this.victoryModal = document.getElementById('victoryModal');
        this.settingsModal = document.getElementById('settingsModal');
        this.rulesModal = document.getElementById('rulesModal');

        // شريط الترسانة ورصيد النيوترونات التكتيكي
        this.neutronArsenalBarEl = document.getElementById('neutronArsenalBar');
        this.neutronValueDisplayEl = document.getElementById('neutronValueDisplay');
        this.neutronMeterTrackEl = document.getElementById('neutronMeterTrack');
        this.arsenalHintTextEl = document.getElementById('arsenalHintText');
        this.arsenalBtns = document.querySelectorAll('.arsenal-btn');
        this.selectedArsenalAtom = null;
        this.selectedAction = null; // null = لا توجد بطاقة محددة (الوضع الافتراضي لتغذية الذرات الحليفة)
    }

    bindEvents() {
        // أزرار الشاشة الترحيبية واختيار وضع اللعب
        const btnStartNormal = document.getElementById('btnStartNormalMode');
        if (btnStartNormal) {
            btnStartNormal.addEventListener('click', () => this.launchMode('normal'));
        }

        const btnStartAdvanced = document.getElementById('btnStartAdvancedMode');
        if (btnStartAdvanced) {
            btnStartAdvanced.addEventListener('click', () => this.launchMode('advanced'));
        }

        // الأزرار المغلقة (وضع 2 ووضع 3)
        const btnMode2 = document.getElementById('btnMode2');
        if (btnMode2) {
            btnMode2.addEventListener('click', () => {
                this.showWelcomeToast('وضع 2 مغلق حالياً');
                this.sound.playShieldDeflect();
            });
        }

        const btnMode3 = document.getElementById('btnMode3');
        if (btnMode3) {
            btnMode3.addEventListener('click', () => {
                this.showWelcomeToast('وضع 3 مغلق حالياً');
                this.sound.playShieldDeflect();
            });
        }

        // أزرار الهيدر في الشاشة الترحيبية
        const btnWelcomeSound = document.getElementById('btnWelcomeSoundToggle');
        if (btnWelcomeSound) {
            btnWelcomeSound.addEventListener('click', () => {
                this.sound.enabled = !this.sound.enabled;
                this.syncSoundIcons();
            });
        }

        const btnWelcomeRules = document.getElementById('btnWelcomeRulesModal') || document.getElementById('btnWelcomeRules');
        if (btnWelcomeRules) {
            btnWelcomeRules.addEventListener('click', () => this.toggleModal(this.rulesModal, true));
        }

        const btnWelcomeSettings = document.getElementById('btnWelcomeSettingsModal') || document.getElementById('btnWelcomeSettings');
        if (btnWelcomeSettings) {
            btnWelcomeSettings.addEventListener('click', () => {
                this.populateSettingsModal();
                this.toggleModal(this.settingsModal, true);
            });
        }

        // أزرار العودة للشاشة الترحيبية وتغيير الوضع
        const btnBackToWelcome = document.getElementById('btnBackToWelcome');
        if (btnBackToWelcome) {
            btnBackToWelcome.addEventListener('click', () => this.showWelcomeScreen());
        }

        const btnBackFromWin = document.getElementById('btnBackToWelcomeFromWin');
        if (btnBackFromWin) {
            btnBackFromWin.addEventListener('click', () => this.showWelcomeScreen());
        }

        // شريط الأزرار العلوي
        document.getElementById('btnRestartFast').addEventListener('click', () => this.startNewGame());

        const btnToggleNumbers = document.getElementById('btnToggleNumbers');
        if (btnToggleNumbers) {
            btnToggleNumbers.addEventListener('click', () => {
                this.config.showNumbers = !this.config.showNumbers;
                btnToggleNumbers.classList.toggle('action-btn--active', this.config.showNumbers);
                if (this.engine) {
                    this.renderBoardState(this.engine.board);
                }
            });
        }

        document.getElementById('btnSoundToggle').addEventListener('click', () => {
            this.sound.enabled = !this.sound.enabled;
            this.syncSoundIcons();
        });

        // إغلاق النوافذ المنبثقة عند النقر على الخلفية أو الضغط على Esc
        [this.rulesModal, this.settingsModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.toggleModal(modal, false);
            });
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.toggleModal(this.rulesModal, false);
                this.toggleModal(this.settingsModal, false);
            }
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
                this.syncOptionHighlights();
            });
        });

        // خيارات سرعة الانشطار
        document.querySelectorAll('.speed-option').forEach(btn => {
            btn.addEventListener('click', () => {
                this.config.waveSpeedMs = parseInt(btn.dataset.speed, 10);
                this.syncOptionHighlights();
            });
        });

        // خيارات عدد القوى النووية
        document.querySelectorAll('.pcount-option').forEach(btn => {
            btn.addEventListener('click', () => {
                this.savePlayerSetupFromDOM();
                this.config.playerCount = parseInt(btn.dataset.count, 10);
                this.syncOptionHighlights();
                this.renderPlayerSetupRows();
                this.renderWelcomePreview();
            });
        });

        // تطبيق الإعدادات وبدء اللقاء
        document.getElementById('btnApplySettings').addEventListener('click', () => {
            this.savePlayerSetupFromDOM();
            this.syncOptionHighlights();
            this.renderWelcomePreview();
            this.toggleModal(this.settingsModal, false);
            if (this.inBattle) {
                this.startNewGame();
            }
        });

        // أزرار شريط الترسانة في وضع البطاقات الذرية
        if (this.arsenalBtns) {
            this.arsenalBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const action = btn.dataset.action || 'atom';
                    if (action === 'controlRod') {
                        if (this.selectedAction === 'controlRod') {
                            this.setArsenalAction(null);
                        } else {
                            this.setArsenalAction('controlRod');
                        }
                    } else if (action === 'energyDrain') {
                        if (this.selectedAction === 'energyDrain') {
                            this.setArsenalAction(null);
                        } else {
                            this.setArsenalAction('energyDrain');
                        }
                    } else {
                        const count = parseInt(btn.dataset.atoms, 10) || 1;
                        if (this.selectedAction === 'atom' && this.selectedArsenalAtom === count) {
                            this.setArsenalAction(null);
                        } else {
                            this.setArsenalAction('atom', count);
                        }
                    }
                });
            });
        }
    }

    /**
     * مزامنة تمييز أزرار الإعدادات
     */
    syncOptionHighlights() {
        const activeClasses = ['option-btn--active-purple', 'option-btn--active-sky', 'option-btn--active-emerald'];

        document.querySelectorAll('.size-option').forEach(btn => {
            btn.classList.remove(...activeClasses);
            if (parseInt(btn.dataset.size, 10) === this.config.gridSize) {
                btn.classList.add('option-btn--active-purple');
            }
        });

        document.querySelectorAll('.speed-option').forEach(btn => {
            btn.classList.remove(...activeClasses);
            if (parseInt(btn.dataset.speed, 10) === this.config.waveSpeedMs) {
                btn.classList.add('option-btn--active-sky');
            }
        });

        document.querySelectorAll('.pcount-option').forEach(btn => {
            btn.classList.remove(...activeClasses);
            if (parseInt(btn.dataset.count, 10) === this.config.playerCount) {
                btn.classList.add('option-btn--active-emerald');
            }
        });
    }

    updateButtonGroupHighlight(selector, activeBtn, colorKey) {
        this.syncOptionHighlights();
    }

    /**
     * تحديث معاينة القوى النووية في الشاشة الترحيبية
     */
    renderWelcomePreview() {
        if (!this.welcomePlayersPreviewEl) return;
        this.welcomePlayersPreviewEl.innerHTML = '';

        const activeSetup = this.config.playersSetup.slice(0, this.config.playerCount);
        activeSetup.forEach(p => {
            const pal = ISOTOPE_PALETTES[p.paletteIndex] || ISOTOPE_PALETTES[0];
            const chip = document.createElement('div');
            chip.className = 'preview-player-chip';
            chip.innerHTML = `
                <span class="preview-player-dot" style="background-color: ${pal.color}; box-shadow: 0 0 6px ${pal.color};"></span>
                <span>${p.name}</span>
                ${p.isAI ? '<i class="fa-solid fa-robot icon-sky" title="منافس آلي"></i>' : '<i class="fa-solid fa-user icon-emerald" title="قائد بشري"></i>'}
            `;
            this.welcomePlayersPreviewEl.appendChild(chip);
        });
    }

    /**
     * تحديث عنوان الوضع وقواعد طريقة اللعب حسب الوضع المختار
     */
    updateModeUI() {
        const mode = (typeof GAME_MODES !== 'undefined' && GAME_MODES[this.config.gameMode]) || null;
        const modeName = mode ? mode.name : (this.config.gameMode === 'normal' ? 'الوضع العادي' : 'البطاقات الذرية');
        const modeDesc = mode && typeof mode.getRuleDescription === 'function' 
            ? mode.getRuleDescription() 
            : (this.config.gameMode === 'normal' 
                ? 'يبدأ كل لاعب دورته الأولى بوضع <strong>ذرة ثلاثية (3 ذرات مشعة)</strong> في أي غرفة فارغة لتأسيس قلعته النووية، ويُحاط المربع تلقائياً <strong>بنطاق حماية كامل 3×3 بدرع طاقة واقٍ</strong> طوال الجولة الأولى. وبعد الجولة الأولى في <strong>الوضع العادي</strong> لا يمكنك وضع أي ذرة خارج غرف ذراتك الخاصة، ويتم التوسع عبر الانشطار المتسلسل فقط.'
                : 'يبدأ كل لاعب دورته الأولى بوضع <strong>ذرة ثلاثية (3 ذرات مشعة)</strong> في أي غرفة فارغة لتأسيس قلعته النووية، ويُحاط المربع تلقائياً <strong>بنطاق حماية كامل 3×3 بدرع طاقة واقٍ</strong> طوال الجولة الأولى يمنع أي خصم من محاصرته أو اختراقه. وعند عودة اللعب على اللاعب ينهار درعه ويمكنه وضع ذراته في غرفه أو في أي غرفة فارغة.');

        if (this.activeModeBadgeEl) {
            this.activeModeBadgeEl.textContent = `(${modeName})`;
        }

        if (this.rulePlacementDescEl) {
            this.rulePlacementDescEl.innerHTML = modeDesc;
        }

        if (this.victoryModeBadgeEl) {
            this.victoryModeBadgeEl.textContent = modeName;
        }
    }

    /**
     * إظهار رسالة تنبيه عائمة للشاشة الترحيبية
     */
    showWelcomeToast(message) {
        if (!this.welcomeToastEl) return;
        this.welcomeToastEl.textContent = message;
        this.welcomeToastEl.classList.remove('hidden');
        if (this.welcomeToastTimeout) clearTimeout(this.welcomeToastTimeout);
        this.welcomeToastTimeout = setTimeout(() => {
            if (this.welcomeToastEl) this.welcomeToastEl.classList.add('hidden');
        }, 2600);
    }

    /**
     * مزامنة أيقونات الصوت في الهيدر الرئيسي وهيدر الشاشة الترحيبية
     */
    syncSoundIcons() {
        const iconClass = this.sound.enabled
            ? 'fa-solid fa-volume-high icon-emerald'
            : 'fa-solid fa-volume-xmark icon-rose';
        const mainSoundIcon = document.getElementById('soundIcon');
        if (mainSoundIcon) mainSoundIcon.className = iconClass;
        if (this.welcomeSoundIconEl) this.welcomeSoundIconEl.className = iconClass;
    }

    /**
     * الانتقال من الشاشة الترحيبية إلى ساحة المعركة بالوضع المختار
     */
    launchMode(mode) {
        this.config.gameMode = mode;
        this.inBattle = true;
        this.updateModeUI();

        if (this.welcomeSim) {
            this.welcomeSim.stop();
        }

        if (this.welcomeScreenEl) this.welcomeScreenEl.classList.add('hidden');
        if (this.battleScreenEl) this.battleScreenEl.classList.remove('hidden');

        this.sound.playPlaceAtom(false);
        this.startNewGame();
    }

    /**
     * العودة إلى الشاشة الترحيبية لاختيار وضع اللعب
     */
    showWelcomeScreen() {
        this.inBattle = false;
        this.isAnimating = false;
        if (this.aiTimer) {
            clearTimeout(this.aiTimer);
            this.aiTimer = null;
        }

        this.toggleModal(this.victoryModal, false);
        this.toggleModal(this.settingsModal, false);
        this.toggleModal(this.rulesModal, false);

        if (this.battleScreenEl) this.battleScreenEl.classList.add('hidden');
        document.body.classList.remove('has-arsenal-dock');
        if (this.welcomeScreenEl) {
            this.welcomeScreenEl.classList.remove('hidden');
            if (this.welcomeSim) {
                this.welcomeSim.start();
            }
        }

        this.syncOptionHighlights();
        this.renderWelcomePreview();
    }

    toggleModal(modalEl, show) {
        if (show) {
            modalEl.classList.remove('hidden');
        } else {
            modalEl.classList.add('hidden');
        }
    }

    /**
     * بدء مباراة جديدة
     */
    startNewGame() {
        this.isAnimating = false;
        if (this.aiTimer) {
            clearTimeout(this.aiTimer);
            this.aiTimer = null;
        }

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

        this.engine = new AtomicWarsEngine(size, size, activePlayers, this.config.gameMode);
        this.selectedAction = null;
        this.selectedArsenalAtom = null;
        this.updateModeUI();

        document.documentElement.style.setProperty('--grid-cols', size);
        document.documentElement.style.setProperty('--fly-duration', `${this.config.waveSpeedMs}ms`);
        this.headerBoardInfoEl.textContent = `مفاعل ${size}×${size} • ${size * size} غرفة انشطار`;

        this.buildGridDOM();
        this.setArsenalAction(null);
        this.renderBoardState(this.engine.board);
        this.renderScoreboard(this.engine.players);
        this.updateTurnIndicator();
        this.setWaveStatus('المفاعل في حالة استقرار', 'emerald');
        this.updateGeigerMeter(0);

        if (this.inBattle) {
            this.checkAndTriggerAITurn();
        }
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

                // مؤشرات السعة الاستيعابية لكل غرفة
                let capSlotsHtml = '';
                for (let i = 0; i < cellData.maxStableCapacity; i++) {
                    capSlotsHtml += '<span class="capacity-slot"></span>';
                }

                cellDiv.innerHTML = `
                    <div class="capacity-indicator" title="أقصى استقرار: ${cellData.maxStableCapacity} ذرات">${capSlotsHtml}</div>
                    <span class="shield-badge hidden" title="درع نووي واقٍ ضد المحاصرة والاختراق (الجولة الأولى)"><i class="fa-solid fa-shield-halved"></i></span>
                    <span class="cell-control-rod-badge hidden" title="درع نووي واقٍ يمتص الانفجارات المعادية"><i class="fa-solid fa-shield-halved"></i></span>
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

        const cell = this.engine.board[r][c];
        const hasNeutrons = this.engine.mode && typeof this.engine.mode.hasNeutronSystem === 'function' && this.engine.mode.hasNeutronSystem();
        const isFirstMove = !currentPlayer.hasPlayed;

        // التحقق من إجراء تثبيت الدرع النووي الواقي (مهدئ المفاعل)
        if (this.selectedAction === 'controlRod') {
            if (isFirstMove) {
                this.setWaveStatus('لا يمكن تثبيت الدرع النووي في الضربة الافتتاحية!', 'amber');
                this.sound.playShieldDeflect();
                return;
            }
            if (cell.owner !== currentPlayer.id) {
                this.setWaveStatus('الدرع النووي يثبت فقط على الغرف التي تمتلكها!', 'amber');
                this.sound.playShieldDeflect();
                return;
            }
            if (cell.hasControlRod) {
                this.setWaveStatus('هذه الغرفة مجهزة بالفعل بدرع نووي واقٍ!', 'sky');
                this.sound.playShieldDeflect();
                return;
            }
            const rodCost = (this.engine.mode && typeof this.engine.mode.getControlRodCost === 'function') ? this.engine.mode.getControlRodCost() : 5;
            if ((currentPlayer.neutrons || 0) < rodCost) {
                this.setWaveStatus(`رصيد النيوترونات غير كافٍ! تحتاج ${rodCost} n⁰ لتثبيت الدرع النووي`, 'amber');
                this.sound.playShieldDeflect();
                return;
            }

            await this.processPlayerMove(r, c, 1, 'controlRod');
            return;
        }

        // التحقق من إجراء هجوم إخماد طاقة ذرة معادية (بطاقة مساعدة)
        if (this.selectedAction === 'energyDrain') {
            if (isFirstMove) {
                this.setWaveStatus('لا يمكن استخدام بطاقات المساعدة في الضربة الافتتاحية!', 'amber');
                this.sound.playShieldDeflect();
                return;
            }
            if (cell.owner === null || cell.owner === currentPlayer.id) {
                this.setWaveStatus('بطاقة إخماد الطاقة تستهدف غرف الخصم فقط!', 'amber');
                this.sound.playShieldDeflect();
                return;
            }
            if (cell.atoms <= 1) {
                this.setWaveStatus('هذه الذرة في مستواها الأول بالفعل (1 ذرة)!', 'sky');
                this.sound.playShieldDeflect();
                return;
            }
            if (this.engine.isInsideOpponentShieldZone(r, c, currentPlayer.id) || cell.hasShield) {
                this.setWaveStatus('مربع محظور: محمي بواسطة درع طاقة الخصم!', 'amber');
                this.sound.playShieldDeflect();
                return;
            }
            const drainCost = (this.engine.mode && typeof this.engine.mode.getEnergyDrainCost === 'function') ? this.engine.mode.getEnergyDrainCost() : 3;
            if ((currentPlayer.neutrons || 0) < drainCost) {
                this.setWaveStatus(`رصيد النيوترونات غير كافٍ! تحتاج ${drainCost} n⁰ لإلقاء بطاقة الإخماد`, 'amber');
                this.sound.playShieldDeflect();
                return;
            }

            await this.processPlayerMove(r, c, 1, 'energyDrain');
            return;
        }

        // 4. بطاقة عناصر محددة (أحادية ⚡3، ثنائية ⚡6، ثلاثية ⚡9)
        if (this.selectedAction === 'atom') {
            if (isFirstMove) {
                // الضربة الافتتاحية
                if (cell.owner !== null) {
                    this.setWaveStatus('الضربة الافتتاحية: اختر أي غرفة فارغة لتأسيس قلعتك!', 'amber');
                    this.sound.playShieldDeflect();
                    return;
                }
                await this.processPlayerMove(r, c, 3, 'atom');
                return;
            }

            // قاعدة: بطاقات العناصر تُلقى في الغرف الفارغة فقط!
            if (cell.owner !== null) {
                if (cell.owner === currentPlayer.id) {
                    this.setWaveStatus('لا يمكن دمج بطاقات العناصر داخل ذرة حليفة! ألغِ تحديد البطاقة أولاً لتغذية غرفتك الحليفة (1 n⁰).', 'amber');
                } else {
                    this.setWaveStatus('لا يمكن إلقاء بطاقات العناصر على غرف الخصم!', 'amber');
                }
                this.sound.playShieldDeflect();
                return;
            }

            const count = this.selectedArsenalAtom || 1;
            const cost = (this.engine.mode && typeof this.engine.mode.getExternalAtomCost === 'function')
                ? this.engine.mode.getExternalAtomCost(count)
                : (count === 1 ? 3 : (count === 2 ? 6 : 9));

            if ((currentPlayer.neutrons || 0) < cost) {
                this.setWaveStatus(`رصيد النيوترونات غير كافٍ! تحتاج ${cost} n⁰ لإلقاء هذه الذرة`, 'amber');
                this.sound.playShieldDeflect();
                return;
            }

            if (!this.engine.isValidMove(r, c, currentPlayer.id, count, 'atom')) {
                if (this.engine.isInsideOpponentShieldZone(r, c, currentPlayer.id)) {
                    this.setWaveStatus('مربع محظور: محمي بواسطة درع طاقة الخصم!', 'amber');
                }
                this.sound.playShieldDeflect();
                return;
            }

            await this.processPlayerMove(r, c, count, 'atom');
            return;
        }

        // 5. لا توجد أي بطاقة محددة (الوضع الطبيعي لتغذية الذرات الحليفة بـ 1 نيوترون)
        if (!this.selectedAction) {
            if (isFirstMove) {
                if (cell.owner !== null) {
                    this.setWaveStatus('الضربة الافتتاحية: اختر أي غرفة فارغة لتأسيس قلعتك!', 'amber');
                    this.sound.playShieldDeflect();
                    return;
                }
                await this.processPlayerMove(r, c, 3, 'atom');
                return;
            }

            if (hasNeutrons) {
                if (cell.owner === null) {
                    this.setWaveStatus('حدد إحدى بطاقات العناصر أولاً لإلقاء ذرة في غرفة فارغة!', 'sky');
                    this.sound.playShieldDeflect();
                    return;
                }
                if (cell.owner !== currentPlayer.id) {
                    this.setWaveStatus('لا يمكنك استهداف غرف الخصم مباشرة بدون بطاقة مساعدة!', 'amber');
                    this.sound.playShieldDeflect();
                    return;
                }
                // الغرفة مملوكة للاعب الحليف: تغذية ذرة حليفة بـ 1 نيوترون
                if ((currentPlayer.neutrons || 0) < 1) {
                    this.setWaveStatus('رصيد النيوترونات غير كافٍ! تحتاج 1 n⁰ لتغذية غرفتك', 'amber');
                    this.sound.playShieldDeflect();
                    return;
                }
                await this.processPlayerMove(r, c, 1, 'feed');
                return;
            } else {
                // الوضع العادي
                if (!this.engine.isValidMove(r, c, currentPlayer.id, 1, 'atom')) {
                    if (this.engine.isInsideOpponentShieldZone(r, c, currentPlayer.id)) {
                        this.setWaveStatus('مربع محظور: محمي بواسطة درع طاقة الخصم!', 'amber');
                    } else if (currentPlayer.hasPlayed && cell.owner !== currentPlayer.id) {
                        this.setWaveStatus('الوضع العادي: لا يمكنك وضع ذرة خارج غرف ذراتك الخاصة!', 'amber');
                    }
                    this.sound.playShieldDeflect();
                    return;
                }
                await this.processPlayerMove(r, c, 1, 'atom');
                return;
            }
        }
    }

    /**
     * معالجة حركة اللاعب وعرض الانشطارات المتسلسلة
     */
    async processPlayerMove(r, c, atomsToPlace = 1, actionType = 'atom') {
        if (!this.engine.isValidMove(r, c, this.engine.currentPlayerIndex, atomsToPlace, actionType)) return;

        this.isAnimating = true;
        const actingPlayer = this.engine.getCurrentPlayer();
        const isFirstMove = !actingPlayer.hasPlayed;
        
        if (actionType === 'controlRod') {
            this.sound.playControlRodDeploy();
            this.setWaveStatus(`تم تثبيت درع نووي واقٍ في الغرفة [${r+1}, ${c+1}] بنجاح!`, 'sky');
        } else if (actionType === 'energyDrain') {
            this.sound.playEnergyDrain();
            this.setWaveStatus(`إطلاق هجوم إخماد الطاقة على الغرفة [${r+1}, ${c+1}]...`, 'amber');
        } else {
            this.sound.playPlaceAtom(isFirstMove);
        }

        const result = this.engine.executeTurn(r, c, atomsToPlace, actionType);
        if (!result.valid) {
            this.isAnimating = false;
            return;
        }

        if (actionType === 'energyDrain') {
            const targetEl = this.cellElements[r][c];
            if (result.absorbedByRod) {
                targetEl.classList.add('control-rod-absorb-flash');
                this.sound.playControlRodAbsorb();
                this.setWaveStatus('درع الخصم امتص هجوم الإخماد واستُهلك بالكامل لحماية الغرفة!', 'sky');
                setTimeout(() => targetEl.classList.remove('control-rod-absorb-flash'), 450);
            } else {
                targetEl.classList.add('cell-energy-drained');
                this.setWaveStatus('تم إخماد طاقة ذرة الخصم بنجاح وإرجاعها للمستوى الأول (1 ذرة)!', 'amber');
                setTimeout(() => targetEl.classList.remove('cell-energy-drained'), 500);
            }
            this.renderBoardState(this.engine.board);
            this.renderScoreboard(this.engine.players);
            await new Promise(res => setTimeout(res, 400));
        } else if (result.waves.length > 0) {
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

        const nextPlayer = this.engine.getCurrentPlayer();
        this.updateTurnIndicator();

        if (nextPlayer.hasPlayed && this.engine.hasActiveShield(nextPlayer.id)) {
            await this.collapsePlayerShield(nextPlayer.id);
        }

        // إزالة تحديد البطاقات بعد كل إلقاء ليعود إلى وضع عدم التحديد الافتراضي
        this.setArsenalAction(null);

        this.updateTurnIndicator();
        this.renderBoardState(this.engine.board);
        this.isAnimating = false;

        this.checkAndTriggerAITurn();
    }

    /**
     * أنيميشن انهيار الدرع بصرياً وتعطيله فعلياً
     */
    async collapsePlayerShield(playerId) {
        const shieldData = this.engine.getPlayerShieldCells(playerId);
        if (!shieldData.centerCell) return;

        this.isAnimating = true;
        const player = this.engine.players[playerId];

        this.setWaveStatus(`انهيار درع الطاقة لـ ${player.name}!`, 'amber');
        this.sound.playShieldCollapse();

        this.engine.clearPlayerShield(playerId);

        const centerEl = this.cellElements[shieldData.centerCell.r][shieldData.centerCell.c];
        centerEl.style.setProperty('--shield-color', player.color);
        centerEl.style.setProperty('--shield-glow', player.glow);
        centerEl.classList.add('shield-collapsing');

        this.spawnShieldCollapseParticles(centerEl, player);

        for (const coord of shieldData.zoneCells) {
            if (coord.r === shieldData.centerCell.r && coord.c === shieldData.centerCell.c) continue;
            const el = this.cellElements[coord.r][coord.c];
            el.style.setProperty('--shield-color', player.color);
            el.style.setProperty('--shield-glow', player.glow);
            el.classList.add('zone-collapsing');
        }

        await new Promise(resolve => setTimeout(resolve, 480));

        centerEl.classList.remove('shield-collapsing', 'cell-shielded', 'cell-shield-zone');
        const centerBadge = centerEl.querySelector('.shield-badge');
        if (centerBadge) centerBadge.classList.add('hidden');

        for (const coord of shieldData.zoneCells) {
            const el = this.cellElements[coord.r][coord.c];
            el.classList.remove('zone-collapsing', 'cell-shield-zone', 'cell-shielded');
            const badge = el.querySelector('.shield-badge');
            if (badge) badge.classList.add('hidden');
        }

        this.renderBoardState(this.engine.board);
        this.setWaveStatus('المفاعل في حالة استقرار', 'emerald');
    }

    /**
     * توليد شظايا طاقة نووية متطايرة بنفس لون ذرة اللاعب
     */
    spawnShieldCollapseParticles(parentCellEl, player) {
        const rect = parentCellEl.getBoundingClientRect();
        const boardRect = this.boardEl.getBoundingClientRect();
        const centerX = (rect.left - boardRect.left) + rect.width / 2;
        const centerY = (rect.top - boardRect.top) + rect.height / 2;

        const particleCount = 14;
        for (let i = 0; i < particleCount; i++) {
            const p = document.createElement('div');
            p.className = 'shield-collapse-particle';
            p.style.setProperty('--shield-color', player.color);
            p.style.setProperty('--shield-glow', player.glow);
            p.style.left = `${centerX}px`;
            p.style.top = `${centerY}px`;

            const angle = (i / particleCount) * Math.PI * 2;
            const dist = rect.width * (0.65 + Math.random() * 0.45);
            const dx = Math.cos(angle) * dist;
            const dy = Math.sin(angle) * dist;

            p.style.setProperty('--dx', `${dx}px`);
            p.style.setProperty('--dy', `${dy}px`);

            this.boardEl.appendChild(p);
            setTimeout(() => p.remove(), 550);
        }
    }

    /**
     * تحريك الجسيمات الذرية المقذوفة نحو الغرف المجاورة بتمهل وتنسيق تكتيكي
     */
    animateExplosionWave(wave, playerObj) {
        return new Promise(resolve => {
            // وتيرة تفاعلية تدريجية حسب عمق موجة الانشطار لإعطاء اللاعب وقتاً لفهم السلسلة
            const baseDuration = this.config.waveSpeedMs;
            const pacedDuration = Math.min(380, Math.max(baseDuration, baseDuration + (wave.waveIndex * 15)));
            const flyingEls = [];

            // 1. وميض ما قبل الانشطار (Pre-detonation white-hot pulse)
            for (const exp of wave.explosions) {
                const cellEl = this.cellElements[exp.row][exp.col];
                cellEl.style.setProperty('--explode-color', playerObj.color);
                cellEl.classList.add('cell-about-to-fission', 'cell-exploding');

                const shockwave = document.createElement('div');
                shockwave.className = 'nuclear-shockwave';
                shockwave.style.setProperty('--explode-color', playerObj.color);
                cellEl.appendChild(shockwave);
                setTimeout(() => shockwave.remove(), 400);

                const cluster = cellEl.querySelector('.atom-cluster');
                if (cluster) cluster.innerHTML = '';
            }

            const boardRect = this.boardEl.getBoundingClientRect();

            // 2. تتبع المقذوفات الناتجة عن الانشطار
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
                void flyer.offsetWidth;

                flyingEls.push({ el: flyer, deltaX, deltaY });

                // التحقق من استجابات الاصطدام الدفاعية التكتيكية:
                if (t.absorbedByControlRod) {
                    // امتصاص الدرع النووي الواقي
                    setTimeout(() => {
                        toCell.classList.add('control-rod-absorb-flash');
                        this.sound.playControlRodAbsorb();
                        this.setWaveStatus('الدرع النووي يمتص الانفجار بنجاح ويخمد المقذوف!', 'sky');
                        setTimeout(() => toCell.classList.remove('control-rod-absorb-flash'), 450);
                    }, pacedDuration * 0.85);
                } else if (t.coreResisted) {
                    // صمود النواة الثلاثية وامتصاص المقذوف والتحول إلى ذرة أحادية (3 ➔ 1)
                    setTimeout(() => {
                        toCell.classList.add('cell-core-resisted');
                        this.sound.playCoreResist();
                        this.setWaveStatus('صمود النواة الثلاثية: تم امتصاص الشحنة والتحول إلى ذرة أحادية (3 ➔ 1)!', 'amber');
                        setTimeout(() => toCell.classList.remove('cell-core-resisted'), 450);
                    }, pacedDuration * 0.85);
                } else {
                    // ارتداد درع البداية الواقي
                    const isDeflected = this.engine.isInsideOpponentShieldZone(t.toRow, t.toCol, playerObj.id) ||
                        (this.engine.board[t.toRow][t.toCol].hasShield && this.engine.board[t.toRow][t.toCol].owner !== null && this.engine.board[t.toRow][t.toCol].owner !== playerObj.id);
                    
                    if (isDeflected) {
                        setTimeout(() => {
                            toCell.classList.add('shield-deflect-flash');
                            this.sound.playShieldDeflect();
                            setTimeout(() => toCell.classList.remove('shield-deflect-flash'), 350);
                        }, pacedDuration * 0.85);
                    }
                }
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
                    this.cellElements[exp.row][exp.col].classList.remove('cell-exploding', 'cell-about-to-fission');
                }
                resolve();
            }, pacedDuration);
        });
    }

    /**
     * تحديث رسم خلايا المفاعل في الـ DOM
     */
    renderBoardState(boardMatrix) {
        if (!boardMatrix || !this.cellElements || !this.cellElements.length || !this.cellElements[0] || !this.cellElements[0].length) {
            return;
        }
        const currentPlayerId = this.engine.currentPlayerIndex;
        const currentPlayer = this.engine.players[currentPlayerId];

        for (let r = 0; r < this.engine.rows; r++) {
            for (let c = 0; c < this.engine.cols; c++) {
                const cell = boardMatrix[r][c];
                const cellEl = this.cellElements[r][c];
                const clusterEl = cellEl.querySelector('.atom-cluster');
                const badgeEl = cellEl.querySelector('.cell-badge');
                const slotEls = cellEl.querySelectorAll('.capacity-slot');
                const shieldBadgeEl = cellEl.querySelector('.shield-badge');
                const rodBadgeEl = cellEl.querySelector('.cell-control-rod-badge');

                const atomsForCheck = (this.selectedAction === 'controlRod' || this.selectedAction === 'energyDrain') ? 1 : (this.selectedArsenalAtom || 1);
                const actionForCheck = this.selectedAction; // null عند عدم تحديد أي بطاقة (لوضع تغذية الذرات الحليفة)
                const canClick = !this.engine.isGameOver && this.engine.isValidMove(r, c, currentPlayerId, atomsForCheck, actionForCheck);
                cellEl.classList.toggle('valid-move', canClick);
                cellEl.classList.toggle('invalid-move', !canClick);

                const isLockedNormalEmpty = this.engine.gameMode === 'normal' && currentPlayer && currentPlayer.hasPlayed && cell.owner === null;
                cellEl.classList.toggle('cell-locked-normal', isLockedNormalEmpty);
                cellEl.classList.toggle('cell-owned-active', !this.engine.isGameOver && cell.owner === currentPlayerId);

                const zoneOwner = this.engine.getCellShieldZoneOwner(r, c, boardMatrix);
                if (zoneOwner !== null && this.engine.players[zoneOwner]) {
                    const zonePlayer = this.engine.players[zoneOwner];
                    cellEl.classList.add('cell-shield-zone');
                    cellEl.style.setProperty('--shield-color', zonePlayer.color);
                    cellEl.style.setProperty('--shield-glow', zonePlayer.glow);
                    cellEl.style.setProperty('--shield-dark', zonePlayer.darkColor);
                } else {
                    cellEl.classList.remove('cell-shield-zone');
                }

                if (cell.hasShield && cell.shieldPlayer !== null && this.engine.players[cell.shieldPlayer]) {
                    const shieldPlayer = this.engine.players[cell.shieldPlayer];
                    cellEl.classList.add('cell-shielded');
                    cellEl.style.setProperty('--shield-color', shieldPlayer.color);
                    cellEl.style.setProperty('--shield-glow', shieldPlayer.glow);
                    cellEl.style.setProperty('--shield-dark', shieldPlayer.darkColor);
                    if (shieldBadgeEl) {
                        shieldBadgeEl.classList.remove('hidden');
                        shieldBadgeEl.style.color = shieldPlayer.color;
                        shieldBadgeEl.style.textShadow = `0 0 8px ${shieldPlayer.color}, 0 0 14px ${shieldPlayer.glow}`;
                    }
                } else {
                    cellEl.classList.remove('cell-shielded');
                    if (shieldBadgeEl) {
                        shieldBadgeEl.classList.add('hidden');
                    }
                }

                // شارة مهدئ المفاعل النووي (قضيب التحكم)
                if (rodBadgeEl) {
                    if (cell.hasControlRod) {
                        rodBadgeEl.classList.remove('hidden');
                    } else {
                        rodBadgeEl.classList.add('hidden');
                    }
                }

                cellEl.classList.remove('critical-ready', 'stable-cluster');
                clusterEl.className = 'atom-cluster';
                clusterEl.innerHTML = '';

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

                    if (cell.atoms >= cell.maxStableCapacity) {
                        cellEl.classList.add('critical-ready');
                    } else if (cell.atoms > 1) {
                        cellEl.classList.add('stable-cluster');
                    }

                    const visualCount = Math.min(cell.atoms, 4);
                    const countClass = cell.atoms <= 3 ? `atom-count-${cell.atoms}` : 'atom-count-many';
                    clusterEl.classList.add(countClass);

                    for (let i = 0; i < visualCount; i++) {
                        const nucleus = document.createElement('div');
                        nucleus.className = 'atomic-nucleus';
                        nucleus.style.setProperty('--atom-color', ownerPlayer.color);
                        nucleus.style.setProperty('--atom-dark', ownerPlayer.darkColor);
                        clusterEl.appendChild(nucleus);
                    }

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

                    if (cell.atoms >= 3) {
                        const orbit3 = document.createElement('div');
                        orbit3.className = 'electron-orbit orbit-3';
                        orbit3.style.setProperty('--atom-color', ownerPlayer.color);
                        clusterEl.appendChild(orbit3);
                    }

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
            const stateClass = !p.alive
                ? 'player-card--eliminated'
                : isTurn
                    ? 'player-card--active'
                    : '';

            card.className = `player-card ${stateClass}`.trim();

            if (isTurn && p.alive) {
                card.style.borderColor = p.color;
                card.style.boxShadow = `0 0 16px ${p.glow}`;
            }

            const statusLabel = !p.alive
                ? '<span class="player-status-tag player-status-tag--eliminated">مُدمّر بالكامل</span>'
                : isTurn
                    ? `<span class="player-status-tag player-status-tag--turn">${!p.hasPlayed ? 'بداية ثلاثية ×3' : 'إطلاق نووي'}</span>`
                    : !p.hasPlayed
                        ? '<span class="player-status-tag player-status-tag--waiting">بانتظار الضربة ×3</span>'
                        : '';

            card.innerHTML = `
                <div class="player-card-info">
                    <span class="player-color-dot" style="background-color: ${p.color}; box-shadow: 0 0 8px ${p.color};"></span>
                    <div class="player-meta-box">
                        <div class="player-name-row">
                            <span>${p.name}</span>
                            ${p.isAI ? '<i class="fa-solid fa-robot icon-sky" title="ذكاء اصطناعي"></i>' : ''}
                        </div>
                        ${statusLabel}
                    </div>
                </div>
                <div class="player-stats-group">
                    <div class="player-stat-box">
                        <div class="player-stat-label">الغرف</div>
                        <div class="player-stat-value">${p.cellCount}</div>
                    </div>
                    <div class="player-stat-box">
                        <div class="player-stat-label">الذرات</div>
                        <div class="player-stat-value" style="color: ${p.color}">${p.atomCount}</div>
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

        if (this.currentPlayerNameEl) {
            this.currentPlayerNameEl.textContent = currentPlayer.name + (currentPlayer.isAI ? ' (آلي)' : '');
            this.currentPlayerNameEl.style.color = currentPlayer.color;
        }
        if (this.turnDotEl) {
            this.turnDotEl.style.backgroundColor = currentPlayer.color;
        }
        if (this.turnPingEl) {
            this.turnPingEl.style.backgroundColor = currentPlayer.color;
        }

        // تحديث شريط الترسانة ورصيد النيوترونات التكتيكي
        this.updateNeutronArsenalUI();
    }

    setArsenalAction(actionType, count = null) {
        this.selectedAction = actionType;
        if (actionType === 'atom') {
            this.selectedArsenalAtom = count || 1;
        } else {
            this.selectedArsenalAtom = null;
        }
        if (this.arsenalBtns) {
            this.arsenalBtns.forEach(btn => {
                const bAction = btn.dataset.action || 'atom';
                if (!actionType) {
                    btn.classList.remove('active');
                } else if (bAction === 'controlRod') {
                    btn.classList.toggle('active', actionType === 'controlRod');
                } else if (bAction === 'energyDrain') {
                    btn.classList.toggle('active', actionType === 'energyDrain');
                } else {
                    const btnAtoms = parseInt(btn.dataset.atoms, 10);
                    btn.classList.toggle('active', actionType === 'atom' && btnAtoms === this.selectedArsenalAtom);
                }
            });
        }
        if (this.engine) {
            this.renderBoardState(this.engine.board);
        }
    }

    setArsenalSelectedAtom(count) {
        this.setArsenalAction('atom', count);
    }

    updateNeutronArsenalUI() {
        if (!this.neutronArsenalBarEl) return;
        const hasNeutrons = this.engine && this.engine.mode && typeof this.engine.mode.hasNeutronSystem === 'function' && this.engine.mode.hasNeutronSystem();
        
        if (!hasNeutrons) {
            this.neutronArsenalBarEl.classList.add('hidden');
            document.body.classList.remove('has-arsenal-dock');
            return;
        }

        this.neutronArsenalBarEl.classList.remove('hidden');
        document.body.classList.add('has-arsenal-dock');
        const currentPlayer = this.engine.getCurrentPlayer();
        const isFirstMove = !currentPlayer.hasPlayed;
        const neutrons = currentPlayer.neutrons || 0;

        // تحديث النص العددي
        if (this.neutronValueDisplayEl) {
            if (isFirstMove) {
                this.neutronValueDisplayEl.textContent = '0 / 10 (افتتاحية)';
            } else {
                this.neutronValueDisplayEl.textContent = `${neutrons} / 10`;
            }
        }

        // تحديث شرائح المقياس الـ 10
        if (this.neutronMeterTrackEl) {
            this.neutronMeterTrackEl.innerHTML = '';
            for (let i = 0; i < 10; i++) {
                const pip = document.createElement('div');
                pip.className = 'neutron-pip';
                if (!isFirstMove && i < neutrons) {
                    pip.classList.add('filled');
                    pip.style.background = `linear-gradient(180deg, ${currentPlayer.color}, ${currentPlayer.darkColor || '#0284c7'})`;
                    pip.style.boxShadow = `0 0 6px ${currentPlayer.color}`;
                    pip.style.borderColor = currentPlayer.color;
                }
                this.neutronMeterTrackEl.appendChild(pip);
            }
        }

        // تحديث أزرار الترسانة
        if (this.arsenalBtns) {
            this.arsenalBtns.forEach(btn => {
                const cost = parseInt(btn.dataset.cost, 10);
                if (isFirstMove) {
                    btn.disabled = true;
                } else {
                    btn.disabled = (neutrons < cost);
                }
            });

            // إذا كان الزر المختار غير متاح بسبب نقص النيوترونات، إلغاء التحديد والعودة للوضع الافتراضي
            const rodCost = (this.engine.mode && typeof this.engine.mode.getControlRodCost === 'function') ? this.engine.mode.getControlRodCost() : 5;
            const drainCost = (this.engine.mode && typeof this.engine.mode.getEnergyDrainCost === 'function') ? this.engine.mode.getEnergyDrainCost() : 3;
            if (!isFirstMove && this.selectedAction) {
                if (this.selectedAction === 'controlRod' && neutrons < rodCost) {
                    this.setArsenalAction(null);
                } else if (this.selectedAction === 'energyDrain' && neutrons < drainCost) {
                    this.setArsenalAction(null);
                } else if (this.selectedAction === 'atom') {
                    const currentCost = this.selectedArsenalAtom === 1 ? 3 : (this.selectedArsenalAtom === 2 ? 6 : 9);
                    if (neutrons < currentCost) {
                        this.setArsenalAction(null);
                    }
                }
            }
        }

        // تحديث نص الإرشاد التكتيكي
        if (this.arsenalHintTextEl) {
            if (isFirstMove) {
                this.arsenalHintTextEl.innerHTML = '🛡️ <strong>الضربة الافتتاحية:</strong> اختر أي غرفة فارغة لتأسيس قلعتك النووية (ذرة ثلاثية مجانية مع درع 3×3)';
                this.arsenalHintTextEl.style.color = '#fcd34d';
            } else if (!this.selectedAction) {
                this.arsenalHintTextEl.innerHTML = '💡 <strong>الوضع الافتراضي:</strong> انقر على أي ذرة حليفة لتغذيتها (+1 n⁰) • أو حدد بطاقة لإلقائها في المفاعل';
                this.arsenalHintTextEl.style.color = '#94a3b8';
            } else if (this.selectedAction === 'atom') {
                const count = this.selectedArsenalAtom || 1;
                const cost = count === 1 ? 3 : (count === 2 ? 6 : 9);
                this.arsenalHintTextEl.innerHTML = `⚡ <strong>بطاقة ذرة ${count === 1 ? 'أحادية' : (count === 2 ? 'ثنائية' : 'ثلاثية')}:</strong> انقر على أي غرفة فارغة لإلقائها (${cost} n⁰) • انقر البطاقة مجدداً لإلغاء التحديد`;
                this.arsenalHintTextEl.style.color = '#38bdf8';
            } else if (this.selectedAction === 'controlRod') {
                this.arsenalHintTextEl.innerHTML = '🛡️ <strong>بطاقة درع نووي:</strong> انقر على إحدى غرفك لتثبيت درع واقٍ (5 n⁰) • انقر البطاقة مجدداً لإلغاء التحديد';
                this.arsenalHintTextEl.style.color = '#34d399';
            } else if (this.selectedAction === 'energyDrain') {
                this.arsenalHintTextEl.innerHTML = '⚡ <strong>بطاقة إخماد طاقة:</strong> انقر على ذرة معادية لإرجاعها لمستوى 1 (3 n⁰) • انقر البطاقة مجدداً لإلغاء التحديد';
                this.arsenalHintTextEl.style.color = '#f59e0b';
            }
        }
    }

    setWaveStatus(text, colorKey) {
        this.chainWaveStatusEl.textContent = text;
        if (colorKey === 'amber') {
            this.chainWaveStatusEl.className = 'reactor-status-badge reactor-status-badge--active';
        } else {
            this.chainWaveStatusEl.className = 'reactor-status-badge reactor-status-badge--stable';
        }
    }

    updateGeigerMeter(percent) {
        if (this.geigerFillEl) {
            this.geigerFillEl.style.width = `${Math.max(8, percent)}%`;
        }
        if (this.geigerValEl) {
            const val = (0.14 + (percent * 0.45)).toFixed(2);
            this.geigerValEl.textContent = `${val} μSv/h`;
        }
    }

    checkAndTriggerAITurn() {
        if (!this.inBattle || !this.engine || this.engine.isGameOver) return;
        const currentPlayer = this.engine.getCurrentPlayer();
        if (currentPlayer.isAI) {
            this.isAnimating = true;
            this.aiTimer = setTimeout(async () => {
                if (!this.inBattle || !this.engine || this.engine.isGameOver) {
                    this.isAnimating = false;
                    return;
                }
                const aiMove = this.engine.computeBestAIMove();
                if (aiMove) {
                    await this.processPlayerMove(aiMove.r, aiMove.c, aiMove.atomCount || 1, aiMove.actionType || 'atom');
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
            row.className = 'player-setup-row';

            const colorSwatches = ISOTOPE_PALETTES.map((pal, idx) => `
                <button type="button" data-player="${i}" data-palette="${idx}"
                    class="palette-swatch ${pSetup.paletteIndex === idx ? 'palette-swatch--selected' : ''}"
                    style="background-color: ${pal.color};" title="${pal.name}">
                </button>
            `).join('');

            row.innerHTML = `
                <input type="text" data-player-name="${i}" value="${pSetup.name}" maxlength="18"
                    class="player-name-input" />
                <div class="player-swatches-group">
                    ${colorSwatches}
                </div>
                <label class="player-ai-toggle">
                    <input type="checkbox" data-player-ai="${i}" ${pSetup.isAI ? 'checked' : ''} class="player-ai-checkbox" />
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

if (typeof window !== 'undefined') {
    window.AtomicWarsUIController = AtomicWarsUIController;
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                window.atomicWarsApp = new AtomicWarsUIController();
            });
        } else {
            window.atomicWarsApp = new AtomicWarsUIController();
        }
    }
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AtomicWarsUIController };
}
