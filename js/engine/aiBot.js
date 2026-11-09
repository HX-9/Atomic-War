/**
 * ============================================================================
 * الحرب الذرية (Atomic War) - ذكاء المنافس الآلي (AtomicAIBot)
 * خوارزمية استراتيجية لتقييم الحركات واختيار أفضل خطة هجومية/دفاعية
 * مع دعم نظام رصيد النيوترونات التكتيكي في وضع البطاقات الذرية
 * ============================================================================
 */
class AtomicAIBot {
    /**
     * حساب أفضل حركة للذكاء الاصطناعي بناءً على حالة المفاعل
     * @param {AtomicWarsEngine} engine محرك اللعبة
     * @returns {{r: number, c: number, atomCount?: number}|null}
     */
    static computeBestMove(engine) {
        const aiId = engine.currentPlayerIndex;
        const player = engine.players[aiId];
        const isFirstMove = !player.hasPlayed;
        const hasNeutrons = engine.mode && typeof engine.mode.hasNeutronSystem === 'function' && engine.mode.hasNeutronSystem();
        const availableNeutrons = player.neutrons || 0;

        const candidateOptions = [];

        for (let r = 0; r < engine.rows; r++) {
            for (let c = 0; c < engine.cols; c++) {
                const cell = engine.board[r][c];

                if (isFirstMove) {
                    // في الضربة الأولى، يوضع فقط في الخلايا الفارغة بـ 3 ذرات
                    if (engine.isValidMove(r, c, aiId, 3)) {
                        candidateOptions.push({ r, c, atomCount: 3 });
                    }
                } else if (hasNeutrons) {
                    // في نظام النيوترونات:
                    if (cell.owner === aiId && availableNeutrons >= 1) {
                        // خيار تغذية خلية مملوكة بـ 1 نيوترون (بدون بطاقات)
                        if (engine.isValidMove(r, c, aiId, 1, 'feed')) {
                            candidateOptions.push({ r, c, atomCount: 1, actionType: 'feed' });
                        }
                        // خيار تثبيت درع نووي واقٍ (قضيب تحكم) بـ 5 نيوترونات
                        const rodCost = (engine.mode && typeof engine.mode.getControlRodCost === 'function') ? engine.mode.getControlRodCost() : 5;
                        if (!cell.hasControlRod && availableNeutrons >= rodCost && engine.isValidMove(r, c, aiId, 1, 'controlRod')) {
                            candidateOptions.push({ r, c, atomCount: 1, actionType: 'controlRod' });
                        }
                    } else if (cell.owner !== null && cell.owner !== aiId) {
                        // خيار شن هجوم إخماد طاقة ذرة معادية بـ 3 نيوترونات
                        const drainCost = (engine.mode && typeof engine.mode.getEnergyDrainCost === 'function') ? engine.mode.getEnergyDrainCost() : 3;
                        if (availableNeutrons >= drainCost && engine.isValidMove(r, c, aiId, 1, 'energyDrain')) {
                            candidateOptions.push({ r, c, atomCount: 1, actionType: 'energyDrain' });
                        }
                    } else if (cell.owner === null) {
                        // خيارات إلقاء ذرة خارجية في خلية فارغة بحسب رصيد النيوترونات (2 للأحادية، 4 للثنائية، 6 للثلاثية)
                        for (let count = 1; count <= 3; count++) {
                            if (engine.isValidMove(r, c, aiId, count, 'atom')) {
                                candidateOptions.push({ r, c, atomCount: count, actionType: 'atom' });
                            }
                        }
                    }
                } else {
                    // الوضع العادي (ذرة واحدة دائماً)
                    if (engine.isValidMove(r, c, aiId, 1, 'atom')) {
                        candidateOptions.push({ r, c, atomCount: 1, actionType: 'atom' });
                    }
                }
            }
        }

        if (candidateOptions.length === 0) return null;

        let bestScore = -Infinity;
        let bestCandidates = [];

        for (const option of candidateOptions) {
            const cell = engine.board[option.r][option.c];
            const neighbors = engine.getOrthogonalNeighbors(option.r, option.c);
            let score = 0;
            const atomsToAdd = option.atomCount || 1;

            const willExplode = (cell.atoms + atomsToAdd) >= cell.criticalMass;
            let enemyRisk = false;

            for (const n of neighbors) {
                const nCell = engine.board[n.row][n.col];
                if (nCell.owner !== null && nCell.owner !== aiId) {
                    const enemyReady = (nCell.atoms === nCell.criticalMass - 1);
                    if (willExplode) {
                        score += nCell.atoms * 16 + (enemyReady ? 30 : 12);
                    } else if (enemyReady) {
                        enemyRisk = true;
                        score -= 22;
                    }
                } else if (nCell.owner === null && willExplode) {
                    const expansionBonus = engine.mode && typeof engine.mode.getAiExpansionBonus === 'function'
                        ? engine.mode.getAiExpansionBonus()
                        : 4;
                    score += expansionBonus;
                }
            }

            if (isFirstMove) {
                if (cell.criticalMass === 4) {
                    score += 20; // قلب المفاعل لتأسيس قلعة ضخمة
                } else if (cell.criticalMass === 2) {
                    score += 12; // الزاوية
                } else {
                    score += 8;
                }
            } else {
                if (cell.owner === null) {
                    // مكافأة لترقية الذرة إلى ثنائية أو ثلاثية لإحداث انفجار فوري في زاوية أو طرف
                    if (willExplode) {
                        score += 24;
                    } else {
                        score += (atomsToAdd * 3);
                    }
                    if (cell.criticalMass === 2) score += 9;
                    else if (cell.criticalMass === 3) score += 5;
                } else if (option.actionType === 'controlRod') {
                    // تقييم جدوى تثبيت قضيب تحكم نووي (مهدئ) لحماية الغرفة من انفجارات وشيكة
                    let threatFound = false;
                    for (const n of neighbors) {
                        const nCell = engine.board[n.row][n.col];
                        if (nCell.owner !== null && nCell.owner !== aiId && nCell.atoms >= nCell.criticalMass - 1) {
                            threatFound = true;
                            score += 32 + (cell.atoms * 5);
                        }
                    }
                    if (!threatFound) score -= 18; // تجنب إهدار المهدئ في موقع آمن
                } else if (option.actionType === 'energyDrain') {
                    // تقييم هجوم إخماد طاقة ذرة معادية: تخفيض قنبلة وشيكة يعطي مكافأة دفاعية كبرى
                    const isEnemyCritical = (cell.atoms >= cell.criticalMass - 1);
                    score += 26 + (cell.atoms * 10) + (isEnemyCritical ? 24 : 0);
                } else {
                    // تغذية غرفة مملوكة
                    if (!enemyRisk) {
                        score += 8 + (cell.atoms * 4);
                        if (willExplode) score += 20;
                    }
                }
            }

            score += Math.random() * 2.5;

            if (score > bestScore) {
                bestScore = score;
                bestCandidates = [option];
            } else if (Math.abs(score - bestScore) < 0.6) {
                bestCandidates.push(option);
            }
        }

        return bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
    }
}

if (typeof window !== 'undefined') {
    window.AtomicAIBot = AtomicAIBot;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AtomicAIBot };
}
