import { EventEmitter } from '../utils/EventEmitter';
import type { Settings } from '../utils/Settings';
import type { BiomeType } from '../biomes/BiomeTypes';
import type { AnomalyType } from '../systems/AnomalySystem';

export class AudioManager extends EventEmitter {
  private ctx: AudioContext | null = null;
  private masterGain!: GainNode;
  private sfxGain!: GainNode;
  private musicGain!: GainNode;
  private ambientGain!: GainNode;
  private activeAmbientNodes: AudioNode[] = [];
  private activeAmbientGain: GainNode | null = null;
  private activeMusicNodes: AudioNode[] = [];
  private activeMusicGain: GainNode | null = null;
  private settings: Settings;
  private ready = false;
  private _paused = false;
  private noiseBuffer: AudioBuffer | null = null;
  private footstepBuffers: Map<string, AudioBuffer> = new Map();
  private doorOpenBuffer: AudioBuffer | null = null;
  private doorLockedBuffer: AudioBuffer | null = null;

  constructor(settings: Settings) {
    super();
    this.settings = settings;
    this.init();
  }

  private init(): void {
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.settings.get<number>('audio.master', 1);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.settings.get<number>('audio.sfx', 1);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.settings.get<number>('audio.music', 0.7);
      this.musicGain.connect(this.masterGain);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = this.settings.get<number>('audio.ambient', 0.8);
      this.ambientGain.connect(this.masterGain);

      this.noiseBuffer = this.generateNoise(3);

      this.footstepBuffers.set('concrete', this.generateFootstepSound('concrete'));
      this.footstepBuffers.set('metal', this.generateFootstepSound('metal'));
      this.footstepBuffers.set('tile', this.generateFootstepSound('tile'));
      this.footstepBuffers.set('carpet', this.generateFootstepSound('carpet'));
      this.footstepBuffers.set('water', this.generateFootstepSound('water'));
      this.footstepBuffers.set('gravel', this.generateFootstepSound('gravel'));

      this.doorOpenBuffer = this.generateDoorSound('open');
      this.doorLockedBuffer = this.generateDoorSound('locked');

      this.ready = true;
    } catch {
      this.ready = false;
    }
  }

  playBiomeAmbient(biomeType: string): void {
    this.stopAmbient();
    if (!this.ctx || !this.ready) return;

    const freqMap: Record<string, number[]> = {
      cubicle_sea: [55, 110, 165],
      submerged_garage: [48, 72, 96],
      server_cathedral: [100, 150, 200],
      atrium_mall: [70, 140, 210],
      stairwell_infinite: [40, 80, 120],
      pool_complex: [65, 130, 195],
    };

    const freqs = freqMap[biomeType] || [55, 110, 165];

    const ambientGain = this.ctx.createGain();
    ambientGain.gain.value = 0;
    ambientGain.connect(this.ambientGain);
    this.activeAmbientGain = ambientGain;

    const now = this.ctx.currentTime;
    ambientGain.gain.linearRampToValueAtTime(0.15, now + 3);

    const nodes: AudioNode[] = [];
    for (const freq of freqs) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.frequency.linearRampToValueAtTime(freq + 3, now + 8);
      osc.frequency.linearRampToValueAtTime(freq - 2, now + 16);

      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.05 + Math.random() * 0.1;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = freq * 0.005;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();
      nodes.push(lfo);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = freq * 4;
      filter.Q.value = 1;

      const gainNode = this.ctx.createGain();
      gainNode.gain.value = 1 / freqs.length;

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ambientGain);
      osc.start();

      if (biomeType === 'submerged_garage' || biomeType === 'pool_complex') {
        const wetNode = this.ctx.createBiquadFilter();
        wetNode.type = 'highpass';
        wetNode.frequency.value = freq * 0.5;
        const wetGain = this.ctx.createGain();
        wetGain.gain.value = 0.04;
        this.addWaterDripLayer(ambientGain);
      }

      nodes.push(osc, filter, gainNode);
    }

    this.activeAmbientNodes = nodes;
  }

  private addWaterDripLayer(destination: AudioNode): void {
    if (!this.ctx) return;
    const scheduleNext = () => {
      if (!this.ctx || this._paused) return;
      const delay = 2 + Math.random() * 5;
      setTimeout(() => {
        this.playWaterDripInternal(destination);
        scheduleNext();
      }, delay * 1000);
    };
    scheduleNext();
  }

  private playWaterDripInternal(destination: AudioNode): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 400 + Math.random() * 200;
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    gain.connect(destination);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  stopAmbient(): void {
    for (const node of this.activeAmbientNodes) {
      try { (node as OscillatorNode).stop(); } catch {}
    }
    this.activeAmbientNodes = [];
    if (this.activeAmbientGain) {
      const now = this.ctx?.currentTime ?? 0;
      this.activeAmbientGain.gain.linearRampToValueAtTime(0, now + 0.5);
    }
    this.activeAmbientGain = null;
  }

  playMusicTrack(trackId: string): void {
    this.stopMusic();
    if (!this.ctx || !this.ready) return;

    const musicGain = this.ctx.createGain();
    musicGain.gain.value = 0;
    musicGain.connect(this.musicGain);
    this.activeMusicGain = musicGain;

    const now = this.ctx.currentTime;
    musicGain.gain.linearRampToValueAtTime(0.3, now + 5);

    const chordMap: Record<string, number[]> = {
      theme_office_liminal: [130.81, 164.81, 196.00],
      theme_garage_submerged: [110.00, 130.81, 155.56],
      theme_server_cathedral: [146.83, 185.00, 220.00],
      theme_mall_atrium: [98.00, 123.47, 146.83],
      theme_stairwell_infinite: [82.41, 110.00, 130.81],
      theme_pool_complex: [120.00, 144.00, 180.00],
    };
    const chord = chordMap[trackId] || [130.81, 164.81, 196.00];

    const nodes: AudioNode[] = [];
    for (const freq of chord) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.03 + Math.random() * 0.05;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = freq * 0.01;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();
      nodes.push(lfo);

      const lfo2 = this.ctx.createOscillator();
      lfo2.type = 'sine';
      lfo2.frequency.value = 0.1 + Math.random() * 0.2;
      const lfoGain2 = this.ctx.createGain();
      lfoGain2.gain.value = 0.5;
      lfo2.connect(lfoGain2);
      lfoGain2.connect(osc.detune);
      lfo2.start();
      nodes.push(lfo2);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = freq * 8;
      filter.Q.value = 0.5;

      const gain = this.ctx.createGain();
      gain.gain.value = 0.3 / chord.length;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(musicGain);
      osc.start();
      nodes.push(osc, filter, gain);

      if (Math.random() < 0.3) {
        this.scheduleLowTone(musicGain);
      }
    }
    this.activeMusicNodes = nodes;
  }

  private scheduleLowTone(destination: AudioNode): void {
    if (!this.ctx) return;
    const delay = 10 + Math.random() * 20;
    setTimeout(() => {
      if (!this.ctx || this._paused) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 30 + Math.random() * 20;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 2);
      gain.gain.linearRampToValueAtTime(0, now + 6);

      osc.connect(gain);
      gain.connect(destination);
      osc.start(now);
      osc.stop(now + 7);

      this.scheduleLowTone(destination);
    }, delay * 1000);
  }

  stopMusic(): void {
    for (const node of this.activeMusicNodes) {
      try { (node as OscillatorNode).stop(); } catch {}
    }
    this.activeMusicNodes = [];
    if (this.activeMusicGain) {
      const now = this.ctx?.currentTime ?? 0;
      this.activeMusicGain.gain.linearRampToValueAtTime(0, now + 1);
    }
    this.activeMusicGain = null;
  }

  playFootstep(surfaceType: string, strength: number): void {
    if (!this.ctx || !this.ready) return;
    const buffer = this.footstepBuffers.get(surfaceType) || this.footstepBuffers.get('concrete');
    if (!buffer) return;

    const now = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gain = this.ctx.createGain();
    const vol = Math.min(strength, 1) * 0.6;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800 + strength * 4000;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start(now);
    source.stop(now + 0.2);
  }

  playDoorOpen(): void {
    if (!this.ctx || !this.ready || !this.doorOpenBuffer) return;
    const now = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = this.doorOpenBuffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    source.connect(gain);
    gain.connect(this.sfxGain);
    source.start(now);
    source.stop(now + 1);
  }

  playDoorLocked(): void {
    if (!this.ctx || !this.ready || !this.doorLockedBuffer) return;
    const now = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = this.doorLockedBuffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    source.connect(gain);
    gain.connect(this.sfxGain);
    source.start(now);
    source.stop(now + 0.6);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 80;
    const buzzGain = this.ctx.createGain();
    buzzGain.gain.setValueAtTime(0, now);
    buzzGain.gain.linearRampToValueAtTime(0.15, now + 0.05);
    buzzGain.gain.linearRampToValueAtTime(0, now + 0.4);
    osc.connect(buzzGain);
    buzzGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  playToolUse(toolId: string): void {
    if (!this.ctx || !this.ready) return;
    const now = this.ctx.currentTime;
    const toolSounds: Record<string, () => void> = {
      crowbar: () => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);
        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        const filter = this.ctx!.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1000;
        filter.Q.value = 3;
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.25);
      },
      flashlight: () => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.1);
      },
      lockpick: () => {
        for (let i = 0; i < 3; i++) {
          const t = now + i * 0.08;
          const osc = this.ctx!.createOscillator();
          osc.type = 'triangle';
          osc.frequency.value = 1200 + Math.random() * 600;
          const gain = this.ctx!.createGain();
          gain.gain.setValueAtTime(0.15, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(t);
          osc.stop(t + 0.05);
        }
      },
      scanner: () => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'square';
        osc.frequency.value = 800;
        const filter = this.ctx!.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2000;
        filter.Q.value = 1;
        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.6);
        const lfo = this.ctx!.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 20;
        const lfoGain = this.ctx!.createGain();
        lfoGain.gain.value = 300;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.6);
        lfo.stop(now + 0.6);
      },
    };
    const soundFn = toolSounds[toolId] || toolSounds.crowbar;
    soundFn();
  }

  playItemPickup(): void {
    if (!this.ctx || !this.ready) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playEntityDetected(): void {
    if (!this.ctx || !this.ready) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 100;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.15);
    gain.gain.linearRampToValueAtTime(0, now + 0.6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.7);
  }

  playEntityAttack(): void {
    if (!this.ctx || !this.ready) return;
    const now = this.ctx.currentTime;
    const noise = this.generateNoise(0.3);
    const source = this.ctx.createBufferSource();
    source.buffer = noise;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.02);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start(now);
    source.stop(now + 0.35);

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.linearRampToValueAtTime(30, now + 0.3);
    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.4, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  playDamage(): void {
    if (!this.ctx || !this.ready) return;
    const now = this.ctx.currentTime;
    const impactBuffer = this.generateImpactSound();
    const source = this.ctx.createBufferSource();
    source.buffer = impactBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start(now);
    source.stop(now + 0.35);
  }

  playAnomalyAlert(): void {
    if (!this.ctx || !this.ready) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.12;
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(300 + i * 200, t);
      osc.frequency.linearRampToValueAtTime(900 + i * 300, t + 0.06);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800 + i * 400;
      filter.Q.value = 5;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.1);
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer!;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.08, now + 0.05);
    noiseGain.gain.linearRampToValueAtTime(0, now + 0.4);
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 2000;
    noiseFilter.Q.value = 2;
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noiseSource.start(now);
    noiseSource.stop(now + 0.45);
  }

  playTransition(): void {
    if (!this.ctx || !this.ready) return;
    const now = this.ctx.currentTime;
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer!;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(100, now);
    filter.frequency.exponentialRampToValueAtTime(5000, now + 0.5);
    filter.frequency.exponentialRampToValueAtTime(200, now + 1);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.5);
    gain.gain.linearRampToValueAtTime(0, now + 1.5);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noiseSource.start(now);
    noiseSource.stop(now + 1.6);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 1);
    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.1, now);
    oscGain.gain.linearRampToValueAtTime(0, now + 1);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 1.1);
  }

  playUIHover(): void {
    if (!this.ctx || !this.ready) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 600;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  playUIClick(): void {
    if (!this.ctx || !this.ready) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playHeartbeat(intensity: number): void {
    if (!this.ctx || !this.ready) return;
    const now = this.ctx.currentTime;
    const vol = Math.min(intensity, 1) * 0.3;

    const playLub = (time: number) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, time);
      osc.frequency.linearRampToValueAtTime(40, time + 0.08);
      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(vol, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(time);
      osc.stop(time + 0.15);
    };

    const playDub = (time: number) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(60, time);
      osc.frequency.linearRampToValueAtTime(35, time + 0.06);
      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(vol * 0.7, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(time);
      osc.stop(time + 0.1);
    };

    playLub(now);
    playDub(now + 0.2);
  }

  playVentHiss(): void {
    if (!this.ctx || !this.ready) return;
    const now = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer!;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3000, now);
    filter.frequency.linearRampToValueAtTime(1000, now + 0.5);
    filter.Q.value = 1;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.3);
    gain.gain.linearRampToValueAtTime(0.2, now + 1.5);
    gain.gain.linearRampToValueAtTime(0, now + 2);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start(now);
    source.stop(now + 2.1);
  }

  playWaterDrip(): void {
    if (!this.ctx || !this.ready) return;
    this.playWaterDripInternal(this.sfxGain);
  }

  playElevatorDing(): void {
    if (!this.ctx || !this.ready) return;
    const now = this.ctx.currentTime;
    const playNote = (freq: number, time: number) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.2, time + 0.01);
      gain.gain.linearRampToValueAtTime(0.15, time + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.6);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(time);
      osc.stop(time + 0.65);
    };
    playNote(523.25, now);
    playNote(659.25, now + 0.3);
  }

  private playEndSound(result: string): void {
    if (!this.ctx || !this.ready) return;
    const now = this.ctx.currentTime;
    const isDeath = result === 'death';
    const osc = this.ctx.createOscillator();
    osc.type = isDeath ? 'sawtooth' : 'sine';
    const startFreq = isDeath ? 300 : 200;
    const endFreq = isDeath ? 50 : 80;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 1.5);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0, now + 1.5);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = isDeath ? 800 : 400;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 1.6);
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  setSfxVolume(volume: number): void {
    if (this.sfxGain) {
      this.sfxGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  setMusicVolume(volume: number): void {
    if (this.musicGain) {
      this.musicGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  setAmbientVolume(volume: number): void {
    if (this.ambientGain) {
      this.ambientGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  private generateNoise(duration: number): AudioBuffer {
    const sampleRate = this.ctx!.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = this.ctx!.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private generateFootstepSound(surfaceType: string): AudioBuffer {
    const sampleRate = this.ctx!.sampleRate;
    const duration = 0.15;
    const length = Math.floor(sampleRate * duration);
    const buffer = this.ctx!.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 30);
      let noise = Math.random() * 2 - 1;

      switch (surfaceType) {
        case 'concrete': {
          const freq = 200 + t * 3000;
          const tone = Math.sin(2 * Math.PI * freq * t) * 0.3;
          data[i] = (noise * 0.7 + tone) * envelope;
          break;
        }
        case 'metal': {
          const ring = Math.sin(2 * Math.PI * 3000 * t) * Math.exp(-t * 50);
          data[i] = (noise * 0.5 + ring) * envelope;
          break;
        }
        case 'tile': {
          const click = Math.sin(2 * Math.PI * 4000 * t) * Math.exp(-t * 80);
          data[i] = (noise * 0.3 + click * 0.7) * envelope;
          break;
        }
        case 'carpet': {
          data[i] = noise * 0.5 * Math.exp(-t * 20);
          break;
        }
        case 'water': {
          const splash = Math.sin(2 * Math.PI * (200 + t * 800) * t) * 0.4;
          data[i] = (noise * 0.6 + splash) * envelope * 0.7;
          break;
        }
        case 'gravel': {
          const crunch = noise * (0.5 + Math.random() * 0.5) * Math.exp(-t * 40);
          data[i] = crunch * envelope;
          break;
        }
        default:
          data[i] = noise * envelope;
      }
    }
    return buffer;
  }

  private generateDoorSound(type: 'open' | 'locked'): AudioBuffer {
    const sampleRate = this.ctx!.sampleRate;
    const duration = type === 'open' ? 0.5 : 0.3;
    const length = Math.floor(sampleRate * duration);
    const buffer = this.ctx!.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 5);
      const noise = Math.random() * 2 - 1;

      if (type === 'open') {
        const freq = 300 + t * 600;
        const squeak = Math.sin(2 * Math.PI * freq * t) * 0.3;
        const scrape = Math.sin(2 * Math.PI * 80 * t) * 0.2;
        data[i] = (noise * 0.4 + squeak + scrape) * envelope * 0.6;
      } else {
        const clank = Math.sin(2 * Math.PI * 1500 * t) * Math.exp(-t * 60) * 0.8;
        data[i] = (noise * 0.3 + clank) * envelope * 0.5;
      }
    }
    return buffer;
  }

  private generateImpactSound(): AudioBuffer {
    const sampleRate = this.ctx!.sampleRate;
    const duration = 0.15;
    const length = Math.floor(sampleRate * duration);
    const buffer = this.ctx!.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 25);
      const noise = (Math.random() * 2 - 1) * 0.6;
      const thud = Math.sin(2 * Math.PI * (60 - t * 100) * t) * 0.4;
      data[i] = (noise + thud) * envelope;
    }
    return buffer;
  }

  get isReady(): boolean {
    return this.ready;
  }

  get context(): AudioContext | null {
    return this.ctx;
  }

  get paused(): boolean {
    return this._paused;
  }

  onFirstInteraction(): void {
    this.resume();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  startRun(): void {
    this.resume();
    this.emit('run_started');
  }

  onBiomeChanged(biome: BiomeType, _prev: BiomeType): void {
    this.playBiomeAmbient(biome);
    this.emit('biome_changed', { biome });
  }

  onAnomalyStarted(anomaly: AnomalyType): void {
    this.playAnomalyAlert();
    this.emit('anomaly_started', { anomaly });
  }

  onEntityDetected(): void {
    this.playEntityDetected();
  }

  endRun(result: string): void {
    this.stopMusic();
    this.stopAmbient();
    this.playEndSound(result);
    this.emit('run_ended', { result });
  }

  pause(): void {
    this._paused = true;
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend();
    }
  }

  resume(): void {
    this._paused = false;
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this.ctx || this.ctx.state === 'closed') {
      this.init();
    }
  }

  update(_deltaTime: number): void {
    if (!this.ready || this._paused) return;
  }

  dispose(): void {
    this.stopAmbient();
    this.stopMusic();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.ready = false;
    this.removeAllListeners();
  }
}
