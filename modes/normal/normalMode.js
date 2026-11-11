/**
 * ============================================================================
 * الحرب الذرية (Atomic War) - الوضع العادي (NormalGameMode)
 * مسار الملف: modes/normal/normalMode.js
 * القواعد:
 * 1. ضربة افتتاحية بـ 3 ذرات لتأسيس قلعة نووية محمية بدرع 3×3.
 * 2. السعة القصوى لجميع الغرف (الزوايا، الأطراف، والقلب) موحدة = 3 ذرات، وتنفجر عند الذرة 4.
 * 3. ضياع وتطاير الذرات الزائدة المنقذفة خارج حدود الرقعة عند انفجار الزوايا والأطراف.
 * 4. بعد الجولة الأولى، لا يمكن وضع ذرات في غرف فارغة؛ التوسع يتم بالانشطار والتلقيم الداخلي فقط.
 * ============================================================================
 */
class NormalGameMode extends (typeof BaseGameMode !== 'undefined' ? BaseGameMode : Object) {
    constructor() {
        super('normal', 'الوضع العادي', false);
        this.id = 'normal';
        this.name = 'الوضع العادي';
        this.isLocked = false;
    }

    getOpeningAtoms() {
        return 3;
    }

    hasOpeningShield() {
        return true;
    }

    hasUniformCriticalMass() {
        return true;
    }

    getRuleDescription() {
        return 'يبدأ كل لاعب دورته الأولى بوضع <strong>ذرة ثلاثية (3 ذرات مشعة)</strong> في أي غرفة فارغة لتأسيس قلعته النووية المحمية بدرع 3×3. في <strong>الوضع العادي</strong>، تتسع جميع الغرف (الزوايا، الأطراف، والقلب) لـ <strong>3 ذرات كحد أقصى وتنفجر عند الذرة الرابعة</strong> دون أي اختلاف بينها، مع <strong>ضياع الذرات المنقذفة خارج حواف الرقعة</strong> في الفضاء عند انفجار الغرف الطرفية والزوايا. بعد الجولة الأولى، يتم وضع الذرات في غرفك الخاصة فقط والتوسع عبر الانشطار المتسلسل.';
    }

    isValidMove(engine, r, c, playerId, atomCount = 1, actionType = 'atom') {
        const player = engine.players[playerId];
        const cell = engine.board[r][c];
        // بعد أن يلعب اللاعب دورته الأولى، يُحظر عليه وضع الذرة في غير غرفه الخاصة
        if (player && player.hasPlayed) {
            if (cell.owner !== playerId) {
                return false;
            }
        }
        return true;
    }

    getAiExpansionBonus() {
        return 9;
    }
}

const normalModeInstance = new NormalGameMode();
if (typeof registerGameMode === 'function') {
    registerGameMode(normalModeInstance);
}

if (typeof window !== 'undefined') {
    window.NormalGameMode = NormalGameMode;
    window.normalModeInstance = normalModeInstance;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NormalGameMode, normalModeInstance };
}
