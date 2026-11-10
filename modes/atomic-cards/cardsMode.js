/**
 * ============================================================================
 * الحرب الذرية (Atomic War) - وضع البطاقات الذرية المطور (CardsGameMode)
 * مسار الملف: modes/atomic-cards/cardsMode.js
 * ============================================================================
 * القواعد والميزات الاستراتيجية:
 * 1. نظام رصيد النيوترونات التكتيكي المتجدد كل دور + مكافأة السلاسل الانشطارية.
 * 2. بطاقات العناصر (أحادية ⚡3، ثنائية ⚡6، ثلاثية ⚡9 في الفراغ فقط).
 * 3. بطاقات المساعدة:
 *    - درع نووي واقٍ (Control Rod) يمتص الانفجارات والهجمات المعادية.
 *    - إخماد طاقة ذرة معادية (Energy Drain) لإرجاعها للمستوى الأول (1 ذرة).
 *    - مقاومة النواة الثلاثية (3 ➔ 1 عند تلقي انشطار معادٍ).
 * 4. الأطوار التكتيكية الخمسة (تُختار في صفحة تجهيز المعركة قبل البدء وتُقفل أثناء اللعب):
 *    - 🎯 القياسي التكتيكي (standard): القواعد المتوازنة لنظام البطاقات والنيوترونات.
 *    - ⚡ الصاعقة الذرية (blitz): مؤقت 6 ثوانٍ لكل دور + شحن نيوترونات سريع (+3⚡).
 *    - 🌋 انصهار القلب (meltdown): بؤر حرجة تسخن في المفاعل وتنفجر تلقائياً بموجات بيئية.
 *    - 🔀 المصفوفة القطرية (diagonal): انشطار ثماني الاتجاهات (أفقي ورأسي وقطري).
 *    - 🏰 حصار المفاعل (siege): تمركز بالأطراف للسيطرة على قلعة المركز (+2⚡ كل دور) وخصم تكلفة الدروع والإخماد.
 * ============================================================================
 */
class CardsGameMode extends (typeof BaseGameMode !== 'undefined' ? BaseGameMode : Object) {
    constructor() {
        super('advanced', 'البطاقات الذرية', false);
        this.id = 'advanced';
        this.name = 'البطاقات الذرية';
        this.isLocked = false;

        // الطور التكتيكي الفرعي المختار (يُحدد في صفحة التجهيز قبل بدء المعركة)
        // 'standard' | 'blitz' | 'meltdown' | 'diagonal' | 'siege'
        this.subMode = 'standard';

        // قائمة الأطوار المتاحة داخل وضع البطاقات الذرية
        this.availableSubModes = [
            {
                id: 'standard',
                name: 'القياسي التكتيكي',
                shortName: 'قياسي',
                icon: 'fa-layer-group',
                badgeColor: '#38bdf8',
                desc: 'النمط الاستراتيجي المتوازن: +2⚡ نيوترون كل دور، 5 بطاقات تكتيكية، ومقاومة القلاع الثلاثية.',
                specs: ['+2⚡ كل دور (حد أقصى 10)', 'انشطار رباعي الاتجاهات', 'جميع البطاقات بالتكلفة القياسية']
            },
            {
                id: 'blitz',
                name: 'الصاعقة الذرية',
                shortName: 'صاعقة ⚡',
                icon: 'fa-bolt',
                badgeColor: '#f59e0b',
                desc: 'معركة فائقة السرعة: مؤقت صارم 6 ثوانٍ لكل دور مع تدفق طاقة نيوترونية معزز (+3⚡ كل دور).',
                specs: ['مؤقت 6 ثوانٍ لكل حركة', '+3⚡ كل دور (حد أقصى 12)', 'حركة تلقائية ذكية عند انتهاء الوقت']
            },
            {
                id: 'meltdown',
                name: 'انصهار القلب',
                shortName: 'انصهار 🌋',
                icon: 'fa-fire-flame-curved',
                badgeColor: '#f43f5e',
                desc: 'مفاعل غير مستقر: تظهر بؤر انصهار حرارية كل جولتين وتنفجر تلقائياً مسببة تفاعلات متسلسلة!',
                specs: ['إنذار انصهار قبل الانفجار بدورين', 'انفجار بيئي مستقل لا يستهلك دورك', '+2⚡ كل دور مع مكافأة السلاسل']
            },
            {
                id: 'diagonal',
                name: 'المصفوفة القطرية',
                shortName: 'قطري 🔀',
                icon: 'fa-arrows-split-up-and-left',
                badgeColor: '#a855f7',
                desc: 'هندسة انشطار ثمانية الاتجاهات: تنطلق الشظايا الذرية أفقياً ورأسياً وقطرياً عبر الزوايا!',
                specs: ['انشطار في 8 اتجاهات كاملة', 'الكتلة الحرجة: 3 زوايا، 4 حواف، 5 وسط', 'سلاسل انشطارية قطرية جارفة']
            },
            {
                id: 'siege',
                name: 'حصار المفاعل',
                shortName: 'حصار 🏰',
                icon: 'fa-chess-rook',
                badgeColor: '#10b981',
                desc: 'معركة السيطرة على القلب: ابدأ من أطراف المفاعل وتقدم للسيطرة على قلعة المركز المحصنة بالدروع!',
                specs: ['قلعة المركز تمنح +2⚡ إضافية كل دور', 'درع نووي بـ 3⚡ وإخماد طاقة بـ 2⚡', 'الضربة الافتتاحية على المحيط الخارجي']
            }
        ];
    }

    setSubMode(subId) {
        if (this.availableSubModes.some(m => m.id === subId)) {
            this.subMode = subId;
            return true;
        }
        this.subMode = 'standard';
        return false;
    }

    getSubMode() {
        return this.subMode;
    }

    getSubModeInfo(subId = this.subMode) {
        return this.availableSubModes.find(m => m.id === subId) || this.availableSubModes[0];
    }

    isBlitz() {
        return this.subMode === 'blitz';
    }

    isMeltdown() {
        return this.subMode === 'meltdown';
    }

    isDiagonal() {
        return this.subMode === 'diagonal';
    }

    isSiege() {
        return this.subMode === 'siege';
    }

    hasDiagonalFission() {
        return this.subMode === 'diagonal';
    }

    hasNeutronSystem() {
        return true;
    }

    getOpeningAtoms() {
        return 3;
    }

    getStartingNeutrons() {
        if (this.isBlitz()) return 3;
        if (this.isSiege()) return 4;
        return 2;
    }

    hasOpeningShield() {
        return true;
    }

    getNeutronPerTurn() {
        return this.isBlitz() ? 3 : 2;
    }

    getMaxNeutrons() {
        return this.isBlitz() ? 12 : 10;
    }

    getCitadelBonusNeutrons() {
        return this.isSiege() ? 2 : 0;
    }

    hasControlRodSystem() {
        return true;
    }

    hasFortressCoreResistance() {
        return true;
    }

    getExternalAtomCost(atomCount) {
        if (atomCount === 1) return 3;
        if (atomCount === 2) return 6;
        if (atomCount === 3) return 9;
        return 3;
    }

    getControlRodCost() {
        return this.isSiege() ? 3 : 5;
    }

    getEnergyDrainCost() {
        return this.isSiege() ? 2 : 3;
    }

    getBlitzTurnDurationSeconds() {
        return 6;
    }

    getRuleDescription() {
        const info = this.getSubModeInfo();
        const rodCost = this.getControlRodCost();
        const drainCost = this.getEnergyDrainCost();

        return `<strong>الطور النشط [${info.name}]:</strong> ${info.desc}<br>` +
            `• <strong>الضربة الافتتاحية:</strong> ذرة ثلاثية مجانية محمية بدرع 3×3 للجولة الأولى${this.isSiege() ? ' (توضع على الأطراف والمحيط في طور الحصار)' : ''}.<br>` +
            `• <strong>اقتصاد النيوترونات:</strong> يتجدد الرصيد بمقدار (+${this.getNeutronPerTurn()}⚡) كل دور، وتغذية غرفتك تكلف (1⚡).<br>` +
            `• <strong>البطاقات التكتيكية:</strong> إلقاء الذرات في الفراغ (⚡3، ⚡6، ⚡9)، تثبيت <strong>درع نووي واقٍ (🛡️ ${rodCost}⚡)</strong>، وهجوم <strong>إخماد طاقة (⚡ ${drainCost}⚡)</strong>.`;
    }

    /**
     * التحقق من صلاحية الحركة في وضع البطاقات الذرية وأطواره الفرعية
     */
    isValidMove(engine, r, c, playerId, atomCount = 1, actionType = 'atom') {
        const player = engine.players[playerId];
        const cell = engine.board[r][c];
        if (!player || !cell) return false;

        // 1. إجراء تثبيت الدرع النووي (بطاقة مساعدة)
        if (actionType === 'controlRod') {
            if (!player.hasPlayed) return false;
            if (cell.owner !== playerId || cell.hasControlRod) return false;
            return (player.neutrons || 0) >= this.getControlRodCost();
        }

        // 2. إجراء هجوم إخماد طاقة ذرة معادية (بطاقة مساعدة)
        if (actionType === 'energyDrain') {
            if (!player.hasPlayed) return false;
            if (cell.owner === null || cell.owner === playerId) return false;
            if (cell.atoms <= 1) return false;
            if (engine.isInsideOpponentShieldZone(r, c, playerId) || cell.hasShield) return false;
            return (player.neutrons || 0) >= this.getEnergyDrainCost();
        }

        // 3. الضربة الافتتاحية: ذرة ثلاثية في غرفة فارغة
        if (!player.hasPlayed) {
            if (cell.owner !== null) return false;
            // في طور الحصار (Siege): يجب أن تكون الضربة الافتتاحية خارج منطقة القلب المركزية (على المحيط أو الأطراف)
            if (this.isSiege()) {
                const centerR = Math.floor(engine.rows / 2);
                const centerC = Math.floor(engine.cols / 2);
                const distFromCenter = Math.max(Math.abs(r - centerR), Math.abs(c - centerC));
                if (distFromCenter <= 1) {
                    return false; // منطقة قلب المفاعل محظورة في الضربة الافتتاحية لطور الحصار
                }
            }
            return true;
        }

        // 4. بطاقات العناصر (actionType === 'atom') في الأماكن الفارغة فقط
        if (actionType === 'atom') {
            if (cell.owner === null) {
                const cost = this.getExternalAtomCost(atomCount);
                return (player.neutrons || 0) >= cost;
            }
            return false;
        }

        // 5. تغذية ذرة حليفة قائمة (actionType === null || actionType === 'feed')
        if (actionType === null || actionType === 'feed') {
            if (cell.owner === playerId) {
                return (player.neutrons || 0) >= 1;
            }
            return false;
        }

        return false;
    }

    getAiExpansionBonus() {
        if (this.isBlitz()) return 8;
        if (this.isDiagonal()) return 7;
        return 5;
    }
}

const cardsModeInstance = new CardsGameMode();
if (typeof registerGameMode === 'function') {
    registerGameMode(cardsModeInstance);
}

if (typeof window !== 'undefined') {
    window.CardsGameMode = CardsGameMode;
    window.AdvancedGameMode = CardsGameMode;
    window.cardsModeInstance = cardsModeInstance;
    window.advancedModeInstance = cardsModeInstance;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CardsGameMode, AdvancedGameMode: CardsGameMode, cardsModeInstance, advancedModeInstance: cardsModeInstance };
}
