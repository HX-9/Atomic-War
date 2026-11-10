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

        // إعدادات شبكة اللعب الجماعي أونلاين (P2P PeerJS)
        this.network = (typeof AtomicPeerNetwork !== 'undefined') ? new AtomicPeerNetwork() : null;
        this.isOnlineMatch = false;
        this.localPlayerId = 0;
        this.onlineSelectedMode = 'normal';
        this.onlineSelectedGridSize = 7;
        this.onlineSelectedPlayerCount = 4;

        // مدراء الميزات التكتيكية (ملف القائد والأنواط، الاهتزاز اللمسي، الثيمات المتقدمة)
        this.haptic = (typeof HapticFeedbackManager !== 'undefined') ? new HapticFeedbackManager() : null;
        this.themeMgr = (typeof ThemeManager !== 'undefined') ? new ThemeManager() : null;
        this.dossier = (typeof CommanderDossier !== 'undefined') ? new CommanderDossier() : null;
        this.blitzInterval = null;
        this.blitzSecondsLeft = 6;
        this.hazardCell = null;

        this.cacheDOM();
        this.setupNetworkCallbacks();
        this.bindEvents();
        this.renderWelcomePreview();
        this.updateModeUI();
        this.checkUrlRoomParam();

        // تشغيل محاكاة المعركة الخلفية تلقائياً للشاشة الترحيبية
        if (this.welcomeScreenEl && !this.welcomeScreenEl.classList.contains('hidden')) {
            this.welcomeSim.start();
        }
    }

    cacheDOM() {
        // شاشات العرض الرئيسية الثلاث
        this.welcomeScreenEl = document.getElementById('welcomeScreen');
        this.setupScreenEl = document.getElementById('setupScreen');
        this.battleScreenEl = document.getElementById('battleScreen');
        this.welcomePlayersPreviewEl = document.getElementById('welcomePlayersPreview');
        this.welcomeToastEl = document.getElementById('welcomeToast');
        this.welcomeSoundIconEl = document.getElementById('welcomeSoundIcon');

        // عناصر صفحة تجهيز وإعداد المعركة (#setupScreen)
        this.btnBackFromSetupToWelcome = document.getElementById('btnBackFromSetupToWelcome');
        this.setupMainModeAdvanced = document.getElementById('setupMainModeAdvanced');
        this.setupMainModeNormal = document.getElementById('setupMainModeNormal');
        this.setupCardsSubmodesSection = document.getElementById('setupCardsSubmodesSection');
        this.setupNormalInfoSection = document.getElementById('setupNormalInfoSection');
        this.setupSubmodeCards = document.querySelectorAll('.setup-submode-card');
        this.setupSummaryModeBadge = document.getElementById('setupSummaryModeBadge');
        this.setupSummaryMetaText = document.getElementById('setupSummaryMetaText');
        this.btnLaunchBattleFromSetup = document.getElementById('btnLaunchBattleFromSetup');
        this.btnBackToSetup = document.getElementById('btnBackToSetup');

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
        this.criticalGuideGridEl = document.getElementById('criticalGuideGrid');

        // النوافذ المنبثقة
        this.victoryModal = document.getElementById('victoryModal');
        this.settingsModal = document.getElementById('settingsModal');
        this.rulesModal = document.getElementById('rulesModal');

        // عناصر نافذة التخصيص
        this.settingsModalTitle = document.getElementById('settingsModalTitle');
        this.settingsGroupGridSize = document.getElementById('settingsGroupGridSize');
        this.settingsGroupSpeed = document.getElementById('settingsGroupSpeed');
        this.settingsGroupPlayerCount = document.getElementById('settingsGroupPlayerCount');
        this.settingsGroupPlayerSetup = document.getElementById('settingsGroupPlayerSetup');
        this.btnApplySettings = document.getElementById('btnApplySettings');
        this.btnRestartFast = document.getElementById('btnRestartFast');
        this.btnPlayAgainModal = document.getElementById('btnPlayAgainModal');
        this.btnOpenSettingsFromWin = document.getElementById('btnOpenSettingsFromWin');

        // عناصر نافذة الردهة الأونلاين (P2P Lobby)
        this.onlineLobbyModal = document.getElementById('onlineLobbyModal');
        this.btnOpenOnlineModal = document.getElementById('btnOpenOnlineModal');
        this.btnCloseOnlineLobby = document.getElementById('btnCloseOnlineLobby');
        this.onlineStatusBanner = document.getElementById('onlineStatusBanner');
        this.onlineStatusText = document.getElementById('onlineStatusText');
        this.onlinePlayerNameInput = document.getElementById('onlinePlayerNameInput');
        this.tabBtnCreateRoom = document.getElementById('tabBtnCreateRoom');
        this.tabBtnJoinRoom = document.getElementById('tabBtnJoinRoom');
        this.tabContentCreateRoom = document.getElementById('tabContentCreateRoom');
        this.tabContentJoinRoom = document.getElementById('tabContentJoinRoom');
        this.hostSetupSection = document.getElementById('hostSetupSection');
        this.hostWaitingSection = document.getElementById('hostWaitingSection');
        this.onlineModeCardNormal = document.getElementById('onlineModeCardNormal');
        this.onlineModeCardAdvanced = document.getElementById('onlineModeCardAdvanced');
        this.onlineGridSizeButtons = document.querySelectorAll('.online-size-option');
        this.onlinePlayerCountButtons = document.querySelectorAll('.online-pcount-option');
        this.btnHostCreateRoom = document.getElementById('btnHostCreateRoom');
        this.displayRoomCode = document.getElementById('displayRoomCode');
        this.btnCopyRoomCode = document.getElementById('btnCopyRoomCode');
        this.btnCopyRoomLink = document.getElementById('btnCopyRoomLink');
        this.hostPlayersSlotsList = document.getElementById('hostPlayersSlotsList');
        this.btnHostStartBattle = document.getElementById('btnHostStartBattle');
        this.btnHostLeaveRoom = document.getElementById('btnHostLeaveRoom');
        this.btnFillBots = document.getElementById('btnFillBots');
        this.clientJoinInputSection = document.getElementById('clientJoinInputSection');
        this.clientWaitingSection = document.getElementById('clientWaitingSection');
        this.btnClientLeaveRoom = document.getElementById('btnClientLeaveRoom');
        this.joinRoomCodeInput = document.getElementById('joinRoomCodeInput');
        this.btnClientConnect = document.getElementById('btnClientConnect');
        this.joinAsSpectatorCheck = document.getElementById('joinAsSpectatorCheck');
        this.displayClientRoomCode = document.getElementById('displayClientRoomCode');
        this.clientLobbyModeInfo = document.getElementById('clientLobbyModeInfo');
        this.clientPlayersSlotsList = document.getElementById('clientPlayersSlotsList');

        // عناصر المساعد التكتيكي ونمط المتفرج والتعبيرات
        this.btnTacticalAdvisor = document.getElementById('btnTacticalAdvisor');
        this.spectatorBanner = document.getElementById('spectatorBanner');
        this.quickEmotesBar = document.getElementById('quickEmotesBar');
        this.isSpectator = false;
        this.currentPings = {};
        this.tacticalHintTimer = null;

        // عناصر ملف القائد والأنواط
        this.btnWelcomeDossier = document.getElementById('btnWelcomeDossier');
        this.btnBattleDossier = document.getElementById('btnBattleDossier');
        this.dossierModal = document.getElementById('dossierModal');
        this.btnCloseDossier = document.getElementById('btnCloseDossier');

        // عناصر الثيمات الجرافيكية المتقدمة
        this.btnWelcomeTheme = document.getElementById('btnWelcomeTheme');
        this.btnBattleTheme = document.getElementById('btnBattleTheme');
        this.themeOptionButtons = document.querySelectorAll('.theme-option');

        // عناصر الاهتزاز اللمسي
        this.btnWelcomeHaptic = document.getElementById('btnWelcomeHaptic');
        this.btnBattleHaptic = document.getElementById('btnBattleHaptic');
        this.welcomeHapticIcon = document.getElementById('welcomeHapticIcon');
        this.battleHapticIcon = document.getElementById('battleHapticIcon');
        this.checkHapticSetting = document.getElementById('checkHapticSetting');
        this.hapticSettingLabel = document.getElementById('hapticSettingLabel');

        // عناصر مؤقت الصاعقة الذرية (Blitz)
        this.blitzTimerBadge = document.getElementById('blitzTimerBadge');
        this.blitzSecondsVal = document.getElementById('blitzSecondsVal');

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
        // زر الوضع العادي: يبدأ المعركة مباشرة بدون شاشة إعداد
        const btnStartNormal = document.getElementById('btnStartNormalMode');
        if (btnStartNormal) {
            btnStartNormal.addEventListener('click', () => this.launchMode('normal'));
        }

        // زر وضع البطاقات الذرية: يفتح شاشة الإعداد الحصرية لوضع البطاقات (#setupScreen)
        const btnStartAdvanced = document.getElementById('btnStartAdvancedMode');
        if (btnStartAdvanced) {
            btnStartAdvanced.addEventListener('click', () => this.openSetupScreen());
        }

        // أزرار صفحة تجهيز وإعداد المعركة الخاصة بوضع البطاقات (#setupScreen)
        if (this.btnBackFromSetupToWelcome) {
            this.btnBackFromSetupToWelcome.addEventListener('click', () => {
                this.savePlayerSetupFromDOM();
                this.showWelcomeScreen();
            });
        }

        if (this.setupSubmodeCards) {
            this.setupSubmodeCards.forEach(card => {
                card.addEventListener('click', () => {
                    const subId = card.dataset.submode;
                    this.selectCardsSubMode(subId);
                });
            });
        }

        if (this.btnLaunchBattleFromSetup) {
            this.btnLaunchBattleFromSetup.addEventListener('click', () => {
                this.savePlayerSetupFromDOM();
                this.config.gameMode = 'advanced';
                this.launchBattleFromSetup();
            });
        }

        if (this.btnBackToSetup) {
            this.btnBackToSetup.addEventListener('click', () => {
                if (this.isOnlineMatch || this.config.gameMode !== 'advanced') {
                    this.populateSettingsModal();
                    this.toggleModal(this.settingsModal, true);
                    return;
                }
                this.openSetupScreen();
            });
        }

        // زر فتح نافذة الردهة الأونلاين
        if (this.btnOpenOnlineModal) {
            this.btnOpenOnlineModal.addEventListener('click', () => this.openOnlineLobby());
        }

        // أزرار الردهة الأونلاين
        if (this.btnCloseOnlineLobby) {
            this.btnCloseOnlineLobby.addEventListener('click', () => this.closeOnlineLobby());
        }

        if (this.tabBtnCreateRoom) {
            this.tabBtnCreateRoom.addEventListener('click', () => this.switchOnlineTab('create'));
        }
        if (this.tabBtnJoinRoom) {
            this.tabBtnJoinRoom.addEventListener('click', () => this.switchOnlineTab('join'));
        }

        if (this.onlineModeCardNormal) {
            this.onlineModeCardNormal.addEventListener('click', () => this.selectOnlineMode('normal'));
        }
        if (this.onlineModeCardAdvanced) {
            this.onlineModeCardAdvanced.addEventListener('click', () => this.selectOnlineMode('advanced'));
        }

        if (this.onlineGridSizeButtons) {
            this.onlineGridSizeButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const sz = parseInt(btn.dataset.size, 10);
                    this.selectOnlineGridSize(sz);
                });
            });
        }

        if (this.onlinePlayerNameInput) {
            this.onlinePlayerNameInput.value = this.getPersistentPlayerName();
            this.onlinePlayerNameInput.addEventListener('input', (e) => {
                const val = e.target.value.trim();
                if (val) {
                    this.setPersistentPlayerName(val);
                    if (this.network) {
                        this.network.updatePlayerName(val);
                    }
                }
            });
        }

        if (this.joinRoomCodeInput) {
            this.joinRoomCodeInput.addEventListener('input', (e) => {
                // قصر كود الغرفة على الأحرف فقط وتحويلها لأحرف كبيرة
                e.target.value = e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase();
            });
        }

        if (this.btnFillBots) {
            this.btnFillBots.addEventListener('click', () => {
                if (this.network) {
                    this.network.fillRemainingWithBots();
                }
            });
        }

        if (this.btnHostCreateRoom) {
            this.btnHostCreateRoom.addEventListener('click', () => {
                const name = this.getPersistentPlayerName();
                if (this.network) {
                    this.network.createRoom(name, this.onlineSelectedMode, 4, this.onlineSelectedGridSize);
                }
            });
        }

        if (this.btnHostLeaveRoom) {
            this.btnHostLeaveRoom.addEventListener('click', () => {
                if (this.network) {
                    this.network.leaveRoom();
                }
                this.setOnlineStatus('تم إلغاء الغرفة والرجوع.', 'info');
            });
        }

        if (this.btnClientLeaveRoom) {
            this.btnClientLeaveRoom.addEventListener('click', () => {
                if (this.network) {
                    this.network.leaveRoom();
                }
                this.setOnlineStatus('تمت مغادرة الغرفة والرجوع.', 'info');
            });
        }

        if (this.btnHostStartBattle) {
            this.btnHostStartBattle.addEventListener('click', () => {
                if (this.network) {
                    this.network.startGame();
                }
            });
        }

        if (this.btnCopyRoomCode) {
            this.btnCopyRoomCode.addEventListener('click', () => {
                if (this.network && this.network.roomCode) {
                    navigator.clipboard.writeText(this.network.roomCode).then(() => {
                        this.setOnlineStatus('تم نسخ رمز المفاعل للحافظة بنجاح!', 'success');
                    }).catch(() => {
                        this.setOnlineStatus(`الرمز: ${this.network.roomCode}`, 'info');
                    });
                }
            });
        }

        if (this.btnCopyRoomLink) {
            this.btnCopyRoomLink.addEventListener('click', () => {
                if (this.network && this.network.roomCode) {
                    const url = new URL(window.location.href);
                    url.searchParams.set('room', this.network.roomCode);
                    navigator.clipboard.writeText(url.toString()).then(() => {
                        this.setOnlineStatus('تم نسخ رابط الدعوة المباشر للمفاعل!', 'success');
                    }).catch(() => {
                        this.setOnlineStatus(url.toString(), 'info');
                    });
                }
            });
        }

        if (this.btnClientConnect) {
            this.btnClientConnect.addEventListener('click', () => {
                const rawCode = this.joinRoomCodeInput ? this.joinRoomCodeInput.value.trim().toUpperCase() : '';
                const code = rawCode.replace(/[^A-Z]/g, '');
                if (!code) {
                    this.setOnlineStatus('يرجى كتابة رمز الغرفة (أحرف فقط)!', 'error');
                    return;
                }
                const name = this.getPersistentPlayerName();
                const asSpectator = this.joinAsSpectatorCheck ? this.joinAsSpectatorCheck.checked : false;
                if (this.network) {
                    this.network.joinRoom(code, name, asSpectator);
                }
            });
        }

        // زر التوجيه التكتيكي الذكي
        if (this.btnTacticalAdvisor) {
            this.btnTacticalAdvisor.addEventListener('click', () => this.showTacticalHint());
        }

        // شريط التعبيرات التكتيكية السريعة
        if (this.quickEmotesBar) {
            this.quickEmotesBar.querySelectorAll('.emote-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const emote = btn.dataset.emote;
                    this.triggerEmote(emote);
                });
            });
        }

        // أزرار ملف القائد والأنواط
        const openDossier = () => {
            this.renderDossierModal();
            this.toggleModal(this.dossierModal, true);
        };
        if (this.btnWelcomeDossier) this.btnWelcomeDossier.addEventListener('click', openDossier);
        if (this.btnBattleDossier) this.btnBattleDossier.addEventListener('click', openDossier);
        if (this.btnCloseDossier) this.btnCloseDossier.addEventListener('click', () => this.toggleModal(this.dossierModal, false));

        // أزرار الاهتزاز اللمسي (تفعيل/إلغاء التفعيل)
        const toggleHapticHandler = () => {
            const newState = this.toggleHaptic();
            this.showWelcomeToast(newState ? 'تم تفعيل الاهتزاز اللمسي 📳' : 'تم إلغاء الاهتزاز اللمسي 📴');
        };
        if (this.btnWelcomeHaptic) this.btnWelcomeHaptic.addEventListener('click', toggleHapticHandler);
        if (this.btnBattleHaptic) this.btnBattleHaptic.addEventListener('click', toggleHapticHandler);
        if (this.checkHapticSetting) {
            this.checkHapticSetting.addEventListener('change', () => {
                this.toggleHaptic(this.checkHapticSetting.checked);
            });
        }

        // أزرار تبديل الثيمات المتقدمة المطبقة على الثيم الحالي
        const cycleThemeHandler = () => {
            if (this.themeMgr) {
                const nextT = this.themeMgr.cycleTheme();
                this.syncThemeOptions();
                this.showWelcomeToast(`المظهر: ${nextT.name}`);
                if (this.haptic) this.haptic.onAtomPlaced();
            }
        };
        if (this.btnWelcomeTheme) this.btnWelcomeTheme.addEventListener('click', cycleThemeHandler);
        if (this.btnBattleTheme) this.btnBattleTheme.addEventListener('click', cycleThemeHandler);
        if (this.themeOptionButtons) {
            this.themeOptionButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const tid = btn.dataset.theme;
                    if (this.themeMgr) {
                        this.themeMgr.setTheme(tid);
                        this.syncThemeOptions();
                        const tObj = this.themeMgr.getCurrentThemeObj();
                        this.showWelcomeToast(`المظهر: ${tObj.name}`);
                    }
                });
            });
        }

        // أزرار الأطوار التكتيكية لطور البطاقات
        if (this.cardsSubmodePills) {
            this.cardsSubmodePills.forEach(pill => {
                pill.addEventListener('click', () => {
                    const subId = pill.dataset.submode;
                    this.selectCardsSubMode(subId);
                });
            });
        }

        this.syncHapticUI();
        this.syncThemeOptions();
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
            btnBackToWelcome.addEventListener('click', () => {
                if (this.isOnlineMatch && this.network) {
                    this.network.leaveRoom();
                }
                this.showWelcomeScreen();
            });
        }

        const btnBackFromWin = document.getElementById('btnBackToWelcomeFromWin');
        if (btnBackFromWin) {
            btnBackFromWin.addEventListener('click', () => {
                if (this.isOnlineMatch && this.network) {
                    this.network.leaveRoom();
                }
                this.showWelcomeScreen();
            });
        }

        // شريط الأزرار العلوي
        document.getElementById('btnRestartFast').addEventListener('click', () => {
            if (this.isOnlineMatch) {
                this.setWaveStatus('لا يمكن إعادة تشغيل المفاعل منفرداً أثناء الاتصال الجماعي!', 'amber');
                this.sound.playShieldDeflect();
                return;
            }
            this.startNewGame();
        });

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

        // نافذة الضبط السريع
        const btnSettingsModalEl = document.getElementById('btnSettingsModal');
        if (btnSettingsModalEl) {
            btnSettingsModalEl.addEventListener('click', () => {
                this.populateSettingsModal();
                this.toggleModal(this.settingsModal, true);
            });
        }
        document.getElementById('btnCloseSettings').addEventListener('click', () => this.toggleModal(this.settingsModal, false));

        // أزرار نافذة النصر
        document.getElementById('btnPlayAgainModal').addEventListener('click', () => {
            this.toggleModal(this.victoryModal, false);
            if (this.isOnlineMatch) {
                if (this.network && this.network.isHost) {
                    this.network.startGame();
                }
            } else {
                this.startNewGame();
            }
        });
        document.getElementById('btnOpenSettingsFromWin').addEventListener('click', () => {
            this.toggleModal(this.victoryModal, false);
            if (this.config.gameMode === 'advanced' && !this.isOnlineMatch) {
                this.openSetupScreen();
            } else {
                this.populateSettingsModal();
                this.toggleModal(this.settingsModal, true);
            }
        });

        // خيارات حجم المفاعل
        document.querySelectorAll('.size-option').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.inBattle) return; // حجم المفاعل مقفل أثناء المعركة
                this.config.gridSize = parseInt(btn.dataset.size, 10);
                this.syncOptionHighlights();
                this.updateSetupSummaryUI();
            });
        });

        // خيارات سرعة الانشطار
        document.querySelectorAll('.speed-option').forEach(btn => {
            btn.addEventListener('click', () => {
                this.config.waveSpeedMs = parseInt(btn.dataset.speed, 10);
                document.documentElement.style.setProperty('--fly-duration', `${this.config.waveSpeedMs}ms`);
                this.syncOptionHighlights();
                this.updateSetupSummaryUI();
            });
        });

        // خيارات عدد القوى النووية
        document.querySelectorAll('.pcount-option').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.inBattle) return; // عدد القوى مقفل أثناء المعركة
                this.savePlayerSetupFromDOM();
                this.config.playerCount = parseInt(btn.dataset.count, 10);
                this.syncOptionHighlights();
                this.renderPlayerSetupRows();
                this.renderWelcomePreview();
                this.updateSetupSummaryUI();
            });
        });

        // حفظ الضبط السريع للسرعة
        document.getElementById('btnApplySettings').addEventListener('click', () => {
            document.documentElement.style.setProperty('--fly-duration', `${this.config.waveSpeedMs}ms`);
            this.toggleModal(this.settingsModal, false);
            if (this.inBattle) {
                this.setWaveStatus(`تم ضبط سرعة موجات الانشطار إلى ${this.config.waveSpeedMs}ms`, 'sky');
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
     * تحديث شارة الوضع المقفلة وقواعد طريقة اللعب حسب الوضع والطور المختار
     */
    updateModeUI() {
        const mode = (typeof GAME_MODES !== 'undefined' && GAME_MODES[this.config.gameMode]) || null;
        let modeBadgeText = this.config.gameMode === 'normal' ? 'الوضع العادي الكلاسيكي' : 'البطاقات الذرية';
        if (this.config.gameMode === 'advanced' && typeof cardsModeInstance !== 'undefined' && cardsModeInstance) {
            const subInfo = cardsModeInstance.getSubModeInfo();
            modeBadgeText = `البطاقات • ${subInfo.shortName || subInfo.name}`;
        }

        const modeDesc = mode && typeof mode.getRuleDescription === 'function' 
            ? mode.getRuleDescription() 
            : 'يبدأ كل لاعب دورته الأولى بوضع <strong>ذرة ثلاثية (3 ذرات مشعة)</strong> في أي غرفة فارغة لتأسيس قلعته النووية، ويُحاط المربع تلقائياً <strong>بنطاق حماية كامل 3×3 بدرع طاقة واقٍ</strong> طوال الجولة الأولى.';

        if (this.activeModeBadgeEl) {
            this.activeModeBadgeEl.innerHTML = `<i class="fa-solid fa-lock"></i> ${modeBadgeText}`;
        }

        if (this.rulePlacementDescEl) {
            this.rulePlacementDescEl.innerHTML = modeDesc;
        }

        if (this.victoryModeBadgeEl) {
            this.victoryModeBadgeEl.textContent = modeBadgeText;
        }

        // إظهار زر غرفة التجهيز في وضع البطاقات الذرية فقط، وإخفاؤه في الوضع العادي
        const isCardsLocal = (this.config.gameMode === 'advanced' && !this.isOnlineMatch);
        if (this.btnBackToSetup) {
            this.btnBackToSetup.classList.toggle('hidden', !isCardsLocal);
        }
        if (this.btnOpenSettingsFromWin) {
            this.btnOpenSettingsFromWin.classList.toggle('hidden', !isCardsLocal);
        }
        const btnSettingsModalEl = document.getElementById('btnSettingsModal');
        if (btnSettingsModalEl) {
            btnSettingsModalEl.classList.toggle('hidden', isCardsLocal);
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
     * فتح صفحة تجهيز وإعداد المعركة الحصرية لوضع البطاقات الذرية (#setupScreen)
     */
    openSetupScreen() {
        this.inBattle = false;
        this.isAnimating = false;
        if (this.aiTimer) {
            clearTimeout(this.aiTimer);
            this.aiTimer = null;
        }
        this.stopBlitzTimer();
        this.hazardCell = null;

        this.config.gameMode = 'advanced';

        if (this.welcomeSim) {
            this.welcomeSim.stop();
        }

        if (this.welcomeScreenEl) this.welcomeScreenEl.classList.add('hidden');
        if (this.battleScreenEl) this.battleScreenEl.classList.add('hidden');
        document.body.classList.remove('has-arsenal-dock');

        if (this.setupScreenEl) {
            this.setupScreenEl.classList.remove('hidden');
        }

        this.populateSetupScreen();
        this.sound.playPlaceAtom(false);
    }

    /**
     * تحديث عناصر صفحة التجهيز الخاصة بوضع البطاقات الذرية
     */
    populateSetupScreen() {
        this.config.gameMode = 'advanced';
        this.syncOptionHighlights();
        this.syncThemeOptions();
        this.syncCardsSubModeUI();
        this.renderPlayerSetupRows();
        this.updateSetupSummaryUI();
    }

    /**
     * تحديث ملخص الإعدادات في الشريط السفلي لصفحة تجهيز وضع البطاقات
     */
    updateSetupSummaryUI() {
        if (this.setupSummaryModeBadge) {
            if (typeof cardsModeInstance !== 'undefined' && cardsModeInstance) {
                const subInfo = cardsModeInstance.getSubModeInfo();
                this.setupSummaryModeBadge.textContent = `وضع البطاقات الذرية • ${subInfo.name}`;
            } else {
                this.setupSummaryModeBadge.textContent = 'وضع البطاقات الذرية';
            }
        }
        if (this.setupSummaryMetaText) {
            const sz = this.config.gridSize;
            const pc = this.config.playerCount;
            this.setupSummaryMetaText.textContent = `مفاعل ${sz}×${sz} (${sz * sz} غرفة) • ${pc === 2 ? 'قوتان' : pc + ' قوى'} • يُقفل الطور عند بدء الاشتباك`;
        }
    }

    /**
     * قفل الإعدادات والانتقال من صفحة التجهيز (#setupScreen) إلى ساحة المعركة (#battleScreen)
     */
    launchBattleFromSetup() {
        this.inBattle = true;
        this.updateModeUI();

        if (this.welcomeScreenEl) this.welcomeScreenEl.classList.add('hidden');
        if (this.setupScreenEl) this.setupScreenEl.classList.add('hidden');
        if (this.battleScreenEl) this.battleScreenEl.classList.remove('hidden');

        this.sound.playPlaceAtom(false);
        this.startNewGame();
    }

    /**
     * الانتقال المباشر إلى المعركة (للتوافق البرمجي)
     */
    launchMode(mode) {
        this.config.gameMode = mode;
        this.launchBattleFromSetup();
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

        if (this.isOnlineMatch) {
            if (this.network) this.network.cleanup();
            this.isOnlineMatch = false;
        }
        this.isSpectator = false;
        if (this.spectatorBanner) {
            this.spectatorBanner.classList.add('hidden');
        }
        if (this.tacticalHintTimer) {
            clearTimeout(this.tacticalHintTimer);
            this.tacticalHintTimer = null;
        }
        document.querySelectorAll('.cell-tactical-hint').forEach(el => el.classList.remove('cell-tactical-hint'));
        if (this.boardWrapperEl) {
            this.boardWrapperEl.classList.remove('board-wrapper--locked');
        }
        if (this.btnRestartFast) {
            this.btnRestartFast.classList.remove('hidden');
        }

        this.stopBlitzTimer();
        if (this.hazardCell) {
            document.querySelectorAll('.cell-hazard-meltdown').forEach(el => el.classList.remove('cell-hazard-meltdown'));
            this.hazardCell = null;
        }

        this.toggleModal(this.victoryModal, false);
        this.toggleModal(this.settingsModal, false);
        this.toggleModal(this.rulesModal, false);
        if (this.dossierModal) this.toggleModal(this.dossierModal, false);
        if (this.onlineLobbyModal) this.toggleModal(this.onlineLobbyModal, false);

        if (this.battleScreenEl) this.battleScreenEl.classList.add('hidden');
        if (this.setupScreenEl) this.setupScreenEl.classList.add('hidden');
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
        if (!modalEl) return;
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
        this.stopBlitzTimer();
        this.hazardCell = null;

        const size = this.config.gridSize;
        const activePlayers = this.config.playersSetup.slice(0, this.config.playerCount).map(setup => {
            const palette = ISOTOPE_PALETTES[setup.paletteIndex] || ISOTOPE_PALETTES[0];
            return {
                name: setup.name,
                color: palette.color,
                darkColor: palette.darkColor,
                glow: palette.glow,
                isAI: setup.isAI,
                personality: setup.personality || 'balanced'
            };
        });

        this.engine = new AtomicWarsEngine(size, size, activePlayers, this.config.gameMode);
        this.selectedAction = null;
        this.selectedArsenalAtom = null;
        this.updateModeUI();
        this.syncCardsSubModeUI();

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
            const firstPlayer = this.engine.getCurrentPlayer();
            this.handleTurnTransition(firstPlayer);
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
                    <span class="cell-citadel-badge hidden" title="قلعة قلب المفاعل: تمنح +2⚡ نيوترون إضافي كل دور للمسيطر عليها">🏰 +2⚡</span>
                    <span class="cell-meltdown-badge hidden" title="بؤرة انصهار حراري وشيكة الانفجار!">🌋 2</span>
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

        // منع المتفرج من التفاعل بالرقعة
        if (this.isSpectator) {
            this.setWaveStatus('أنت في وضع المتفرج 👁️: تراقب وقائع الاشتباك النووي المباشر دون التحكم بالرقعة.', 'amber');
            this.sound.playShieldDeflect();
            return;
        }

        const currentPlayer = this.engine.getCurrentPlayer();
        if (currentPlayer.isAI) return;

        // في المعركة الأونلاين: يمنع التفاعل إلا في دور هذا الجهاز
        if (this.isOnlineMatch && currentPlayer.id !== this.localPlayerId) {
            this.setWaveStatus(`في انتظار حركة الخصم [${currentPlayer.name}]...`, 'amber');
            this.sound.playShieldDeflect();
            return;
        }

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
    async processPlayerMove(r, c, atomsToPlace = 1, actionType = 'atom', isRemote = false) {
        if (!this.engine.isValidMove(r, c, this.engine.currentPlayerIndex, atomsToPlace, actionType)) return;

        this.isAnimating = true;
        const actingPlayer = this.engine.getCurrentPlayer();
        const isFirstMove = !actingPlayer.hasPlayed;
        
        if (actionType === 'controlRod') {
            this.sound.playControlRodDeploy();
            this.setWaveStatus(`تم تثبيت درع نووي واقٍ في الغرفة [${r+1}, ${c+1}] بنجاح!`, 'sky');
            if (this.dossier) this.dossier.recordControlRod();
            if (this.haptic) this.haptic.onAtomPlaced();
        } else if (actionType === 'energyDrain') {
            this.sound.playEnergyDrain();
            this.setWaveStatus(`إطلاق هجوم إخماد الطاقة على الغرفة [${r+1}, ${c+1}]...`, 'amber');
            if (this.dossier) this.dossier.recordEnergyDrain();
            if (this.haptic) this.haptic.onAtomPlaced();
        } else {
            this.sound.playPlaceAtom(isFirstMove);
            if (this.dossier) this.dossier.recordAtomPlacement();
            if (this.haptic) this.haptic.onAtomPlaced();
        }

        const result = this.engine.executeTurn(r, c, atomsToPlace, actionType);
        if (!result.valid) {
            this.isAnimating = false;
            return;
        }

        // إذا كانت الحركة محلية وناجحة في معركة أونلاين، يتم بثها للخصوم (أو إذا كان المضيف يدير دور الروبوت)
        if (this.isOnlineMatch && !isRemote) {
            const isLocal = actingPlayer.id === this.localPlayerId;
            const isHostBot = (this.network && this.network.isHost && actingPlayer.isAI);
            if (isLocal || isHostBot) {
                if (this.network) {
                    this.network.sendMove(r, c, atomsToPlace, actionType, actingPlayer.id);
                }
            }
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
            if (this.haptic) this.haptic.onExplosion();
            let totalFissions = 0;
            for (let i = 0; i < result.waves.length; i++) {
                const wave = result.waves[i];
                totalFissions += (wave.explodedCells ? wave.explodedCells.length : 1);
                this.setWaveStatus(`انشطار متسلسل • موجة ${wave.waveIndex}`, 'amber');
                this.updateGeigerMeter(Math.min(wave.waveIndex * 18, 100));
                this.sound.playFissionWave(wave.waveIndex);

                await this.animateExplosionWave(wave, actingPlayer);
                this.renderBoardState(wave.boardSnapshot);
                this.renderScoreboard(wave.playersSnapshot);
            }
            if (this.haptic) this.haptic.onChainReaction(totalFissions);
            if (this.dossier) this.dossier.recordChainReaction(totalFissions);
            if (totalFissions >= 3 && this.boardWrapperEl) {
                this.boardWrapperEl.classList.add('screen-shake-effect');
                setTimeout(() => {
                    if (this.boardWrapperEl) this.boardWrapperEl.classList.remove('screen-shake-effect');
                }, 320);
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

        // فحص وتطبيق حدث انصهار القلب (Meltdown) البيئي المستقل دون استهلاك دور اللاعب
        if (this.config.gameMode === 'advanced' && typeof cardsModeInstance !== 'undefined' && cardsModeInstance.isMeltdown()) {
            await this.checkMeltdownHazard();
            if (this.engine.isGameOver && this.engine.winner) {
                this.updateTurnIndicator();
                this.sound.playVictory();
                setTimeout(() => this.showVictoryModal(this.engine.winner), 350);
                this.isAnimating = false;
                return;
            }
        }

        this.updateTurnIndicator();
        this.renderBoardState(this.engine.board);
        this.renderScoreboard(this.engine.players);
        this.isAnimating = false;

        this.handleTurnTransition(nextPlayer);
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
                const fromRect = fromCell.getBoundingClientRect();
                const atomSize = Math.max(16, fromRect.width * 0.38);
                const startX = (fromRect.left - boardRect.left) + (fromRect.width / 2) - (atomSize / 2);
                const startY = (fromRect.top - boardRect.top) + (fromRect.height / 2) - (atomSize / 2);

                let deltaX = 0;
                let deltaY = 0;
                let toCell = null;

                if (t.isVoid && t.outDir) {
                    // مقذوف ضائع في الحافة: يقذف خارج الرقعة ويتلاشى
                    deltaX = t.outDir.dc * fromRect.width * 1.15;
                    deltaY = t.outDir.dr * fromRect.height * 1.15;
                } else if (this.cellElements[t.toRow] && this.cellElements[t.toRow][t.toCol]) {
                    toCell = this.cellElements[t.toRow][t.toCol];
                    const toRect = toCell.getBoundingClientRect();
                    deltaX = (toRect.left - fromRect.left);
                    deltaY = (toRect.top - fromRect.top);
                } else {
                    continue;
                }

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

                flyingEls.push({ el: flyer, deltaX, deltaY, isVoid: !!t.isVoid });

                // التحقق من استجابات الاصطدام الدفاعية التكتيكية:
                if (t.isVoid || !toCell) {
                    // لا تفاعل اصطدام مع الغرف للجسيمات الضائعة في الفضاء
                    continue;
                }

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
                    item.el.style.transform = `translate(${item.deltaX}px, ${item.deltaY}px)${item.isVoid ? ' scale(0.35)' : ''}`;
                    if (item.isVoid) {
                        item.el.style.opacity = '0';
                    }
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
                const citadelBadgeEl = cellEl.querySelector('.cell-citadel-badge');
                const meltdownBadgeEl = cellEl.querySelector('.cell-meltdown-badge');

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

                // شارة قلعة قلب المفاعل في طور الحصار (Siege Citadel)
                if (citadelBadgeEl) {
                    if (cell.isCitadel) {
                        cellEl.classList.add('cell-citadel-core');
                        citadelBadgeEl.classList.remove('hidden');
                    } else {
                        cellEl.classList.remove('cell-citadel-core');
                        citadelBadgeEl.classList.add('hidden');
                    }
                }

                // شارة الانصهار الحراري في طور انصهار القلب (Meltdown Hazard)
                if (meltdownBadgeEl) {
                    const isHazard = this.hazardCell && this.hazardCell.r === r && this.hazardCell.c === c;
                    if (isHazard && this.hazardCell.turnsLeft > 0) {
                        cellEl.classList.add('cell-hazard-meltdown');
                        meltdownBadgeEl.textContent = `🌋 ${this.hazardCell.turnsLeft}`;
                        meltdownBadgeEl.classList.remove('hidden');
                    } else {
                        cellEl.classList.remove('cell-hazard-meltdown');
                        meltdownBadgeEl.classList.add('hidden');
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
     * تحديث شريط كبسولات القوى النووية أعلى المفاعل
     */
    renderScoreboard(playersList) {
        this.playersListEl.innerHTML = '';
        const currentId = this.engine.currentPlayerIndex;
        const hasNeutrons = this.engine && this.engine.mode && typeof this.engine.mode.hasNeutronSystem === 'function' && this.engine.mode.hasNeutronSystem();

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
                ? '<span class="player-status-tag player-status-tag--eliminated">مُدمّر</span>'
                : isTurn
                    ? `<span class="player-status-tag player-status-tag--turn">${!p.hasPlayed ? 'ضربة افتتاحية ×3' : 'الدور النشط'}</span>`
                    : !p.hasPlayed
                        ? '<span class="player-status-tag player-status-tag--waiting">بانتظار البداية</span>'
                        : '';

            const neutronStatHtml = hasNeutrons ? `
                <div class="player-stat-box">
                    <div class="player-stat-label">طاقة ⚡</div>
                    <div class="player-stat-value" style="color: #38bdf8">${p.neutrons || 0}</div>
                </div>
            ` : '';

            card.innerHTML = `
                <div class="player-card-info">
                    <span class="player-color-dot" style="background-color: ${p.color}; box-shadow: 0 0 8px ${p.color};"></span>
                    <div class="player-meta-box">
                        <div class="player-name-row">
                            <span>${p.name}</span>
                            ${this.isOnlineMatch && p.id === this.localPlayerId ? '<span class="player-local-badge">أنت</span>' : ''}
                            ${p.isAI ? `<i class="fa-solid fa-robot icon-sky" title="${p.personality === 'aggressive' ? 'روبوت هجومي' : (p.personality === 'defensive' ? 'روبوت حذر' : 'روبوت متوازن')}"></i>` : ''}
                            ${this.getPingBadgeHTML(p.id)}
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
                    ${neutronStatHtml}
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

        if (this.isOnlineMatch) {
            const isMyTurn = (currentPlayer.id === this.localPlayerId);
            if (this.currentPlayerNameEl) {
                this.currentPlayerNameEl.textContent = currentPlayer.name + (isMyTurn ? ' (دورك الآن!)' : ' (انتظار الخصم)');
                this.currentPlayerNameEl.style.color = currentPlayer.color;
            }
            if (this.boardWrapperEl) {
                if (isMyTurn) {
                    this.boardWrapperEl.classList.remove('board-wrapper--locked');
                } else {
                    this.boardWrapperEl.classList.add('board-wrapper--locked');
                }
            }
        } else {
            if (this.currentPlayerNameEl) {
                this.currentPlayerNameEl.textContent = currentPlayer.name + (currentPlayer.isAI ? ' (آلي)' : '');
                this.currentPlayerNameEl.style.color = currentPlayer.color;
            }
            if (this.boardWrapperEl) {
                this.boardWrapperEl.classList.remove('board-wrapper--locked');
            }
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
        const maxN = (typeof this.engine.mode.getMaxNeutrons === 'function') ? this.engine.mode.getMaxNeutrons() : 10;
        const rodCost = (typeof this.engine.mode.getControlRodCost === 'function') ? this.engine.mode.getControlRodCost() : 5;
        const drainCost = (typeof this.engine.mode.getEnergyDrainCost === 'function') ? this.engine.mode.getEnergyDrainCost() : 3;

        // تحديث شارات تكلفة البطاقات بحسب الطور (مثل تخفيض تكلفة الدرع والإخماد في طور الحصار)
        const btnRod = document.getElementById('btnArsenalControlRod');
        const badgeRod = document.getElementById('costBadgeControlRod');
        if (btnRod) btnRod.dataset.cost = rodCost;
        if (badgeRod) badgeRod.textContent = `🛡️ ${rodCost}`;

        const btnDrain = document.getElementById('btnArsenalEnergyDrain');
        const badgeDrain = document.getElementById('costBadgeEnergyDrain');
        if (btnDrain) btnDrain.dataset.cost = drainCost;
        if (badgeDrain) badgeDrain.textContent = `⚡ ${drainCost}`;

        // تحديث النص العددي
        if (this.neutronValueDisplayEl) {
            if (isFirstMove) {
                this.neutronValueDisplayEl.textContent = `0 / ${maxN} (افتتاحية)`;
            } else {
                this.neutronValueDisplayEl.textContent = `${neutrons} / ${maxN}`;
            }
        }

        // تحديث شرائح مقياس النيوترونات
        if (this.neutronMeterTrackEl) {
            this.neutronMeterTrackEl.style.setProperty('--max-neutrons', maxN);
            this.neutronMeterTrackEl.innerHTML = '';
            for (let i = 0; i < maxN; i++) {
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
        const isSiege = (typeof this.engine.mode.isSiege === 'function' && this.engine.mode.isSiege());
        if (this.arsenalHintTextEl) {
            if (isFirstMove) {
                this.arsenalHintTextEl.innerHTML = isSiege
                    ? '🏰 <strong>الضربة الافتتاحية (طور الحصار):</strong> تمركز في أي غرفة على المحيط الخارجي لبدء الزحف نحو قلعة المركز!'
                    : '🛡️ <strong>الضربة الافتتاحية:</strong> اختر أي غرفة فارغة لتأسيس قلعتك النووية (ذرة ثلاثية مجانية مع درع 3×3)';
                this.arsenalHintTextEl.style.color = '#fcd34d';
            } else if (!this.selectedAction) {
                this.arsenalHintTextEl.innerHTML = '💡 <strong>وضع التغذية:</strong> انقر على أي ذرة حليفة لشحنها (1⚡) • أو اختر بطاقة تكتيكية من يدك أدناه';
                this.arsenalHintTextEl.style.color = '#cbd5e1';
            } else if (this.selectedAction === 'atom') {
                const count = this.selectedArsenalAtom || 1;
                const cost = count === 1 ? 3 : (count === 2 ? 6 : 9);
                this.arsenalHintTextEl.innerHTML = `⚡ <strong>بطاقة ${count === 1 ? 'ذرة أحادية' : (count === 2 ? 'ثنائي النظائر' : 'النواة الثلاثية')}:</strong> انقر على أي غرفة فارغة لإلقائها (${cost}⚡) • انقر البطاقة مجدداً للإلغاء`;
                this.arsenalHintTextEl.style.color = '#38bdf8';
            } else if (this.selectedAction === 'controlRod') {
                this.arsenalHintTextEl.innerHTML = `🛡️ <strong>بطاقة درع التحكم:</strong> انقر على إحدى غرفك لتثبيت درع واقٍ (${rodCost}⚡) • انقر البطاقة مجدداً للإلغاء`;
                this.arsenalHintTextEl.style.color = '#34d399';
            } else if (this.selectedAction === 'energyDrain') {
                this.arsenalHintTextEl.innerHTML = `⚡ <strong>بطاقة إخماد الطاقة:</strong> انقر على ذرة معادية لإرجاعها لمستوى 1 (${drainCost}⚡) • انقر البطاقة مجدداً للإلغاء`;
                this.arsenalHintTextEl.style.color = '#fbbf24';
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
            // في المعركة الأونلاين: فقط المضيف هو من يدير حركة الروبوتات تجنباً للاختلاف بين الأجهزة
            if (this.isOnlineMatch && !(this.network && this.network.isHost)) {
                return;
            }

            this.isAnimating = true;
            this.aiTimer = setTimeout(async () => {
                if (!this.inBattle || !this.engine || this.engine.isGameOver) {
                    this.isAnimating = false;
                    return;
                }
                const aiMove = this.engine.computeBestAIMove();
                if (aiMove) {
                    await this.processPlayerMove(aiMove.r, aiMove.c, aiMove.atomCount || 1, aiMove.actionType || 'atom', false);
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

        // إيقاف مؤقت الصاعقة عند انتهاء المباراة
        this.stopBlitzTimer();

        // اهتزاز النصر وتسجيل إحصائيات القائد والأنواط المفتوحة
        if (this.haptic) this.haptic.onVictory();
        if (this.dossier) {
            const isLocalWinner = (!this.isOnlineMatch && winner.id === 0) || (this.isOnlineMatch && winner.id === this.localPlayerId);
            const currentSubMode = (this.engine && this.engine.mode && typeof this.engine.mode.getSubMode === 'function')
                ? this.engine.mode.getSubMode()
                : 'standard';
            const newlyUnlocked = this.dossier.recordBattleOutcome(isLocalWinner, this.config.gameMode, currentSubMode);
            if (newlyUnlocked && newlyUnlocked.length > 0) {
                newlyUnlocked.forEach(m => {
                    this.showWelcomeToast(`🎖️ وسام نووي جديد: ${m.title}!`);
                });
            }
        }

        if (this.isOnlineMatch) {
            if (this.btnOpenSettingsFromWin) {
                this.btnOpenSettingsFromWin.classList.add('hidden');
            }
            if (this.btnPlayAgainModal) {
                if (this.network && this.network.isHost) {
                    this.btnPlayAgainModal.innerHTML = '<i class="fa-solid fa-rotate-right"></i> معركة جديدة بنفس المتنافسين';
                    this.btnPlayAgainModal.classList.remove('hidden');
                } else {
                    this.btnPlayAgainModal.classList.add('hidden');
                }
            }
        } else {
            if (this.btnOpenSettingsFromWin) {
                this.btnOpenSettingsFromWin.classList.remove('hidden');
            }
            if (this.btnPlayAgainModal) {
                this.btnPlayAgainModal.innerHTML = '<i class="fa-solid fa-play"></i> معركة جديدة';
                this.btnPlayAgainModal.classList.remove('hidden');
            }
        }

        this.toggleModal(this.victoryModal, true);
    }

    populateSettingsModal() {
        if (this.isOnlineMatch) {
            // في المعركة الأونلاين: إخفاء الحجم واللاعبين وتخصيص سرعة الانشطار فقط
            if (this.settingsGroupGridSize) this.settingsGroupGridSize.classList.add('hidden');
            if (this.settingsGroupPlayerCount) this.settingsGroupPlayerCount.classList.add('hidden');
            if (this.settingsGroupPlayerSetup) this.settingsGroupPlayerSetup.classList.add('hidden');
            if (this.settingsGroupSpeed) this.settingsGroupSpeed.classList.remove('hidden');
            if (this.settingsModalTitle) {
                this.settingsModalTitle.innerHTML = '<i class="fa-solid fa-gauge-high icon-sky"></i> تخصيص سرعة الانشطار (المباراة أونلاين)';
            }
            if (this.btnApplySettings) {
                this.btnApplySettings.textContent = 'تطبيق سرعة العرض للمفاعل';
            }
        } else {
            // في الأوفلاين: إظهار جميع الإعدادات بحرية
            if (this.settingsGroupGridSize) this.settingsGroupGridSize.classList.remove('hidden');
            if (this.settingsGroupPlayerCount) this.settingsGroupPlayerCount.classList.remove('hidden');
            if (this.settingsGroupPlayerSetup) this.settingsGroupPlayerSetup.classList.remove('hidden');
            if (this.settingsGroupSpeed) this.settingsGroupSpeed.classList.remove('hidden');
            if (this.settingsModalTitle) {
                this.settingsModalTitle.innerHTML = '<i class="fa-solid fa-sliders icon-emerald"></i> تخصيص المفاعل الذري والقوى';
            }
            if (this.btnApplySettings) {
                this.btnApplySettings.textContent = 'حفظ وتنشيط المفاعل الجديد';
            }

            document.querySelectorAll('.size-option').forEach(btn => {
                if (parseInt(btn.dataset.size, 10) === this.config.gridSize) {
                    this.updateButtonGroupHighlight('.size-option', btn, 'purple');
                }
            });

            document.querySelectorAll('.pcount-option').forEach(btn => {
                if (parseInt(btn.dataset.count, 10) === this.config.playerCount) {
                    this.updateButtonGroupHighlight('.pcount-option', btn, 'emerald');
                }
            });

            this.renderPlayerSetupRows();
        }

        document.querySelectorAll('.speed-option').forEach(btn => {
            if (parseInt(btn.dataset.speed, 10) === this.config.waveSpeedMs) {
                this.updateButtonGroupHighlight('.speed-option', btn, 'sky');
            }
        });
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

            const curPersonality = pSetup.personality || 'balanced';
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
                <select data-player-personality="${i}" class="player-personality-select" ${!pSetup.isAI ? 'style="display:none;"' : ''} title="شخصية الذكاء الاصطناعي">
                    <option value="balanced" ${curPersonality === 'balanced' ? 'selected' : ''}>🎯 متوازن</option>
                    <option value="aggressive" ${curPersonality === 'aggressive' ? 'selected' : ''}>⚔️ هجومي</option>
                    <option value="defensive" ${curPersonality === 'defensive' ? 'selected' : ''}>🛡️ حذر</option>
                </select>
            `;
            container.appendChild(row);
        }

        container.querySelectorAll('[data-player-ai]').forEach(chk => {
            chk.addEventListener('change', () => {
                const idx = parseInt(chk.dataset.playerAi, 10);
                const selectEl = container.querySelector(`[data-player-personality="${idx}"]`);
                if (selectEl) {
                    selectEl.style.display = chk.checked ? 'inline-block' : 'none';
                }
            });
        });

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
        container.querySelectorAll('[data-player-personality]').forEach(sel => {
            const idx = parseInt(sel.dataset.playerPersonality, 10);
            this.config.playersSetup[idx].personality = sel.value;
        });
    }

    /* ==========================================================================
       قسم إدارة اللعب الجماعي أونلاين (Online Multiplayer P2P Methods)
       ========================================================================== */

    setupNetworkCallbacks() {
        if (!this.network) return;

        this.network.onStatusChange = (text, type) => {
            this.setOnlineStatus(text, type);
        };

        this.network.onError = (msg) => {
            this.setOnlineStatus(msg, 'error');
        };

        this.network.onLobbyUpdate = (lobbyState) => {
            this.renderOnlineLobby(lobbyState);
        };

        this.network.onGameStart = (config) => {
            this.startOnlineGame(config);
        };

        this.network.onMoveReceived = (move) => {
            this.handleRemoteMove(move);
        };

        this.network.onEmoteReceived = (data) => {
            this.handleRemoteEmote(data);
        };

        this.network.onPingUpdate = (pings) => {
            this.handlePingUpdate(pings);
        };

        this.network.onPlayerLeft = (player) => {
            this.handlePlayerLeft(player);
        };

        this.network.onRoomClosed = () => {
            if (this.clientWaitingSection) this.clientWaitingSection.classList.add('hidden');
            if (this.clientJoinInputSection) this.clientJoinInputSection.classList.remove('hidden');
            this.setOnlineStatus('قام المضيف بإلغاء الغرفة والرجوع للقائمة.', 'amber');
            this.sound.playShieldDeflect();
        };

        this.network.onLeaveRoom = () => {
            if (this.hostWaitingSection) this.hostWaitingSection.classList.add('hidden');
            if (this.hostSetupSection) this.hostSetupSection.classList.remove('hidden');
            if (this.clientWaitingSection) this.clientWaitingSection.classList.add('hidden');
            if (this.clientJoinInputSection) this.clientJoinInputSection.classList.remove('hidden');
        };
    }

    checkUrlRoomParam() {
        if (typeof window === 'undefined') return;
        try {
            const params = new URLSearchParams(window.location.search);
            const room = params.get('room');
            if (room) {
                setTimeout(() => {
                    this.openOnlineLobby();
                    this.switchOnlineTab('join');
                    if (this.joinRoomCodeInput) {
                        this.joinRoomCodeInput.value = room.toUpperCase();
                    }
                    this.setOnlineStatus(`تم العثور على دعوة للانضمام للمفاعل: ${room.toUpperCase()}`, 'info');
                }, 300);
            }
        } catch (e) {}
    }

    openOnlineLobby() {
        this.toggleModal(this.onlineLobbyModal, true);
        if (this.onlinePlayerNameInput) {
            this.onlinePlayerNameInput.value = this.getPersistentPlayerName();
        }
    }

    closeOnlineLobby() {
        this.toggleModal(this.onlineLobbyModal, false);
    }

    setOnlineStatus(text, type = 'info') {
        if (!this.onlineStatusBanner || !this.onlineStatusText) return;
        this.onlineStatusText.textContent = text;
        this.onlineStatusBanner.className = `online-status-banner online-status-banner--${type}`;
    }

    switchOnlineTab(tab) {
        if (tab === 'create') {
            if (this.tabBtnCreateRoom) this.tabBtnCreateRoom.classList.add('online-tab-btn--active');
            if (this.tabBtnJoinRoom) this.tabBtnJoinRoom.classList.remove('online-tab-btn--active');
            if (this.tabContentCreateRoom) this.tabContentCreateRoom.classList.remove('hidden');
            if (this.tabContentJoinRoom) this.tabContentJoinRoom.classList.add('hidden');
        } else {
            if (this.tabBtnCreateRoom) this.tabBtnCreateRoom.classList.remove('online-tab-btn--active');
            if (this.tabBtnJoinRoom) this.tabBtnJoinRoom.classList.add('online-tab-btn--active');
            if (this.tabContentCreateRoom) this.tabContentCreateRoom.classList.add('hidden');
            if (this.tabContentJoinRoom) this.tabContentJoinRoom.classList.remove('hidden');
        }
    }

    selectOnlineMode(mode) {
        this.onlineSelectedMode = mode;
        if (this.onlineModeCardNormal) {
            this.onlineModeCardNormal.classList.toggle('online-mode-card--active', mode === 'normal');
        }
        if (this.onlineModeCardAdvanced) {
            this.onlineModeCardAdvanced.classList.toggle('online-mode-card--active', mode === 'advanced');
        }
    }

    selectOnlineGridSize(size) {
        this.onlineSelectedGridSize = size;
        if (this.onlineGridSizeButtons) {
            this.onlineGridSizeButtons.forEach(btn => {
                const bSize = parseInt(btn.dataset.size, 10);
                btn.classList.toggle('option-btn--active-purple', bSize === size);
            });
        }
    }

    renderOnlineLobby(lobbyState) {
        if (!lobbyState) return;

        // في شاشة المضيف
        if (lobbyState.isHost) {
            if (this.hostSetupSection) this.hostSetupSection.classList.add('hidden');
            if (this.hostWaitingSection) this.hostWaitingSection.classList.remove('hidden');
            if (this.displayRoomCode) this.displayRoomCode.textContent = lobbyState.roomCode;

            // تحديث بطاقات اللاعبين والروبوتات في مفاعل المضيف
            if (this.hostPlayersSlotsList) {
                this.hostPlayersSlotsList.innerHTML = '';
                for (let i = 0; i < lobbyState.maxPlayers; i++) {
                    const p = lobbyState.players[i];
                    const pal = ISOTOPE_PALETTES[i] || ISOTOPE_PALETTES[0];
                    const slotDiv = document.createElement('div');
                    if (p) {
                        slotDiv.className = 'lobby-slot-card';
                        slotDiv.dataset.playerId = p.id;
                        slotDiv.style.setProperty('--slot-color', pal.color);
                        slotDiv.style.setProperty('--slot-glow', pal.glow);

                        const pingVal = (lobbyState.pings && lobbyState.pings[p.id] !== undefined) ? lobbyState.pings[p.id] : (p.isAI || p.isHost ? 1 : 45);
                        const pingCls = this.getPingClass(pingVal);

                        if (p.isAI) {
                            const pers = p.personality || 'balanced';
                            const persLabel = pers === 'aggressive' ? '⚔️ هجومي' : (pers === 'defensive' ? '🛡️ حذر' : '🎯 متوازن');
                            const persCls = `personality--${pers}`;
                            slotDiv.innerHTML = `
                                <button type="button" class="btn-remove-bot" data-bot-id="${p.id}" title="إزالة الروبوت"><i class="fa-solid fa-xmark"></i></button>
                                <div class="lobby-slot-avatar"><i class="fa-solid fa-robot"></i></div>
                                <div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
                                    <span class="lobby-slot-name">${p.name}</span>
                                    <div style="display:flex; align-items:center; gap:4px;">
                                        <span class="lobby-slot-role">${pal.name.split(' ')[0]}</span>
                                        <button type="button" class="lobby-personality-badge ${persCls}" data-bot-pers-id="${p.id}" title="انقر لتبديل الخطة الذكية">${persLabel}</button>
                                    </div>
                                    <span class="ping-indicator ${pingCls}"><span class="ping-dot"></span>${pingVal}ms</span>
                                </div>
                            `;
                        } else {
                            slotDiv.innerHTML = `
                                <div class="lobby-slot-avatar"><i class="fa-solid fa-atom"></i></div>
                                <div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
                                    <span class="lobby-slot-name">${p.name} ${p.isHost ? '(المضيف)' : ''}</span>
                                    <span class="lobby-slot-role">${pal.name.split(' ')[0]}</span>
                                    <span class="ping-indicator ${pingCls}"><span class="ping-dot"></span>${pingVal}ms</span>
                                </div>
                            `;
                        }
                    } else {
                        slotDiv.className = 'lobby-slot-card lobby-slot-card--waiting';
                        slotDiv.innerHTML = `
                            <div class="lobby-slot-avatar"><i class="fa-solid fa-user-plus"></i></div>
                            <span class="lobby-slot-name">شاغر</span>
                            <button type="button" class="btn-add-bot-slot" title="إضافة روبوت نووي لهذه الفتحة">
                                <i class="fa-solid fa-robot"></i> + روبوت AI
                            </button>
                        `;
                        const addBtn = slotDiv.querySelector('.btn-add-bot-slot');
                        if (addBtn) {
                            addBtn.addEventListener('click', () => {
                                if (this.network) this.network.addBot();
                            });
                        }
                    }
                    this.hostPlayersSlotsList.appendChild(slotDiv);
                }

                // ربط أزرار إزالة الروبوتات
                this.hostPlayersSlotsList.querySelectorAll('.btn-remove-bot').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const bId = parseInt(btn.dataset.botId, 10);
                        if (this.network) this.network.removeBot(bId);
                    });
                });

                // ربط أزرار تبديل خطة وشخصية الروبوت
                this.hostPlayersSlotsList.querySelectorAll('.lobby-personality-badge').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const bId = parseInt(btn.dataset.botPersId, 10);
                        if (this.network) this.network.cycleBotPersonality(bId);
                    });
                });
            }

            // زر بدء اللعبة للمضيف (يبدأ بالعدد الموجود حالياً: 2 أو 3 أو 4 دون اشتراط اكتمال المقاعد)
            if (this.btnHostStartBattle) {
                const totalParticipants = lobbyState.players.length;
                if (totalParticipants >= 2) {
                    this.btnHostStartBattle.disabled = false;
                    this.btnHostStartBattle.style.opacity = '1';
                    this.btnHostStartBattle.style.cursor = 'pointer';
                    this.btnHostStartBattle.innerHTML = `<i class="fa-solid fa-play"></i> إطلاق المعركة النووية بالعدد الحالي (${totalParticipants} قوى)!`;
                } else {
                    this.btnHostStartBattle.disabled = true;
                    this.btnHostStartBattle.style.opacity = '0.5';
                    this.btnHostStartBattle.style.cursor = 'not-allowed';
                    this.btnHostStartBattle.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> بانتظار انضمام لاعب أو روبوت (1/4)...`;
                }
            }
        } else {
            // في شاشة الضيف
            if (this.clientJoinInputSection) this.clientJoinInputSection.classList.add('hidden');
            if (this.clientWaitingSection) this.clientWaitingSection.classList.remove('hidden');
            if (this.displayClientRoomCode) this.displayClientRoomCode.textContent = lobbyState.roomCode;
            if (this.clientLobbyModeInfo) {
                const modeName = lobbyState.gameMode === 'advanced' ? 'البطاقات الذرية' : 'الوضع العادي';
                const gSize = lobbyState.gridSize || 7;
                this.clientLobbyModeInfo.textContent = `النمط: ${modeName} • مفاعل ${gSize}×${gSize} • الحاضرون: ${lobbyState.players.length} من 4 قوى`;
            }

            if (this.clientPlayersSlotsList) {
                this.clientPlayersSlotsList.innerHTML = '';
                for (let i = 0; i < lobbyState.maxPlayers; i++) {
                    const p = lobbyState.players[i];
                    const pal = ISOTOPE_PALETTES[i] || ISOTOPE_PALETTES[0];
                    const slotDiv = document.createElement('div');
                    if (p) {
                        slotDiv.className = 'lobby-slot-card';
                        slotDiv.dataset.playerId = p.id;
                        slotDiv.style.setProperty('--slot-color', pal.color);
                        slotDiv.style.setProperty('--slot-glow', pal.glow);

                        const pingVal = (lobbyState.pings && lobbyState.pings[p.id] !== undefined) ? lobbyState.pings[p.id] : (p.isAI || p.isHost ? 1 : 45);
                        const pingCls = this.getPingClass(pingVal);

                        if (p.isAI) {
                            const pers = p.personality || 'balanced';
                            const persLabel = pers === 'aggressive' ? '⚔️ هجومي' : (pers === 'defensive' ? '🛡️ حذر' : '🎯 متوازن');
                            const persCls = `personality--${pers}`;
                            slotDiv.innerHTML = `
                                <div class="lobby-slot-avatar"><i class="fa-solid fa-robot"></i></div>
                                <div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
                                    <span class="lobby-slot-name">${p.name}</span>
                                    <div style="display:flex; align-items:center; gap:4px;">
                                        <span class="lobby-slot-role">${pal.name.split(' ')[0]}</span>
                                        <span class="lobby-personality-badge ${persCls}" style="cursor:default;">${persLabel}</span>
                                    </div>
                                    <span class="ping-indicator ${pingCls}"><span class="ping-dot"></span>${pingVal}ms</span>
                                </div>
                            `;
                        } else {
                            slotDiv.innerHTML = `
                                <div class="lobby-slot-avatar"><i class="fa-solid fa-atom"></i></div>
                                <div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
                                    <span class="lobby-slot-name">${p.name} ${p.id === lobbyState.localPlayerId ? '(أنت)' : ''}</span>
                                    <span class="lobby-slot-role">${pal.name.split(' ')[0]}</span>
                                    <span class="ping-indicator ${pingCls}"><span class="ping-dot"></span>${pingVal}ms</span>
                                </div>
                            `;
                        }
                    } else {
                        slotDiv.className = 'lobby-slot-card lobby-slot-card--waiting';
                        slotDiv.innerHTML = `
                            <div class="lobby-slot-avatar"><i class="fa-solid fa-user-plus"></i></div>
                            <span class="lobby-slot-name">شاغر</span>
                            <span class="lobby-slot-role">بانتظار الانضمام...</span>
                        `;
                    }
                    this.clientPlayersSlotsList.appendChild(slotDiv);
                }
            }
        }
    }

    startOnlineGame(config) {
        this.isOnlineMatch = true;
        this.isSpectator = !!config.isSpectator;
        this.localPlayerId = config.localPlayerId;
        this.config.gameMode = config.mode;
        this.config.gridSize = config.gridSize || 7;
        this.config.playerCount = config.players.length;

        // تهيئة اللاعبين والروبوتات بأسمائهم وألوانهم وخططهم
        this.config.playersSetup = config.players.map((p, idx) => {
            return {
                name: p.name,
                paletteIndex: idx,
                isAI: !!p.isAI,
                personality: p.personality || 'balanced'
            };
        });

        // إغلاق نافذة الردهة
        this.closeOnlineLobby();

        // إظهار أو إخفاء شارة المتفرج
        if (this.spectatorBanner) {
            if (this.isSpectator) {
                this.spectatorBanner.classList.remove('hidden');
            } else {
                this.spectatorBanner.classList.add('hidden');
            }
        }

        // إخفاء زر مفاعل جديد السريع أثناء الأونلاين لمنع الانفصال
        if (this.btnRestartFast) {
            this.btnRestartFast.classList.add('hidden');
        }

        // إطلاق اللعبة
        this.inBattle = true;
        this.updateModeUI();

        if (this.welcomeSim) {
            this.welcomeSim.stop();
        }
        if (this.welcomeScreenEl) this.welcomeScreenEl.classList.add('hidden');
        if (this.battleScreenEl) this.battleScreenEl.classList.remove('hidden');

        this.sound.playPlaceAtom(false);
        this.startNewGame();

        if (this.isSpectator) {
            this.setWaveStatus('أنت متصل كمتفرج: ترصد وقائع الاشتباك النووي المباشر لحظياً 👁️', 'cyan');
        } else {
            this.setWaveStatus(`بدأت المعركة النووية أونلاين! ${this.localPlayerId === 0 ? 'أنت صاحب الضربة الافتتاحية!' : 'بانتظار الضربة الأولى...'}`, 'emerald');
        }
    }

    getPersistentPlayerName() {
        const STORAGE_KEY = 'atomic_war_persistent_player_name';
        try {
            let name = localStorage.getItem(STORAGE_KEY);
            if (!name || !name.trim()) {
                name = 'قائد اليورانيوم';
                localStorage.setItem(STORAGE_KEY, name);
            }
            return name.trim();
        } catch (e) {
            return 'قائد اليورانيوم';
        }
    }

    setPersistentPlayerName(name) {
        const STORAGE_KEY = 'atomic_war_persistent_player_name';
        const cleanName = (name && name.trim()) ? name.trim().slice(0, 16) : 'قائد اليورانيوم';
        try {
            localStorage.setItem(STORAGE_KEY, cleanName);
        } catch (e) {}

        if (this.onlinePlayerNameInput && this.onlinePlayerNameInput.value !== cleanName) {
            this.onlinePlayerNameInput.value = cleanName;
        }
        if (this.config && this.config.playersSetup && this.config.playersSetup[0]) {
            this.config.playersSetup[0].name = cleanName;
        }
        return cleanName;
    }

    handleRemoteMove(move) {
        if (!this.engine || !this.inBattle) return;
        // إذا كانت الحركة قادمة من خصم، يتم تنفيذها
        if (move.playerId !== this.localPlayerId) {
            this.processPlayerMove(move.r, move.c, move.atomCount || 1, move.actionType || 'atom', true);
        }
    }

    handlePlayerLeft(player) {
        const name = (player && player.name) ? player.name : 'أحد الخصوم';
        this.setWaveStatus(`⚠️ القوة النووية [${name}] غادرت المعركة أو انقطع اتصالها!`, 'rose');
        this.sound.playShieldDeflect();
    }

    /**
     * مساعد التوجيه التكتيكي (Tactical Advisor)
     */
    showTacticalHint() {
        if (!this.inBattle || !this.engine || this.engine.isGameOver) {
            this.setWaveStatus('المفاعل متوقف حالياً، لا توجد إشارات تكتيكية!', 'amber');
            return;
        }

        if (this.isSpectator) {
            this.setWaveStatus('أنت متفرج فقط 👁️، التوجيه التكتيكي مخصص للاعبين المقاتلين.', 'amber');
            this.sound.playShieldDeflect();
            return;
        }

        const currentPlayer = this.engine.getCurrentPlayer();
        if (this.isOnlineMatch && currentPlayer.id !== this.localPlayerId) {
            this.setWaveStatus('💡 انتظر حلول دورك في المفاعل لطلب التوجيه التكتيكي لحركتك!', 'amber');
            this.sound.playShieldDeflect();
            return;
        }

        const hint = this.engine.getTacticalHint();
        if (!hint) {
            this.setWaveStatus('لم يتم رصد مسار انشطاري حاسم في هذه اللحظة، ركز على تحصين مراكزك!', 'info');
            return;
        }

        if (this.tacticalHintTimer) {
            clearTimeout(this.tacticalHintTimer);
            this.tacticalHintTimer = null;
        }
        document.querySelectorAll('.cell-tactical-hint').forEach(el => el.classList.remove('cell-tactical-hint'));

        const cellEl = (this.cellElements[hint.r] && this.cellElements[hint.r][hint.c])
            ? this.cellElements[hint.r][hint.c]
            : document.querySelector(`.board-cell[data-row="${hint.r}"][data-col="${hint.c}"]`);
        if (cellEl) {
            cellEl.classList.add('cell-tactical-hint');
        }

        this.sound.playShieldDeploy();
        this.setWaveStatus(`💡 توجيه المفاعل: ${hint.reason}`, 'cyan');

        this.tacticalHintTimer = setTimeout(() => {
            if (cellEl) cellEl.classList.remove('cell-tactical-hint');
            this.tacticalHintTimer = null;
        }, 4500);
    }

    /**
     * إرسال وإظهار تعبير تكتيكي سريع (Quick Emote)
     */
    triggerEmote(emote) {
        if (!emote) return;
        const myName = (this.network && this.network.localPlayerName) ? this.network.localPlayerName : 'أنت';

        if (this.isOnlineMatch && this.network) {
            this.network.sendEmote(emote);
        } else {
            this.showEmoteBubble(emote, myName, true);
        }
    }

    handleRemoteEmote(data) {
        if (!data || !data.emote) return;
        this.showEmoteBubble(data.emote, data.playerName || 'لاعب نووي', false);
    }

    showEmoteBubble(emote, senderName, isLocal) {
        const bubble = document.createElement('div');
        bubble.className = 'floating-emote-bubble';
        bubble.innerHTML = `
            <span>${emote}</span>
            <span class="emote-sender">${senderName}</span>
        `;

        const randomLeft = 45 + (Math.random() * 20 - 10);
        const randomTop = 38 + (Math.random() * 16 - 8);
        bubble.style.left = `${randomLeft}%`;
        bubble.style.top = `${randomTop}%`;

        document.body.appendChild(bubble);
        this.sound.playCellPlace();

        setTimeout(() => {
            if (bubble && bubble.parentNode) {
                bubble.parentNode.removeChild(bubble);
            }
        }, 2400);
    }

    /**
     * إدارة تحديث زمن الاستجابة وجودة الاتصال (Ping)
     */
    handlePingUpdate(pings) {
        this.currentPings = pings || {};
        if (this.inBattle) {
            this.renderScoreboard(this.engine.players);
        }
    }

    getPingClass(ms) {
        if (ms <= 80) return 'ping--good';
        if (ms <= 180) return 'ping--medium';
        return 'ping--bad';
    }

    getPingBadgeHTML(playerId) {
        if (!this.isOnlineMatch) return '';
        const ms = (this.currentPings && this.currentPings[playerId] !== undefined)
            ? this.currentPings[playerId]
            : (this.network && this.network.isHost && playerId === 0 ? 1 : 45);

        const cls = this.getPingClass(ms);
        return `<span class="ping-indicator ${cls}" title="زمن الاستجابة: ${ms}ms"><span class="ping-dot"></span>${ms}ms</span>`;
    }

    /* ==========================================================================
       ميزات الاهتزاز اللمسي، الثيمات، ملف القائد، وأطوار البطاقات التكتيكية
       ========================================================================== */

    toggleHaptic(state = null) {
        if (!this.haptic) return false;
        const res = this.haptic.toggle(state);
        this.syncHapticUI();
        return res;
    }

    syncHapticUI() {
        const isEnabled = this.haptic ? this.haptic.enabled : false;
        const iconCls = isEnabled ? 'fa-mobile-screen icon-emerald' : 'fa-mobile-screen-button icon-rose';
        if (this.welcomeHapticIcon) this.welcomeHapticIcon.className = `fa-solid ${iconCls}`;
        if (this.battleHapticIcon) this.battleHapticIcon.className = `fa-solid ${iconCls}`;
        if (this.checkHapticSetting) this.checkHapticSetting.checked = isEnabled;
        if (this.hapticSettingLabel) {
            this.hapticSettingLabel.textContent = isEnabled ? 'مفعّل' : 'معطّل';
            this.hapticSettingLabel.style.color = isEnabled ? '#38bdf8' : '#f87171';
        }
    }

    syncThemeOptions() {
        if (!this.themeMgr) return;
        const cur = this.themeMgr.currentTheme;
        if (this.themeOptionButtons) {
            this.themeOptionButtons.forEach(btn => {
                const isSelected = btn.dataset.theme === cur;
                btn.className = `option-btn theme-option ${isSelected ? 'option-btn--active-emerald' : ''}`;
            });
        }
    }

    renderDossierModal() {
        if (!this.dossier) return;
        const d = this.dossier.data;
        const rank = this.dossier.getRank();
        const pName = this.getPersistentPlayerName();

        const nameEl = document.getElementById('dossierCommanderName');
        const rankTitleEl = document.getElementById('dossierRankTitle');
        const rankStarsEl = document.getElementById('dossierRankStars');
        const winrateEl = document.getElementById('dossierWinrateVal');
        const battlesEl = document.getElementById('statTotalBattles');
        const winsEl = document.getElementById('statTotalWins');
        const atomsEl = document.getElementById('statTotalAtoms');
        const maxChainEl = document.getElementById('statMaxChain');
        const countBadge = document.getElementById('medalsUnlockedCount');
        const grid = document.getElementById('medalsGridContainer');

        if (nameEl) nameEl.textContent = pName;
        if (rankTitleEl) {
            rankTitleEl.textContent = rank.title;
            rankTitleEl.style.color = rank.color;
        }
        if (rankStarsEl) {
            rankStarsEl.textContent = '★'.repeat(rank.stars);
            rankStarsEl.style.color = rank.color;
        }
        if (winrateEl) winrateEl.textContent = this.dossier.getWinRate();
        if (battlesEl) battlesEl.textContent = d.totalBattles;
        if (winsEl) winsEl.textContent = d.wins;
        if (atomsEl) atomsEl.textContent = d.totalAtomsPlaced;
        if (maxChainEl) maxChainEl.textContent = `${d.maxChainReaction} موجات`;
        if (countBadge) countBadge.textContent = `${d.unlockedMedals.length} / ${this.dossier.medalsDefinition.length} مفتوح`;

        if (grid) {
            grid.innerHTML = '';
            this.dossier.medalsDefinition.forEach(m => {
                const isUnlocked = d.unlockedMedals.includes(m.id);
                const card = document.createElement('div');
                card.className = `medal-card ${isUnlocked ? 'medal-card--unlocked' : 'medal-card--locked'}`;
                card.style.setProperty('--medal-color', m.color);

                card.innerHTML = `
                    <div class="medal-icon-circle">
                        <i class="fa-solid ${isUnlocked ? m.icon : 'fa-lock'}"></i>
                    </div>
                    <div class="medal-info">
                        <span class="medal-title">${m.title} ${isUnlocked ? '✓' : ''}</span>
                        <span class="medal-desc">${m.desc}</span>
                    </div>
                `;
                grid.appendChild(card);
            });
        }
    }

    selectCardsSubMode(subId) {
        if (this.inBattle) {
            this.setWaveStatus('🔒 النمط التكتيكي مقفل أثناء المعركة! لتغيير الطور عد إلى غرفة العمليات التكتيكية.', 'amber');
            return;
        }
        if (typeof cardsModeInstance !== 'undefined' && cardsModeInstance) {
            cardsModeInstance.setSubMode(subId);
            this.syncCardsSubModeUI();
            this.updateSetupSummaryUI();
            this.updateModeUI();

            const subObj = cardsModeInstance.availableSubModes.find(m => m.id === subId);
            const subTitle = subObj ? subObj.name : subId;
            if (this.haptic) this.haptic.onAtomPlaced();
            this.sound.playShieldDeploy();
            this.showWelcomeToast(`تم اختيار: ${subTitle}`);
        }
    }

    syncCardsSubModeUI() {
        const curSub = (typeof cardsModeInstance !== 'undefined' && cardsModeInstance)
            ? cardsModeInstance.getSubMode()
            : 'standard';

        if (this.setupSubmodeCards) {
            this.setupSubmodeCards.forEach(card => {
                card.classList.toggle('setup-submode-card--active', card.dataset.submode === curSub);
            });
        }

        if (this.blitzTimerBadge) {
            if (curSub === 'blitz' && this.inBattle) {
                this.blitzTimerBadge.classList.remove('hidden');
            } else {
                this.blitzTimerBadge.classList.add('hidden');
            }
        }
    }

    handleTurnTransition(nextPlayer) {
        const isCards = (this.config.gameMode === 'advanced');
        const isBlitz = isCards && typeof cardsModeInstance !== 'undefined' && cardsModeInstance.isBlitz();

        this.stopBlitzTimer();

        if (isBlitz && this.inBattle && this.engine && !this.engine.isGameOver && nextPlayer) {
            const isLocal = (!this.isOnlineMatch && !nextPlayer.isAI) || (this.isOnlineMatch && nextPlayer.id === this.localPlayerId);
            if (isLocal) {
                this.startBlitzTimer();
            }
        }
    }

    startBlitzTimer() {
        this.stopBlitzTimer();
        this.blitzSecondsLeft = 6;
        if (this.blitzTimerBadge) {
            this.blitzTimerBadge.classList.remove('hidden', 'blitz-timer-badge--critical');
        }
        if (this.blitzSecondsVal) {
            this.blitzSecondsVal.textContent = this.blitzSecondsLeft;
        }

        this.blitzInterval = setInterval(() => {
            if (!this.inBattle || this.isAnimating || (this.engine && this.engine.isGameOver)) {
                this.stopBlitzTimer();
                return;
            }

            this.blitzSecondsLeft--;
            if (this.blitzSecondsVal) {
                this.blitzSecondsVal.textContent = Math.max(0, this.blitzSecondsLeft);
            }

            if (this.blitzSecondsLeft <= 2) {
                if (this.blitzTimerBadge) this.blitzTimerBadge.classList.add('blitz-timer-badge--critical');
                if (this.haptic) this.haptic.vibrate(20);
            }

            if (this.blitzSecondsLeft <= 0) {
                this.stopBlitzTimer();
                this.triggerBlitzAutoMove();
            }
        }, 1000);
    }

    stopBlitzTimer() {
        if (this.blitzInterval) {
            clearInterval(this.blitzInterval);
            this.blitzInterval = null;
        }
        if (this.blitzTimerBadge) {
            this.blitzTimerBadge.classList.remove('blitz-timer-badge--critical');
            if (typeof cardsModeInstance !== 'undefined' && !cardsModeInstance.isBlitz()) {
                this.blitzTimerBadge.classList.add('hidden');
            }
        }
    }

    triggerBlitzAutoMove() {
        if (!this.inBattle || this.isAnimating || !this.engine || this.engine.isGameOver) return;
        this.setWaveStatus('⚡ نفاد وقت الصاعقة (6 ثوانٍ)! تنفيذ انتشار نووي اضطراري سريع...', 'rose');

        const aiMove = this.engine.computeBestAIMove();
        if (aiMove) {
            this.processPlayerMove(aiMove.r, aiMove.c, aiMove.atomCount || 1, aiMove.actionType || 'atom', false);
        } else {
            const nextP = this.engine.skipTurnSafely();
            this.updateTurnIndicator();
            this.renderBoardState(this.engine.board);
            this.renderScoreboard(this.engine.players);
            this.handleTurnTransition(nextP);
            this.checkAndTriggerAITurn();
        }
    }

    async checkMeltdownHazard() {
        if (!this.engine || !this.inBattle || this.engine.isGameOver) return;

        if (this.hazardCell) {
            this.hazardCell.turnsLeft--;
            if (this.hazardCell.turnsLeft <= 0) {
                const targetR = this.hazardCell.r;
                const targetC = this.hazardCell.c;
                this.hazardCell = null;

                this.setWaveStatus(`🌋 انفجار بؤرة الانصهار النووي في الإحداثيات [${targetR + 1}, ${targetC + 1}]!`, 'rose');
                this.sound.playFissionWave(2);
                if (this.haptic) this.haptic.onExplosion();

                const meltRes = this.engine.triggerMeltdownAt(targetR, targetC);
                if (meltRes && meltRes.triggered) {
                    if (meltRes.waves && meltRes.waves.length > 0) {
                        for (let i = 0; i < meltRes.waves.length; i++) {
                            const wave = meltRes.waves[i];
                            await this.animateExplosionWave(wave, meltRes.player);
                            this.renderBoardState(wave.boardSnapshot);
                            this.renderScoreboard(wave.playersSnapshot);
                        }
                    } else {
                        this.renderBoardState(this.engine.board);
                        this.renderScoreboard(this.engine.players);
                    }
                }
                return;
            } else {
                this.renderBoardState(this.engine.board);
                return;
            }
        }

        if (!this.hazardCell && this.engine.turnNumber >= 2 && (this.engine.turnNumber % 2 === 0 || Math.random() < 0.45)) {
            const cand = this.engine.pickMeltdownCandidate();
            if (cand) {
                this.hazardCell = { r: cand.r, c: cand.c, turnsLeft: 2 };
                this.renderBoardState(this.engine.board);
                this.setWaveStatus(`⚠️ إنذار انصهار: بؤرة حرارية حرجة في [${cand.r + 1}, ${cand.c + 1}] ستنفجر بعد دورتين!`, 'amber');
                this.sound.playControlRodAbsorb();
            }
        }
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
