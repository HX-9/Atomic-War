/**
 * ============================================================================
 * الحرب الذرية (Atomic War) - ذكاء المنافس الآلي (AtomicAIBot)
 * خوارزمية استراتيجية لتقييم الحركات واختيار أفضل خطة هجومية/دفاعية
 * مع دعم شخصيات الذكاء الاصطناعي (متوازن / هجومي / دفاعي)
 * ومساعد التوجيه التكتيكي (Tactical Advisor) لتقديم نصائح ذكية أثناء المعركة
 * ============================================================================
 */
class AtomicAIBot {
    /**
     * حساب أفضل حركة للذكاء الاصطناعي بناءً على حالة المفاعل وشخصية البوت
     * @param {AtomicWarsEngine} engine محرك اللعبة
     * @param {string} [personalityOverride] تجاوز اختياري لشخصية البوت ('balanced' | 'aggressive' | 'defensive')
     * @returns {{r: number, c: number, atomCount?: number, actionType?: string}|null}
     */
    static computeBestMove(engine, personalityOverride = null) {
        const aiId = engine.currentPlayerIndex;
        const player = engine.players[aiId];
        if (!player) return null;

        const personality = personalityOverride || player.personality || player.aiPersonality || 'balanced';
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
                        candidateOptions.push({ r, c, atomCount: 3, actionType: 'atom' });
                    }
                } else if (hasNeutrons) {
                    // في نظام النيوترونات التكتيكي:
                    if (cell.owner === aiId && availableNeutrons >= 1) {
                        // خيار تغذية خلية مملوكة بـ 1 نيوترون
                        if (engine.isValidMove(r, c, aiId, 1, 'feed')) {
                            candidateOptions.push({ r, c, atomCount: 1, actionType: 'feed' });
                        }
                        // خيار تثبيت قضيب تحكم نووي واقٍ
                        const rodCost = (engine.mode && typeof engine.mode.getControlRodCost === 'function') ? engine.mode.getControlRodCost() : 5;
                        if (!cell.hasControlRod && availableNeutrons >= rodCost && engine.isValidMove(r, c, aiId, 1, 'controlRod')) {
                            candidateOptions.push({ r, c, atomCount: 1, actionType: 'controlRod' });
                        }
                    } else if (cell.owner !== null && cell.owner !== aiId) {
                        // خيار شن هجوم إخماد طاقة ذرة معادية
                        const drainCost = (engine.mode && typeof engine.mode.getEnergyDrainCost === 'function') ? engine.mode.getEnergyDrainCost() : 3;
                        if (availableNeutrons >= drainCost && engine.isValidMove(r, c, aiId, 1, 'energyDrain')) {
                            candidateOptions.push({ r, c, atomCount: 1, actionType: 'energyDrain' });
                        }
                    } else if (cell.owner === null) {
                        // خيارات إلقاء ذرة في خلية فارغة بحسب رصيد النيوترونات
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

        // ضبط معاملات التقييم بحسب شخصية البوت
        let attackMultiplier = 1.0;
        let defenseMultiplier = 1.0;
        let dangerPenalty = 22;
        let rodBonusMultiplier = 1.0;
        let cornerBonusMultiplier = 1.0;

        if (personality === 'aggressive') {
            attackMultiplier = 1.85;   // تركيز جارف على الهجوم والانفجارات
            defenseMultiplier = 0.55;  // تجاهل جزئي للاحتياطات
            dangerPenalty = 9;         // لا يخشى المخاطرة
            rodBonusMultiplier = 0.6;
            cornerBonusMultiplier = 0.8;
        } else if (personality === 'defensive') {
            attackMultiplier = 0.8;
            defenseMultiplier = 1.7;   // تحصين مكثف ومدروس
            dangerPenalty = 42;        // حذر شديد وتجنب تام للغرف المهددة
            rodBonusMultiplier = 1.9;  // حب تثبيت المهدئات وقضبان التحكم
            cornerBonusMultiplier = 1.7;// حب الزوايا الآمنة المستقرة
        }

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
                        // تفجير سيصيب خلية معادية
                        score += (nCell.atoms * 16 + (enemyReady ? 32 : 14)) * attackMultiplier;
                    } else if (enemyReady) {
                        enemyRisk = true;
                        score -= dangerPenalty;
                    }
                } else if (nCell.owner === null && willExplode) {
                    const expansionBonus = engine.mode && typeof engine.mode.getAiExpansionBonus === 'function'
                        ? engine.mode.getAiExpansionBonus()
                        : 4;
                    score += expansionBonus * (personality === 'defensive' ? 1.4 : 1.0);
                }
            }

            if (isFirstMove) {
                if (personality === 'defensive') {
                    if (cell.criticalMass === 2) score += 28 * cornerBonusMultiplier; // حب الزوايا للدفاع
                    else if (cell.criticalMass === 3) score += 16;
                    else score += 6;
                } else if (personality === 'aggressive') {
                    if (cell.criticalMass === 4) score += 26; // قلب المفاعل لتفجير سريع في 4 اتجاهات
                    else if (cell.criticalMass === 2) score += 14;
                    else score += 10;
                } else {
                    if (cell.criticalMass === 4) score += 20;
                    else if (cell.criticalMass === 2) score += 14;
                    else score += 8;
                }
            } else {
                if (cell.owner === null) {
                    if (willExplode) {
                        score += 24 * attackMultiplier;
                    } else {
                        score += (atomsToAdd * 3);
                    }
                    if (cell.criticalMass === 2) score += 9 * cornerBonusMultiplier;
                    else if (cell.criticalMass === 3) score += 5 * cornerBonusMultiplier;
                } else if (option.actionType === 'controlRod') {
                    let threatFound = false;
                    for (const n of neighbors) {
                        const nCell = engine.board[n.row][n.col];
                        if (nCell.owner !== null && nCell.owner !== aiId && nCell.atoms >= nCell.criticalMass - 1) {
                            threatFound = true;
                            score += (32 + (cell.atoms * 5)) * rodBonusMultiplier;
                        }
                    }
                    if (!threatFound) score -= (18 / rodBonusMultiplier);
                } else if (option.actionType === 'energyDrain') {
                    const isEnemyCritical = (cell.atoms >= cell.criticalMass - 1);
                    score += (26 + (cell.atoms * 10) + (isEnemyCritical ? 26 : 0)) * attackMultiplier;
                } else {
                    // تغذية غرفة مملوكة
                    if (!enemyRisk) {
                        score += (8 + (cell.atoms * 4)) * defenseMultiplier;
                        if (willExplode) score += 22 * attackMultiplier;
                    } else {
                        if (willExplode) {
                            score += 18 * attackMultiplier; // ضربة استباقية قبل أن يفجر العدو
                        }
                    }
                }
            }

            // تشويش عشوائي طفيف لمنع الحركات الرتيبة والمتكررة
            score += Math.random() * 2.2;

            if (score > bestScore) {
                bestScore = score;
                bestCandidates = [option];
            } else if (Math.abs(score - bestScore) < 0.6) {
                bestCandidates.push(option);
            }
        }

        return bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
    }

    /**
     * مساعد التوجيه التكتيكي (Tactical Advisor)
     * يحلل المفاعل للاعب الحالي ويقترح أفضل حركة استراتيجية مع شرح السبب باللغة العربية
     * @param {AtomicWarsEngine} engine محرك اللعبة
     * @returns {{r: number, c: number, atomCount: number, actionType: string, reason: string, tacticType: string}|null}
     */
    static getTacticalHint(engine) {
        if (!engine || engine.isGameOver) return null;

        // نحسب الحركة التكتيكية المثلى باستخدام التقييم المتوازن/الخبير
        const bestMove = AtomicAIBot.computeBestMove(engine, 'balanced');
        if (!bestMove) return null;

        const playerId = engine.currentPlayerIndex;
        const cell = engine.board[bestMove.r][bestMove.c];
        const atomsToAdd = bestMove.atomCount || 1;
        const actionType = bestMove.actionType || 'atom';
        const willExplode = (cell.atoms + atomsToAdd) >= cell.criticalMass;
        const neighbors = engine.getOrthogonalNeighbors(bestMove.r, bestMove.c);

        let enemyNeighborsCount = 0;
        let criticalEnemiesCount = 0;
        for (const n of neighbors) {
            const nCell = engine.board[n.row][n.col];
            if (nCell.owner !== null && nCell.owner !== playerId) {
                enemyNeighborsCount++;
                if (nCell.atoms >= nCell.criticalMass - 1) {
                    criticalEnemiesCount++;
                }
            }
        }

        let reason = '';
        let tacticType = 'fortify';

        if (!engine.players[playerId].hasPlayed) {
            if (cell.criticalMass === 2) {
                reason = `تمركز افتتاحي في الزاوية [${bestMove.r + 1}، ${bestMove.c + 1}]: تحتاج ذرتين فقط للانفجار وتوفر حصناً آمناً لخطوطك.`;
                tacticType = 'defend';
            } else if (cell.criticalMass === 4) {
                reason = `ضربة افتتاحية في قلب المفاعل [${bestMove.r + 1}، ${bestMove.c + 1}]: تتيح انتشاراً رباعي الاتجاهات عند الانشطار.`;
                tacticType = 'attack';
            } else {
                reason = `تمركز افتتاحي على جدار المفاعل [${bestMove.r + 1}، ${bestMove.c + 1}] للتوسع المتوازن.`;
                tacticType = 'fortify';
            }
        } else if (actionType === 'controlRod') {
            reason = `تثبيت قضيب تحكم نووي في [${bestMove.r + 1}، ${bestMove.c + 1}]: امتصاص الصدمات وحماية الغرفة من انفجارات العدو الوشيكة!`;
            tacticType = 'defend';
        } else if (actionType === 'energyDrain') {
            reason = `إخماد طاقة ذرة الخصم في [${bestMove.r + 1}، ${bestMove.c + 1}]: تخفيض كتلتها الحرجة وإحباط هجوم وشيك!`;
            tacticType = 'attack';
        } else if (willExplode) {
            if (enemyNeighborsCount > 0) {
                reason = `إشعال انشطار متسلسل في [${bestMove.r + 1}، ${bestMove.c + 1}]: سيمتد الانفجار لابتلاع ${enemyNeighborsCount} خلايا معادية مجاورة والسيطرة عليها!`;
                tacticType = 'attack';
            } else {
                reason = `تفجير موجّه في [${bestMove.r + 1}، ${bestMove.c + 1}]: نشر ذراتك للتوسع والسيطرة على مساحات شاغرة في المفاعل.`;
                tacticType = 'expand';
            }
        } else {
            if (criticalEnemiesCount > 0) {
                reason = `تغذية استباقية للخلية [${bestMove.r + 1}، ${bestMove.c + 1}] لردع اقتراب غرف الخصم المشرفة على الانفجار.`;
                tacticType = 'defend';
            } else if (cell.criticalMass === 2) {
                reason = `تحصين الزاوية [${bestMove.r + 1}، ${bestMove.c + 1}]: الموقع مستقر استراتيجياً ويصعب على الخصم إسقاطه بسهولة.`;
                tacticType = 'fortify';
            } else {
                reason = `شحن الغرفة [${bestMove.r + 1}، ${bestMove.c + 1}] برفع الذرات فيها تمهيداً لإشعال سلسلة انشطارية قوية في الأدوار القادمة.`;
                tacticType = 'fortify';
            }
        }

        return {
            r: bestMove.r,
            c: bestMove.c,
            atomCount: atomsToAdd,
            actionType,
            reason,
            tacticType
        };
    }
}

if (typeof window !== 'undefined') {
    window.AtomicAIBot = AtomicAIBot;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AtomicAIBot };
}
