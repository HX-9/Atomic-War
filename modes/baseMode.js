/**
 * ============================================================================
 * الحرب الذرية (Atomic War) - الفئة الأساسية لأوضاع اللعب (BaseGameMode)
 * مسار الملف: modes/baseMode.js
 * تحدد العقد البرمجي والقواعد المشتركة لجميع أوضاع المعارك النووية
 * ============================================================================
 */
class BaseGameMode {
    constructor(id = 'base', name = 'الوضع الأساسي', isLocked = false) {
        this.id = id;
        this.name = name;
        this.isLocked = isLocked;
    }

    /**
     * عدد الذرات التي يتم تلقيمها في الحركة الافتتاحية للاعب
     */
    getOpeningAtoms() {
        return 3;
    }

    /**
     * هل يحصل اللاعب على درع طاقة واقٍ في الضربة الافتتاحية
     */
    hasOpeningShield() {
        return true;
    }

    /**
     * نص القواعد التفصيلي للوضع المعروض في نافذة القواعد
     */
    getRuleDescription() {
        return '';
    }

    /**
     * التحقق من صلاحية وضع الذرة وفقاً لقواعد الوضع الخاص
     * @param {AtomicWarsEngine} engine مرجع لمحرك اللعبة
     * @param {number} r رقم الصف
     * @param {number} c رقم العمود
     * @param {number} playerId معرّف اللاعب
     * @param {number} atomCount عدد الذرات
     * @param {string|null} actionType نوع الإجراء
     */
    isValidMove(engine, r, c, playerId, atomCount = 1, actionType = 'atom') {
        return true;
    }

    /**
     * مكافأة التوسع الخاصة بالذكاء الاصطناعي في هذا الوضع
     */
    getAiExpansionBonus() {
        return 4;
    }
}

// سجل الأوضاع المتاحة باللعبة
if (typeof GAME_MODES === 'undefined') {
    var GAME_MODES = {};
}

function registerGameMode(modeInstance) {
    if (typeof GAME_MODES !== 'undefined') {
        GAME_MODES[modeInstance.id] = modeInstance;
    }
}

if (typeof window !== 'undefined') {
    window.BaseGameMode = BaseGameMode;
    window.GAME_MODES = GAME_MODES;
    window.registerGameMode = registerGameMode;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BaseGameMode, GAME_MODES, registerGameMode };
}
