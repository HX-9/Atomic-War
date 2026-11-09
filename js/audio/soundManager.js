/**
 * ============================================================================
 * الحرب الذرية (Atomic War) - محاكي الصوتيات النووية (Nuclear Sound Synthesizer)
 * يعتمد على Web Audio API لتركيب الترددات الحية دون أي ملفات خارجية
 * ============================================================================
 */
class NuclearSoundManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * صوت نقرة عداد غايغر عند وضع ذرة جديدة
     * @param {boolean} isFirstMove هل هذه الضربة الافتتاحية (ذرة ثلاثية)
     */
    playPlaceAtom(isFirstMove = false) {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        if (isFirstMove) {
            // نغمة تدشين قوية للذرة الثلاثية الافتتاحية
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.16);

            gain.gain.setValueAtTime(0.28, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.18);

            this.playGeigerClick(now + 0.02);
            this.playGeigerClick(now + 0.06);
            this.playGeigerClick(now + 0.1);
            return;
        }

        // تردد رنيني يحاكي شحن جسيم ذري
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(780, now + 0.08);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);

        // نقرة غايغر سريعة متزامنة
        this.playGeigerClick(now + 0.01);
    }

    playGeigerClick(time) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, time);
        gain.gain.setValueAtTime(0.04, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.02);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(time);
        osc.stop(time + 0.02);
    }

    /**
     * صوت دوي الانشطار النووي لموجة التفاعل المتسلسل
     */
    playFissionWave(waveIndex = 1) {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const subOsc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // تصاعد طاقة الانشطار مع تتابع الموجات المتسلسلة
        const baseFreq = Math.min(130 + waveIndex * 28, 550);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.3, now + 0.22);

        // صدى تحت أرضي عميق
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(90, now);
        subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.25);

        gain.gain.setValueAtTime(0.26, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

        osc.connect(gain);
        subOsc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        subOsc.start(now);
        osc.stop(now + 0.24);
        subOsc.stop(now + 0.25);
    }

    /**
     * نغمة إعلان السيطرة والانتصار النووي
     */
    playVictory() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const notes = [440, 554.37, 659.25, 880, 1108.73];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const start = this.ctx.currentTime + idx * 0.12;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, start);

            gain.gain.setValueAtTime(0.22, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.38);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(start);
            osc.stop(start + 0.39);
        });
    }

    /**
     * صوت صد واعتراض المقذوفات بواسطة الدرع النووي
     */
    playShieldDeflect() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(560, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.16);

        gain.gain.setValueAtTime(0.24, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.17);
    }

    /**
     * صوت انهيار وتفريغ درع الطاقة
     */
    playShieldCollapse() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const subOsc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // تردد متنازل يحاكي تفريغ وانهيار حقل الطاقة النووي
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(820, now);
        osc.frequency.exponentialRampToValueAtTime(95, now + 0.38);

        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(340, now);
        subOsc.frequency.exponentialRampToValueAtTime(50, now + 0.42);

        gain.gain.setValueAtTime(0.26, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

        osc.connect(gain);
        subOsc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        subOsc.start(now);
        osc.stop(now + 0.42);
        subOsc.stop(now + 0.42);
    }
}

if (typeof window !== 'undefined') {
    window.NuclearSoundManager = NuclearSoundManager;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NuclearSoundManager };
}
