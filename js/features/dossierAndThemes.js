/**
 * ============================================================================
 * الحرب الذرية (Atomic War) - مدير ملف القائد، الأنواط، الاهتزاز، والثيمات
 * مسار الملف: js/features/dossierAndThemes.js
 * ============================================================================
 */

/**
 * 1. نظام الاهتزاز اللمسي (Haptic Feedback) مع وسيلة إلغائه وحفظ التفضيل
 */
class HapticFeedbackManager {
    constructor() {
        this.enabled = this.loadPreference();
    }

    loadPreference() {
        try {
            const val = localStorage.getItem('atomic_war_haptic_enabled');
            return val === null ? true : val === 'true';
        } catch (e) {
            return true;
        }
    }

    toggle(state = null) {
        this.enabled = state !== null ? state : !this.enabled;
        try {
            localStorage.setItem('atomic_war_haptic_enabled', this.enabled ? 'true' : 'false');
        } catch (e) {}
        if (this.enabled) {
            this.vibrate(25);
        }
        return this.enabled;
    }

    vibrate(pattern) {
        if (!this.enabled) return;
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            try {
                navigator.vibrate(pattern);
            } catch (e) {}
        }
    }

    onAtomPlaced() {
        this.vibrate(15);
    }

    onExplosion() {
        this.vibrate([35, 20, 35]);
    }

    onChainReaction(chainLength = 2) {
        if (chainLength >= 6) {
            this.vibrate([40, 20, 60, 20, 90]);
        } else {
            this.vibrate([25, 20, 35]);
        }
    }

    onVictory() {
        this.vibrate([60, 40, 60, 40, 120]);
    }
}

/**
 * 2. نظام الثيمات المتقدمة المطبقة فوق الثيم الحالي
 */
class ThemeManager {
    constructor() {
        this.themes = [
            { id: 'emerald', name: 'المفاعل الزمردي (الأصلي)', icon: 'fa-atom', color: '#10b981' },
            { id: 'cyberpunk', name: 'السايبربانك النيوني (Cyberpunk)', icon: 'fa-bolt', color: '#f43f5e' },
            { id: 'retro', name: 'تيرمينال الرادار (Retro CRT)', icon: 'fa-terminal', color: '#22c55e' },
            { id: 'deepcore', name: 'قلب المفاعل الجليدي (Deep Core)', icon: 'fa-snowflake', color: '#38bdf8' }
        ];
        this.currentTheme = this.loadTheme();
        this.applyTheme(this.currentTheme, false);
    }

    loadTheme() {
        try {
            const saved = localStorage.getItem('atomic_war_selected_theme');
            if (saved && this.themes.some(t => t.id === saved)) {
                return saved;
            }
        } catch (e) {}
        return 'emerald';
    }

    setTheme(themeId) {
        if (this.themes.some(t => t.id === themeId)) {
            this.currentTheme = themeId;
            try {
                localStorage.setItem('atomic_war_selected_theme', themeId);
            } catch (e) {}
            this.applyTheme(themeId, true);
            return true;
        }
        return false;
    }

    cycleTheme() {
        const currentIdx = this.themes.findIndex(t => t.id === this.currentTheme);
        const nextTheme = this.themes[(currentIdx + 1) % this.themes.length];
        this.setTheme(nextTheme.id);
        return nextTheme;
    }

    applyTheme(themeId, notify = false) {
        if (typeof document === 'undefined') return;
        document.body.classList.remove('theme-cyberpunk', 'theme-retro', 'theme-deepcore');
        if (themeId !== 'emerald') {
            document.body.classList.add(`theme-${themeId}`);
        }
    }

    getCurrentThemeObj() {
        return this.themes.find(t => t.id === this.currentTheme) || this.themes[0];
    }
}

/**
 * 3. ملف القائد والأنواط النووية الشرفية (Commander Dossier & Medals)
 */
class CommanderDossier {
    constructor() {
        this.STORAGE_KEY = 'atomic_war_commander_dossier';
        this.data = this.loadData();

        this.medalsDefinition = [
            {
                id: 'first_strike',
                title: 'الشرارة الأولى',
                desc: 'تحقيق أول انتصار نووي لك وسحق قوى الخصوم',
                icon: 'fa-certificate',
                color: '#10b981'
            },
            {
                id: 'mega_reaction',
                title: 'الانشطار العظيم',
                desc: 'إشعال سلسلة تفاعل متسلسلة تبتلع 6 غرف أو أكثر في خطوة واحدة',
                icon: 'fa-explosion',
                color: '#f59e0b'
            },
            {
                id: 'iron_core',
                title: 'حصن التيتانيوم',
                desc: 'الفوز بمباراة مع تثبيت قضبان تحكم ومهدئات نووية واقية',
                icon: 'fa-shield-halved',
                color: '#38bdf8'
            },
            {
                id: 'blitz_master',
                title: 'صاعقة اليورانيوم',
                desc: 'تحقيق النصر في طور الصاعقة الذرية السريع (Blitz)',
                icon: 'fa-bolt',
                color: '#fbbf24'
            },
            {
                id: 'meltdown_survivor',
                title: 'قاهر الانصهار',
                desc: 'الفوز بمباراة في طور الانصهار النووي المتقلب',
                icon: 'fa-fire-flame-curved',
                color: '#f43f5e'
            },
            {
                id: 'diagonal_storm',
                title: 'العاصفة القطرية',
                desc: 'تحقيق السيطرة التامة في طور الانشطار القطري ثماني الاتجاهات',
                icon: 'fa-arrows-split-up-and-left',
                color: '#a855f7'
            },
            {
                id: 'siege_breaker',
                title: 'كاسر الحصار',
                desc: 'الفوز بمعركة ملحمية في طور حصار المفاعل',
                icon: 'fa-dungeon',
                color: '#ec4899'
            },
            {
                id: 'grand_marshal',
                title: 'المارشال النووي الأعلى',
                desc: 'تحقيق 10 انتصارات نووية تاريخية وفرض الهيمنة المطلقة',
                icon: 'fa-crown',
                color: '#eab308'
            }
        ];
    }

    loadData() {
        const defaultData = {
            totalBattles: 0,
            wins: 0,
            losses: 0,
            totalAtomsPlaced: 0,
            maxChainReaction: 0,
            blitzWins: 0,
            meltdownWins: 0,
            diagonalWins: 0,
            siegeWins: 0,
            controlRodsUsed: 0,
            energyDrainsUsed: 0,
            unlockedMedals: []
        };
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                return Object.assign(defaultData, JSON.parse(raw));
            }
        } catch (e) {}
        return defaultData;
    }

    save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {}
    }

    recordAtomPlacement() {
        this.data.totalAtomsPlaced++;
        this.save();
    }

    recordControlRod() {
        this.data.controlRodsUsed++;
        this.save();
    }

    recordEnergyDrain() {
        this.data.energyDrainsUsed++;
        this.save();
    }

    recordChainReaction(chainLength) {
        if (chainLength > this.data.maxChainReaction) {
            this.data.maxChainReaction = chainLength;
        }
        if (chainLength >= 6) {
            this.unlockMedal('mega_reaction');
        }
        this.save();
    }

    recordBattleOutcome(won, gameMode = 'normal', subMode = 'standard') {
        this.data.totalBattles++;
        const newlyUnlocked = [];

        if (won) {
            this.data.wins++;

            // التحقق من الأنواط
            const m1 = this.unlockMedal('first_strike');
            if (m1) newlyUnlocked.push(m1);

            if (this.data.wins >= 10) {
                const mCrown = this.unlockMedal('grand_marshal');
                if (mCrown) newlyUnlocked.push(mCrown);
            }

            if (this.data.controlRodsUsed > 0) {
                const mRod = this.unlockMedal('iron_core');
                if (mRod) newlyUnlocked.push(mRod);
            }

            if (subMode === 'blitz') {
                this.data.blitzWins++;
                const mBlitz = this.unlockMedal('blitz_master');
                if (mBlitz) newlyUnlocked.push(mBlitz);
            } else if (subMode === 'meltdown') {
                this.data.meltdownWins++;
                const mMelt = this.unlockMedal('meltdown_survivor');
                if (mMelt) newlyUnlocked.push(mMelt);
            } else if (subMode === 'diagonal') {
                this.data.diagonalWins++;
                const mDiag = this.unlockMedal('diagonal_storm');
                if (mDiag) newlyUnlocked.push(mDiag);
            } else if (subMode === 'siege') {
                this.data.siegeWins++;
                const mSiege = this.unlockMedal('siege_breaker');
                if (mSiege) newlyUnlocked.push(mSiege);
            }
        } else {
            this.data.losses++;
        }

        this.save();
        return newlyUnlocked;
    }

    unlockMedal(medalId) {
        if (!this.data.unlockedMedals.includes(medalId)) {
            this.data.unlockedMedals.push(medalId);
            this.save();
            return this.medalsDefinition.find(m => m.id === medalId);
        }
        return null;
    }

    getRank() {
        const w = this.data.wins;
        if (w >= 10) return { title: 'مارشال القوى الذرية الأعلى', stars: 5, color: '#eab308' };
        if (w >= 6)  return { title: 'عقيد الانشطار النووي', stars: 4, color: '#f43f5e' };
        if (w >= 3)  return { title: 'رائد النيوترونات التكتيكي', stars: 3, color: '#38bdf8' };
        if (w >= 1)  return { title: 'نقيب المفاعل الذري', stars: 2, color: '#10b981' };
        return { title: 'ملازم إشعاعي مستجد', stars: 1, color: '#94a3b8' };
    }

    getWinRate() {
        if (this.data.totalBattles === 0) return '0%';
        return `${Math.round((this.data.wins / this.data.totalBattles) * 100)}%`;
    }
}

if (typeof window !== 'undefined') {
    window.HapticFeedbackManager = HapticFeedbackManager;
    window.ThemeManager = ThemeManager;
    window.CommanderDossier = CommanderDossier;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HapticFeedbackManager, ThemeManager, CommanderDossier };
}
