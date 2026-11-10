/**
 * ============================================================================
 * الحرب الذرية (Atomic War) - مدير شبكة النظير إلى نظير (AtomicPeerNetwork)
 * يعتمد على PeerJS (WebRTC P2P) للعب الجماعي بدون خادم خلفي مركزي
 * يدعم من 2 إلى 4 لاعبين، نمط المتفرج (Spectator Mode)، التعبيرات السريعة (Quick Emotes)،
 * ومؤشر قياس جودة الاتصال وزمن الاستجابة (Ping / Latency)
 * ============================================================================
 */

class AtomicPeerNetwork {
    constructor() {
        this.peer = null;
        this.isHost = false;
        this.roomCode = null;
        this.localPlayerId = null;
        this.localPlayerName = 'القائد الذري';
        this.gameMode = 'normal';
        this.gridSize = 7;
        this.maxPlayers = 4;
        this.players = [];
        this.spectators = [];        // قائمة المتفرجين
        this.isSpectator = false;    // هل هذا الجهاز متفرج فقط
        this.hostConn = null;        // للضيف: الاتصال بالمضيف
        this.clientConns = [];       // للمضيف: قائمة اتصالات الضيوف والمتفرجين
        this.isInGame = false;

        // قياس زمن الاستجابة (Ping / Latency)
        this.playerPings = {};       // معرف اللاعب أو المتفرج -> زمن الاستجابة بالمللي ثانية
        this.pingInterval = null;

        // أحداث رد النداء (Callbacks)
        this.onLobbyUpdate = null;
        this.onGameStart = null;
        this.onMoveReceived = null;
        this.onEmoteReceived = null;
        this.onPingUpdate = null;
        this.onPlayerLeft = null;
        this.onRoomClosed = null;
        this.onLeaveRoom = null;
        this.onError = null;
        this.onStatusChange = null;
    }

    /**
     * توليد كود غرفة مكون من أحرف أبجدية فقط دون أي أرقام
     */
    static generateRoomCode() {
        const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += letters.charAt(Math.floor(Math.random() * letters.length));
        }
        return code;
    }

    /**
     * تحويل رمز الغرفة إلى معرف PeerJS فريد
     */
    static formatPeerId(roomCode) {
        return `atomic-war-p2p-${roomCode.trim().toLowerCase().replace(/[^a-z]/g, '')}`;
    }

    /**
     * تأسيس غرفة جديدة كمضيف (Host) - سعة المفاعل 4 افتراضياً
     */
    createRoom(hostName, gameMode = 'normal', maxPlayers = 4, gridSize = 7) {
        this.cleanup();
        this.isHost = true;
        this.isSpectator = false;
        this.localPlayerId = 0;
        this.localPlayerName = hostName || 'قائد اليورانيوم';
        this.gameMode = gameMode;
        this.maxPlayers = 4; // 4 افتراضياً دائماً
        this.gridSize = parseInt(gridSize, 10) || 7;
        this.roomCode = AtomicPeerNetwork.generateRoomCode();
        this.clientConns = [];
        this.spectators = [];
        this.isInGame = false;
        this.playerPings = { 0: 1 }; // المضيف سرعته <1ms

        this.players = [
            {
                id: 0,
                name: this.localPlayerName,
                isHost: true,
                isAI: false,
                connected: true,
                paletteIndex: 0
            }
        ];

        const hostPeerId = AtomicPeerNetwork.formatPeerId(this.roomCode);

        this.emitStatus('جاري حجز تردد المفاعل على الشبكة النظيرة...', 'info');

        try {
            this.peer = new Peer(hostPeerId, {
                debug: 1,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                }
            });
        } catch (err) {
            this.emitError('تعذر تهيئة مكتبة الاتصال PeerJS: ' + err.message);
            return;
        }

        this.peer.on('open', (id) => {
            this.emitStatus('المفاعل جاهز لاستقبال إشارات القوى النووية!', 'success');
            this.startPingLoop();
            if (this.onLobbyUpdate) {
                this.onLobbyUpdate(this.getLobbyState());
            }
        });

        this.peer.on('connection', (conn) => {
            this.handleIncomingClientConnection(conn);
        });

        this.peer.on('error', (err) => {
            if (err.type === 'unavailable-id') {
                // في حال مصادفة معرف مكرر نادر، إعادة المحاولة بكود آخر
                this.createRoom(hostName, gameMode, maxPlayers, gridSize);
            } else {
                this.emitError('خطأ في شبكة الاتصال: ' + (err.message || err.type));
            }
        });
    }

    /**
     * معالجة اتصال ضيف أو متفرج جديد بالمضيف
     */
    handleIncomingClientConnection(conn) {
        conn.on('data', (data) => {
            this.handleHostReceivedData(conn, data);
        });

        conn.on('close', () => {
            this.handleClientDisconnect(conn);
        });

        conn.on('error', (err) => {
            this.handleClientDisconnect(conn);
        });
    }

    /**
     * معالجة البيانات الواردة للمضيف من أحد الضيوف أو المتفرجين
     */
    handleHostReceivedData(conn, data) {
        if (!data || typeof data !== 'object') return;

        switch (data.type) {
            case 'HELLO': {
                const isSpectator = !!data.isSpectator;

                if (isSpectator) {
                    // انضمام كمتفرج (مقبول حتى أثناء المعركة واكتمال الغرفة)
                    conn.isSpectator = true;
                    conn.spectatorId = `spec_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                    this.clientConns.push(conn);

                    const specData = {
                        id: conn.spectatorId,
                        name: (data.name && data.name.trim()) ? data.name.trim() : 'متفرج نووي'
                    };
                    this.spectators.push(specData);

                    conn.send({
                        type: 'WELCOME',
                        isSpectator: true,
                        playerId: -1,
                        gameMode: this.gameMode,
                        maxPlayers: this.maxPlayers,
                        gridSize: this.gridSize,
                        roomCode: this.roomCode,
                        players: this.players,
                        isInGame: this.isInGame
                    });

                    if (this.isInGame) {
                        conn.send({
                            type: 'START_GAME',
                            gameMode: this.gameMode,
                            gridSize: this.gridSize,
                            players: this.players
                        });
                    }

                    this.broadcastLobbyUpdate();
                    return;
                }

                // انضمام كلاعب مقاتل
                if (this.isInGame) {
                    conn.send({ type: 'REJECT', reason: 'المعركة قد بدأت بالفعل! يمكنك الانضمام كمتفرج للمشاهدة.' });
                    setTimeout(() => conn.close(), 600);
                    return;
                }

                if (this.players.length >= this.maxPlayers) {
                    conn.send({ type: 'REJECT', reason: 'اكتملت المقاعد القتالية! يمكنك الانضمام كمتفرج للمشاهدة.' });
                    setTimeout(() => conn.close(), 600);
                    return;
                }

                const assignedId = this.players.length;
                conn.playerId = assignedId;
                conn.isSpectator = false;
                this.clientConns.push(conn);

                const newPlayer = {
                    id: assignedId,
                    name: (data.name && data.name.trim()) ? data.name.trim() : `القائد الذري ${assignedId + 1}`,
                    isHost: false,
                    isAI: false,
                    connected: true,
                    paletteIndex: assignedId
                };
                this.players.push(newPlayer);

                // إرسال حزمة الترحيب والتهيئة للضيف الجديد
                conn.send({
                    type: 'WELCOME',
                    isSpectator: false,
                    playerId: assignedId,
                    gameMode: this.gameMode,
                    maxPlayers: this.maxPlayers,
                    gridSize: this.gridSize,
                    roomCode: this.roomCode,
                    players: this.players,
                    isInGame: false
                });

                // بث التحديث لجميع المنضمين
                this.broadcastLobbyUpdate();
                break;
            }

            case 'MOVE': {
                // التحقق من صحة حركة الضيف وبثها للجميع
                if (data.playerId === conn.playerId && !conn.isSpectator) {
                    this.broadcastToAll(data);
                    if (this.onMoveReceived) {
                        this.onMoveReceived(data);
                    }
                }
                break;
            }

            case 'EMOTE': {
                // بث التعبير التكتيكي السريع لجميع الضيوف والمتفرجين
                this.broadcastToClients(data);
                if (this.onEmoteReceived) {
                    this.onEmoteReceived(data);
                }
                break;
            }

            case 'PING': {
                // الرد الفوري بحزمة PONG لقياس زمن الاستجابة
                conn.send({
                    type: 'PONG',
                    clientTime: data.clientTime,
                    serverTime: Date.now()
                });
                break;
            }

            case 'REPORT_PING': {
                if (data.playerId !== undefined && data.ping !== undefined) {
                    this.playerPings[data.playerId] = data.ping;
                    if (this.onPingUpdate) {
                        this.onPingUpdate(this.playerPings);
                    }
                }
                break;
            }

            case 'UPDATE_NAME': {
                if (conn.isSpectator) {
                    const spec = this.spectators.find(s => s.id === conn.spectatorId);
                    if (spec && data.name) spec.name = data.name.trim().slice(0, 16);
                } else {
                    const targetPlayer = this.players.find(p => p.id === conn.playerId);
                    if (targetPlayer && data.name && data.name.trim()) {
                        targetPlayer.name = data.name.trim().slice(0, 16);
                        this.broadcastLobbyUpdate();
                    }
                }
                break;
            }

            case 'LEAVE': {
                this.handleClientDisconnect(conn);
                break;
            }
        }
    }

    /**
     * معالجة انقطاع اتصال أحد الضيوف أو المتفرجين
     */
    handleClientDisconnect(conn) {
        if (conn.isSpectator) {
            this.spectators = this.spectators.filter(s => s.id !== conn.spectatorId);
            this.clientConns = this.clientConns.filter(c => c !== conn);
            this.broadcastLobbyUpdate();
            return;
        }

        const pIndex = this.players.findIndex(p => p.id === conn.playerId);
        let leftPlayer = null;
        if (pIndex !== -1) {
            leftPlayer = this.players[pIndex];
            this.players.splice(pIndex, 1);
            delete this.playerPings[conn.playerId];
        }

        this.clientConns = this.clientConns.filter(c => c !== conn);

        if (!this.isInGame) {
            // إعادة تعيين معرّفات اللاعبين في الردهة لتبسيط الدور
            this.players.forEach((p, idx) => {
                p.id = idx;
                p.paletteIndex = idx;
            });
            this.clientConns.filter(c => !c.isSpectator).forEach((c, idx) => {
                c.playerId = idx + 1;
            });
            this.broadcastLobbyUpdate();
        } else if (leftPlayer && this.onPlayerLeft) {
            this.onPlayerLeft(leftPlayer);
            this.broadcastToClients({ type: 'PLAYER_LEFT', player: leftPlayer });
        }
    }

    /**
     * الانضمام إلى غرفة كضيف لاعب أو كمتفرج
     */
    joinRoom(roomCode, playerName, asSpectator = false) {
        this.cleanup();
        this.isHost = false;
        this.isSpectator = !!asSpectator;
        this.roomCode = roomCode.trim().toUpperCase();
        this.localPlayerName = playerName || (this.isSpectator ? 'مراقب المفاعل' : 'القائد الضيف');
        this.isInGame = false;
        this.playerPings = {};

        const targetPeerId = AtomicPeerNetwork.formatPeerId(this.roomCode);

        this.emitStatus(this.isSpectator ? 'جاري الاقتران ببرج المراقبة النووية...' : 'جاري الاتصال ببرج المفاعل المشترك...', 'info');

        try {
            this.peer = new Peer({
                debug: 1,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                }
            });
        } catch (err) {
            this.emitError('تعذر تهيئة مكتبة الاتصال PeerJS: ' + err.message);
            return;
        }

        this.peer.on('open', () => {
            const conn = this.peer.connect(targetPeerId, {
                reliable: true
            });
            this.hostConn = conn;

            conn.on('open', () => {
                this.emitStatus('تم الاقتران، جاري إرسال تصريح الدخول...', 'info');
                conn.send({
                    type: 'HELLO',
                    name: this.localPlayerName,
                    isSpectator: this.isSpectator
                });
                this.startPingLoop();
            });

            conn.on('data', (data) => {
                this.handleClientReceivedData(data);
            });

            conn.on('close', () => {
                this.emitStatus('انقطع الاتصال بالمضيف أو تم إغلاق الغرفة.', 'amber');
                if (this.onPlayerLeft) {
                    this.onPlayerLeft({ name: 'مضيف الغرفة' });
                }
            });

            conn.on('error', (err) => {
                this.emitError('فشل الاتصال بالمضيف: تأكد من صحة رمز الغرفة وتواجد المضيف متصلاً.');
            });
        });

        this.peer.on('error', (err) => {
            this.emitError('خطأ اتصال: ' + (err.message || err.type));
        });
    }

    /**
     * معالجة البيانات الواردة للضيف أو المتفرج من المضيف
     */
    handleClientReceivedData(data) {
        if (!data || typeof data !== 'object') return;

        switch (data.type) {
            case 'WELCOME': {
                this.isSpectator = !!data.isSpectator;
                this.localPlayerId = data.playerId;
                this.gameMode = data.gameMode;
                this.maxPlayers = data.maxPlayers;
                this.gridSize = data.gridSize;
                this.players = data.players;
                if (this.isSpectator) {
                    this.emitStatus('تم الاتصال كمتفرج! جاري رصد إشعاعات المفاعل...', 'success');
                } else {
                    this.emitStatus('تم الانضمام بنجاح! في انتظار انطلاق المعركة...', 'success');
                }
                if (this.onLobbyUpdate) {
                    this.onLobbyUpdate(this.getLobbyState());
                }
                break;
            }

            case 'REJECT': {
                this.emitError(data.reason || 'تم رفض الاتصال بهذه الغرفة.');
                this.cleanup();
                break;
            }

            case 'LOBBY_UPDATE': {
                this.players = data.players;
                this.gameMode = data.gameMode;
                this.maxPlayers = data.maxPlayers;
                this.gridSize = data.gridSize;
                this.spectators = data.spectators || this.spectators;
                if (this.onLobbyUpdate) {
                    this.onLobbyUpdate(this.getLobbyState());
                }
                break;
            }

            case 'START_GAME': {
                this.isInGame = true;
                this.gameMode = data.gameMode;
                this.gridSize = data.gridSize;
                this.players = data.players;
                if (this.onGameStart) {
                    this.onGameStart({
                        mode: this.gameMode,
                        gridSize: this.gridSize,
                        players: this.players,
                        localPlayerId: this.localPlayerId,
                        isSpectator: this.isSpectator
                    });
                }
                break;
            }

            case 'MOVE': {
                if (this.onMoveReceived) {
                    this.onMoveReceived(data);
                }
                break;
            }

            case 'EMOTE': {
                if (this.onEmoteReceived) {
                    this.onEmoteReceived(data);
                }
                break;
            }

            case 'PONG': {
                const now = Date.now();
                const latency = Math.max(1, Math.round(now - data.clientTime));
                const myId = this.isSpectator ? 'spec' : this.localPlayerId;
                this.playerPings[myId] = latency;

                // إرسال تقرير بالـ ping للمضيف لتوزيعه
                if (this.hostConn && this.hostConn.open) {
                    this.hostConn.send({
                        type: 'REPORT_PING',
                        playerId: myId,
                        ping: latency
                    });
                }

                if (this.onPingUpdate) {
                    this.onPingUpdate(this.playerPings);
                }
                break;
            }

            case 'PINGS_UPDATE': {
                this.playerPings = data.pings || {};
                if (this.onPingUpdate) {
                    this.onPingUpdate(this.playerPings);
                }
                break;
            }

            case 'PLAYER_LEFT': {
                if (this.onPlayerLeft) {
                    this.onPlayerLeft(data.player);
                }
                break;
            }

            case 'ROOM_CLOSED': {
                this.emitStatus(data.reason || 'قام المضيف بإلغاء الغرفة.', 'amber');
                this.cleanup();
                if (this.onRoomClosed) {
                    this.onRoomClosed();
                }
                break;
            }
        }
    }

    /**
     * بدء اللعبة (للمضيف فقط)
     */
    startGame() {
        if (!this.isHost) return;
        if (this.players.length < 2) {
            this.emitError('يجب انضمام لاعب آخر على الأقل لبدء المعركة الجماعية!');
            return;
        }

        this.isInGame = true;
        const config = {
            type: 'START_GAME',
            gameMode: this.gameMode,
            gridSize: this.gridSize,
            players: this.players
        };

        this.broadcastToClients(config);

        if (this.onGameStart) {
            this.onGameStart({
                mode: this.gameMode,
                gridSize: this.gridSize,
                players: this.players,
                localPlayerId: this.localPlayerId,
                isSpectator: false
            });
        }
    }

    /**
     * إرسال تعبير تكتيكي سريع (Quick Emote)
     */
    sendEmote(emoteString) {
        if (!emoteString) return;
        const emoteData = {
            type: 'EMOTE',
            playerId: this.isSpectator ? -1 : this.localPlayerId,
            playerName: this.localPlayerName,
            isSpectator: this.isSpectator,
            emote: emoteString,
            timestamp: Date.now()
        };

        if (this.isHost) {
            this.broadcastToClients(emoteData);
            if (this.onEmoteReceived) {
                this.onEmoteReceived(emoteData);
            }
        } else if (this.hostConn && this.hostConn.open) {
            this.hostConn.send(emoteData);
            // إظهار التعبير محلياً فوراً
            if (this.onEmoteReceived) {
                this.onEmoteReceived(emoteData);
            }
        }
    }

    /**
     * بدء حلقة قياس جودة الاتصال وزمن الاستجابة (Ping)
     */
    startPingLoop() {
        this.stopPingLoop();
        this.pingInterval = setInterval(() => {
            if (this.isHost) {
                // المضيف يبث جدول زمن الاستجابة لجميع المتصلين
                this.playerPings[0] = 1;
                this.broadcastToClients({
                    type: 'PINGS_UPDATE',
                    pings: this.playerPings
                });
                if (this.onPingUpdate) {
                    this.onPingUpdate(this.playerPings);
                }
            } else if (this.hostConn && this.hostConn.open) {
                // الضيف أو المتفرج يرسل نبضة ping للمضيف
                this.hostConn.send({
                    type: 'PING',
                    clientTime: Date.now()
                });
            }
        }, 3200);
    }

    /**
     * إيقاف حلقة الـ Ping
     */
    stopPingLoop() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    /**
     * إضافة روبوت ذكاء اصطناعي لفتحة شاغرة في الغرفة (للمضيف فقط)
     */
    addBot(personality = 'balanced') {
        if (!this.isHost || this.isInGame) return false;
        if (this.players.length >= this.maxPlayers) {
            this.emitError('اكتملت جميع فتحات المفاعل النووي!');
            return false;
        }

        const botIdx = this.players.length;
        const botNames = ['بوت اليورانيوم', 'بوت البلوتونيوم', 'بوت الكوبالت', 'بوت السيزيوم'];
        const newBot = {
            id: botIdx,
            name: botNames[botIdx] || `روبوت ذري ${botIdx + 1}`,
            isHost: false,
            isAI: true,
            personality: personality,
            connected: true,
            paletteIndex: botIdx
        };

        this.players.push(newBot);
        this.playerPings[botIdx] = 1; // الروبوت محلي
        this.broadcastLobbyUpdate();
        return true;
    }

    /**
     * تبديل شخصية روبوت معين
     */
    cycleBotPersonality(botId) {
        if (!this.isHost || this.isInGame) return;
        const bot = this.players.find(p => p.id === botId && p.isAI);
        if (!bot) return;

        const personalities = ['balanced', 'aggressive', 'defensive'];
        const currentIdx = personalities.indexOf(bot.personality || 'balanced');
        bot.personality = personalities[(currentIdx + 1) % personalities.length];
        this.broadcastLobbyUpdate();
    }

    /**
     * إزالة روبوت من الفتحة (للمضيف فقط)
     */
    removeBot(botId) {
        if (!this.isHost || this.isInGame) return false;
        const idx = this.players.findIndex(p => p.id === botId && p.isAI);
        if (idx === -1) return false;

        this.players.splice(idx, 1);
        delete this.playerPings[botId];

        // إعادة ترتيب المعرفات
        this.players.forEach((p, i) => {
            p.id = i;
            p.paletteIndex = i;
        });

        this.broadcastLobbyUpdate();
        return true;
    }

    /**
     * إكمال جميع الفتحات المتبقية بروبوتات ذكية
     */
    fillRemainingWithBots() {
        if (!this.isHost || this.isInGame) return;
        while (this.players.length < this.maxPlayers) {
            this.addBot();
        }
    }

    /**
     * تحديث اسم اللاعب بعد الانضمام للغرفة وبثه للجميع
     */
    updatePlayerName(newName) {
        const clean = (newName && newName.trim()) ? newName.trim().slice(0, 16) : 'قائد ذري';
        this.localPlayerName = clean;

        if (this.isHost) {
            if (this.players && this.players[0]) {
                this.players[0].name = clean;
                this.broadcastLobbyUpdate();
            }
        } else if (this.hostConn && this.hostConn.open) {
            this.hostConn.send({
                type: 'UPDATE_NAME',
                name: clean
            });
        }
    }

    /**
     * مغادرة الغرفة الحالية
     */
    leaveRoom() {
        if (this.isHost) {
            this.broadcastToClients({ type: 'ROOM_CLOSED', reason: 'قام المضيف بإلغاء الغرفة والعودة للقائمة.' });
        } else if (this.hostConn && this.hostConn.open) {
            this.hostConn.send({ type: 'LEAVE' });
        }
        this.cleanup();
        if (this.onLeaveRoom) {
            this.onLeaveRoom();
        }
    }

    /**
     * إرسال حركة اللاعب المحلي أو الروبوت لجميع الأطراف
     */
    sendMove(r, c, atomCount = 1, actionType = 'atom', playerId = null) {
        if (this.isSpectator) return; // المتفرج لا يرسل حركات

        const moveData = {
            type: 'MOVE',
            playerId: playerId !== null ? playerId : this.localPlayerId,
            r,
            c,
            atomCount,
            actionType,
            timestamp: Date.now()
        };

        if (this.isHost) {
            this.broadcastToClients(moveData);
        } else if (this.hostConn && this.hostConn.open) {
            this.hostConn.send(moveData);
        }
    }

    /**
     * بث تحديث الردهة
     */
    broadcastLobbyUpdate() {
        const payload = {
            type: 'LOBBY_UPDATE',
            players: this.players,
            gameMode: this.gameMode,
            maxPlayers: this.maxPlayers,
            gridSize: this.gridSize,
            spectators: this.spectators
        };
        this.broadcastToClients(payload);
        if (this.onLobbyUpdate) {
            this.onLobbyUpdate(this.getLobbyState());
        }
    }

    /**
     * بث رسالة لجميع الضيوف والمتفرجين
     */
    broadcastToClients(data) {
        if (!this.isHost) return;
        this.clientConns.forEach((conn) => {
            if (conn && conn.open) {
                conn.send(data);
            }
        });
    }

    /**
     * بث للجميع (الضيوف + المضيف)
     */
    broadcastToAll(data) {
        this.broadcastToClients(data);
    }

    getLobbyState() {
        return {
            roomCode: this.roomCode,
            isHost: this.isHost,
            isSpectator: this.isSpectator,
            localPlayerId: this.localPlayerId,
            localPlayerName: this.localPlayerName,
            gameMode: this.gameMode,
            maxPlayers: this.maxPlayers,
            gridSize: this.gridSize,
            players: this.players,
            spectators: this.spectators,
            pings: this.playerPings,
            isReadyToStart: this.isHost && this.players.length >= 2
        };
    }

    emitStatus(text, type = 'info') {
        if (this.onStatusChange) {
            this.onStatusChange(text, type);
        }
    }

    emitError(msg) {
        if (this.onError) {
            this.onError(msg);
        }
    }

    cleanup() {
        this.stopPingLoop();
        this.isInGame = false;
        if (this.hostConn) {
            try { this.hostConn.close(); } catch (e) {}
            this.hostConn = null;
        }
        if (this.clientConns && this.clientConns.length > 0) {
            this.clientConns.forEach(c => {
                try { c.close(); } catch (e) {}
            });
            this.clientConns = [];
        }
        if (this.peer) {
            try { this.peer.destroy(); } catch (e) {}
            this.peer = null;
        }
        this.players = [];
        this.spectators = [];
        this.playerPings = {};
        this.roomCode = null;
        this.localPlayerId = null;
        this.isSpectator = false;
    }
}

if (typeof window !== 'undefined') {
    window.AtomicPeerNetwork = AtomicPeerNetwork;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AtomicPeerNetwork };
}
