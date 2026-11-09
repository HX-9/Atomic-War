/**
 * ============================================================================
 * الحرب الذرية (Atomic War) - الوضع المطور (AdvancedGameMode)
 * القواعد والميزات:
 * 1. نظام "رصيد النيوترونات (Neutron Reserve)":
 *    - يبدأ كل لاعب برصيد 0 نيوترون.
 *    - الضربة الافتتاحية (أول حركة): ذرة ثلاثية (3 ذرات) مع درع 3×3 مجاناً وبدون خيارات.
 *    - بدءاً من الدور التالي، يكتسب اللاعب +2 نيوترون في كل دور (الحد الأقصى 10).
 * 2. التكاليف والأفعال التكتيكية:
 *    - إضافة نيوترون إلى ذرة مملوكة (تغذية الغرفة): تكلفة 1 نيوترون فقط.
 *    - إلقاء ذرة خارجية من الترسانة في غرفة فارغة:
 *      * ذرة أحادية (المستوى 1): تكلفة 2 نيوترون (⚡ 2 n⁰).
 *      * ذرة ثنائية (المستوى 2): تكلفة 4 نيوترونات (⚡ 4 n⁰).
 *      * نواة ثلاثية (المستوى 3): تكلفة 6 نيوترونات (⚡ 6 n⁰).
 *    - قاعدة الانفصال: الذرات الخارجية توضع في الأماكن الفارغة فقط، ولا يمكن دمجها في أي ذرة قائمة!
 * ============================================================================
 */
class AdvancedGameMode extends (typeof BaseGameMode !== 'undefined' ? BaseGameMode : Object) {
    constructor() {
        super('advanced', 'الوضع المطور', false);
    }

    hasNeutronSystem() {
        return true;
    }

    getOpeningAtoms() {
        return 3;
    }

    hasOpeningShield() {
        return true;
    }

    getNeutronPerTurn() {
        return 2;
    }

    getMaxNeutrons() {
        return 10;
    }

    getExternalAtomCost(atomCount) {
        if (atomCount === 1) return 2;
        if (atomCount === 2) return 4;
        if (atomCount === 3) return 6;
        return 2;
    }

    getRuleDescription() {
        return 'يبدأ كل لاعب بوضع <strong>ذرة ثلاثية مجانية</strong> في غرفة فارغة محمية بدرع 3×3 طوال الجولة الأولى. بعدها يتفعل <strong>نظام رصيد النيوترونات</strong> (+2 نيوترون كل دور، حد أقصى 10): تغذية غرفتك تكلف 1 نيوترون، وإلقاء الذرات الخارجية من الترسانة في الغرف الفارغة يكلف (2 للأحادية، 4 للثنائية، و6 للثلاثية).';
    }

    /**
     * التحقق من حركة الوضع المطور بناءً على نوع الخلية والذرات الخارجية
     * @param {AtomicWarsEngine} engine 
     * @param {number} r 
     * @param {number} c 
     * @param {number} playerId 
     * @param {number} atomCount عدد الذرات المراد إلقاؤها (1, 2, 3)
     */
    isValidMove(engine, r, c, playerId, atomCount = 1) {
        const player = engine.players[playerId];
        const cell = engine.board[r][c];

        // 1. الضربة الافتتاحية: ذرة ثلاثية في أي غرفة فارغة
        if (!player.hasPlayed) {
            return cell.owner === null;
        }

        // 2. إذا كانت الغرفة فارغة: يُسمح بوضع ذرة خارجية بحسب تكلفة المستوى (2 للأحادية، 4 للثنائية، 6 للثلاثية)
        if (cell.owner === null) {
            const cost = this.getExternalAtomCost(atomCount);
            return (player.neutrons || 0) >= cost;
        }

        // 3. إذا كانت الغرفة مملوكة للاعب:
        // قاعدة صارمة: "لا يمكن دمج ذرة خارجية داخل أي ذرة، بل الذرات الخارجية توضع في مكان فارغ"
        // لذلك داخل الغرفة المملوكة، يُسمح فقط بتغذية نيوترونية واحدة (atomCount = 1) بتكلفة 1 نيوترون
        if (cell.owner === playerId) {
            if (atomCount > 1) {
                // لا يُسمح بإلقاء ذرات خارجية ثنائية أو ثلاثية فوق ذرات قائمة
                return false;
            }
            return (player.neutrons || 0) >= 1;
        }

        // 4. غرف الخصم محظورة
        return false;
    }

    getAiExpansionBonus() {
        return 5;
    }
}

const advancedModeInstance = new AdvancedGameMode();
if (typeof registerGameMode === 'function') {
    registerGameMode(advancedModeInstance);
}

if (typeof window !== 'undefined') {
    window.AdvancedGameMode = AdvancedGameMode;
    window.advancedModeInstance = advancedModeInstance;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AdvancedGameMode, advancedModeInstance };
}
