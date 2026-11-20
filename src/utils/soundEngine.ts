// Minimalist Web Audio API glass & water micro-sound synthesizer (zero external audio files)

const SOUND_STORAGE_KEY = 'khadok_sound_enabled';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    try {
      const saved = localStorage.getItem(SOUND_STORAGE_KEY);
      if (saved !== null) {
        this.enabled = saved === 'true';
      }
    } catch {
      this.enabled = true;
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(next: boolean): void {
    this.enabled = next;
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, String(next));
    } catch {
      // Ignore storage error
    }
    if (next) {
      this.playToggle(true);
    }
  }

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        // Safely ignore before first user interaction
      });
    }
    return this.ctx;
  }

  // Soft crystalline water-droplet tick on hover, filter, tab switch, or ripple
  public playTick(pitchOffset = 0): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Classic water droplet upward pitch bend
    osc.type = 'sine';
    const startF = Math.max(320, 640 + pitchOffset);
    const peakF = Math.max(520, 1180 + pitchOffset);
    osc.frequency.setValueAtTime(startF, now);
    osc.frequency.exponentialRampToValueAtTime(peakF, now + 0.036);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.028, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.044);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Crisp tactile glass tap on button, row, or counter clicks
  public playClick(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(280, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(110, now + 0.034);

    bodyGain.gain.setValueAtTime(0.0001, now);
    bodyGain.gain.linearRampToValueAtTime(0.042, now + 0.003);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(ctx.destination);

    const glassOsc = ctx.createOscillator();
    const glassGain = ctx.createGain();
    glassOsc.type = 'sine';
    glassOsc.frequency.setValueAtTime(1620, now);
    glassOsc.frequency.exponentialRampToValueAtTime(1040, now + 0.018);

    glassGain.gain.setValueAtTime(0.0001, now);
    glassGain.gain.linearRampToValueAtTime(0.018, now + 0.002);
    glassGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);

    glassOsc.connect(glassGain);
    glassGain.connect(ctx.destination);

    bodyOsc.start(now);
    bodyOsc.stop(now + 0.042);
    glassOsc.start(now);
    glassOsc.stop(now + 0.025);
  }

  // Ascending/descending droplet pop for watch stars & toggles
  public playToggle(active: boolean): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const startF = active ? 580 : 820;
    const endF = active ? 1120 : 490;
    osc.frequency.setValueAtTime(startF, now);
    osc.frequency.exponentialRampToValueAtTime(endF, now + 0.068);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.034, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.078);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.085);
  }

  // Gentle airy two-note chime on timeframe change, rescue action, or positive confirmation
  public playChime(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [698.46, 1046.5]; // F5 -> C6 clean harmonic fifth

    notes.forEach((freq, idx) => {
      const start = now + idx * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.03, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.24);
    });
  }

  // Soft airy filter whoosh on modal/drawer open
  public playWhoosh(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * 0.14);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.45;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2.6;
    filter.frequency.setValueAtTime(420, now);
    filter.frequency.exponentialRampToValueAtTime(1550, now + 0.12);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.022, now + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.145);
  }
}

export const soundEngine = new SoundEngine();
