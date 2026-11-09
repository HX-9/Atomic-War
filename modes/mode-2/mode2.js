/**
 * ============================================================================
 * الحرب الذرية (Atomic War) - وضع 2 (Mode 2) [مغلق حالياً - جاهز للتطوير]
 * مسار الملف: modes/mode-2/mode2.js
 * نموذج أولي مهيأ برمجياً لإضافة القواعد الخاصة بالوضع الثاني مستقبلاً
 * ============================================================================
 */
class Mode2 extends (typeof BaseGameMode !== 'undefined' ? BaseGameMode : Object) {
    constructor() {
        super('mode2', 'وضع 2', true);
        this.id = 'mode2';
        this.name = 'وضع 2';
        this.isLocked = true;
    }

    getOpeningAtoms() {
        return 1;
    }

    hasOpeningShield() {
        return false;
    }

    getRuleDescription() {
        return 'وضع 2 مغلق حالياً وسيتوفر في التحديثات القادمة بميكانيكا لعب جديدة.';
    }

    isValidMove(engine, r, c, playerId) {
        return false;
    }
}

const mode2Instance = new Mode2();
if (typeof registerGameMode === 'function') {
    registerGameMode(mode2Instance);
}

if (typeof window !== 'undefined') {
    window.Mode2 = Mode2;
    window.mode2Instance = mode2Instance;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Mode2, mode2Instance };
}
