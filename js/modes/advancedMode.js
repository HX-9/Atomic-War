/**
 * ============================================================================
 * الحرب الذرية (Atomic War) - وضع البطاقات الذرية (AdvancedGameMode)
 * القواعد والميزات الاستراتيجية المتقدمة:
 * 1. نظام "رصيد النيوترونات (Neutron Reserve)":
 *    - البداية من 0، والضربة الافتتاحية مجانية (ذرة ثلاثية مع درع 3×3).
 *    - تجدد +2 نيوترون في بداية كل دور (حد أقصى 10).
 * 2. تكاليف الذرات والتغذية:
 *    - تغذية ذرة قائمة: 1 نيوترون (+1 ذرة).
 *    - إلقاء ذرة خارجية في غرفة فارغة: (المستوى 1: ⚡2، المستوى 2: ⚡4، المستوى 3: ⚡6).
 *    - قاعدة الانفصال: الذرات الخارجية توضع في الأماكن الفارغة فقط، ولا تدمج في أي ذرة قائمة.
 * 3. درع الطاقة النووي الواقي (Control Rod / Shield):
 *    - تكلفة ⚡5 نيوترونات: يُثبت على غرفة مملوكة لامتصاص الانفجارات القادمة وكسر السلاسل.
 * 4. مقاومة النواة الثلاثية (Triple Atom Resistance):
 *    - الذرة الثلاثية فقط (3 ذرات) تقاوم مقذوف الخصم الفردي وتمتصه فتتحول إلى أحادية (3 ➔ 1) بدلاً من السقوط أو الانفجار الفوري.
 *    - خلايا الزاوية والأطراف الثنائية والأحادية تعامل بالمعاملة العادية ولا تمتلك هذه المقاومة.
 * ============================================================================
 */
class AdvancedGameMode extends (typeof BaseGameMode !== 'undefined' ? BaseGameMode : Object) {
    constructor() {
        super('advanced', 'البطاقات الذرية', false);
        this.id = 'advanced';
        this.name = 'البطاقات الذرية';
        this.isLocked = false;
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
        return 5;
    }

    getEnergyDrainCost() {
        return 3;
    }

    getRuleDescription() {
        return 'يبدأ كل لاعب بوضع <strong>ذرة ثلاثية مجانية</strong> في غرفة فارغة محمية بدرع 3×3 طوال الجولة الأولى. بعدها يتفعل <strong>نظام رصيد النيوترونات</strong> (+2 نيوترون كل دور، حد أقصى 10): تغذية غرفتك تكلف 1 نيوترون، وإلقاء الذرات الخارجية من الترسانة في الغرف الفارغة يكلف (3 للأحادية، 6 للثنائية، و9 للثلاثية). وتتضمن <strong>بطاقات المساعدة</strong>: تثبيت <strong>درع نووي واقٍ</strong> بـ 5 نيوترونات، أو شن هجوم <strong>إخماد طاقة</strong> بـ 3 نيوترونات لإرجاع ذرة الخصم لمستواها الأول، وتتمتع <strong>الذرات الثلاثية فقط</strong> بمقاومة دفاعية ضد السقوط من أول ضربة (تتحول إلى أحادية 3 ➔ 1).';
    }

    /**
     * التحقق من حركة وضع البطاقات الذرية بناءً على نوع الخلية والذرات أو بطاقات المساعدة
     * @param {AtomicWarsEngine} engine 
     * @param {number} r 
     * @param {number} c 
     * @param {number} playerId 
     * @param {number} atomCount عدد الذرات المراد إلقاؤها (1, 2, 3)
     * @param {string} actionType نوع الإجراء ('atom', 'controlRod', 'energyDrain')
     */
    isValidMove(engine, r, c, playerId, atomCount = 1, actionType = 'atom') {
        const player = engine.players[playerId];
        const cell = engine.board[r][c];

        // 1. إجراء تثبيت الدرع النووي (بطاقة مساعدة)
        if (actionType === 'controlRod') {
            if (!player.hasPlayed) return false;
            // يمكن وضعه فقط على غرفة مملوكة للاعب وليست محمية بدرع مسبقاً
            if (cell.owner !== playerId || cell.hasControlRod) return false;
            return (player.neutrons || 0) >= this.getControlRodCost();
        }

        // 2. إجراء هجوم إخماد طاقة ذرة معادية (بطاقة مساعدة)
        if (actionType === 'energyDrain') {
            if (!player.hasPlayed) return false;
            // يجب أن تكون الخلية مملوكة لخصم وبها أكثر من ذرة واحدة (لإرجاعها إلى المستوى الأول)
            if (cell.owner === null || cell.owner === playerId) return false;
            if (cell.atoms <= 1) return false;
            if (engine.isInsideOpponentShieldZone(r, c, playerId) || cell.hasShield) return false;
            return (player.neutrons || 0) >= this.getEnergyDrainCost();
        }

        // 3. الضربة الافتتاحية: ذرة ثلاثية في أي غرفة فارغة
        if (!player.hasPlayed) {
            return cell.owner === null;
        }

        // 4. إذا كانت هناك بطاقة عناصر محددة (actionType === 'atom'):
        // قاعدة صارمة: بطاقات العناصر توضع في الأماكن الفارغة فقط، ولا يمكن دمجها أو إلقاؤها فوق ذرة قائمة (حليفة أو معادية).
        if (actionType === 'atom') {
            if (cell.owner === null) {
                const cost = this.getExternalAtomCost(atomCount);
                return (player.neutrons || 0) >= cost;
            }
            return false;
        }

        // 5. إذا لم يكن هناك بطاقة محددة (actionType === null أو 'feed'):
        // قاعدة: "إضافة ذرة داخل ذرة حليفة يتم فقط إذا لم يكن اللاعب محدد بطاقات"
        if (actionType === null || actionType === 'feed') {
            if (cell.owner === playerId) {
                return (player.neutrons || 0) >= 1;
            }
            return false;
        }

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
