// Web Audio API Procedural Ambient Sound Synthesizer & Notification Chimes

class AmbientSynthesizer {
  private ctx: AudioContext | null = null;
  private activeNodes: Map<string, { gain: GainNode; stop: () => void }> = new Map();

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setVolume(id: string, volume: number) {
    const node = this.activeNodes.get(id);
    if (node && this.ctx) {
      node.gain.gain.setTargetAtTime(Math.max(0, Math.min(1, volume)), this.ctx.currentTime, 0.1);
    }
  }

  public stopAmbient(id: string) {
    const node = this.activeNodes.get(id);
    if (node) {
      node.stop();
      this.activeNodes.delete(id);
    }
  }

  public stopAll() {
    this.activeNodes.forEach((node) => node.stop());
    this.activeNodes.clear();
  }

  // Tactile mechanical switch click sound (high-frequency tactile impulse)
  public playClick(pitch: 'high' | 'low' | 'switch' = 'high') {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (pitch === 'switch') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      } else if (pitch === 'low') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.03);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.02);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {}
  }

  // Timer notification bell chime with customizable sound timbre
  public playChime(type: 'work' | 'break' | 'alert' | 'zen-bell' | 'bowl' | 'marimba' | 'modern' | 'silent' = 'zen-bell') {
    if (type === 'silent') return;

    try {
      const ctx = this.getContext();

      if (type === 'bowl') {
        // Tibetan Singing Bowl (rich sub-harmonics, long soothing resonance)
        const freqs = [216, 432, 648]; // Fundamental + harmonics
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          
          const vol = 0.25 / (idx + 1);
          gain.gain.setValueAtTime(vol, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 3.0);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 3.0);
        });
        return;
      }

      if (type === 'marimba') {
        // Gentle warm wooden marimba arpeggio (C4, E4, G4, C5)
        const notes = [261.63, 329.63, 392.00, 523.25];
        notes.forEach((freq, i) => {
          const startTime = ctx.currentTime + i * 0.12;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.2, startTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.6);
        });
        return;
      }

      if (type === 'modern') {
        // Minimalist high-tech dual chime
        const notes = [659.25, 880];
        notes.forEach((freq, i) => {
          const startTime = ctx.currentTime + i * 0.15;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.25, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.8);
        });
        return;
      }

      // Default: Zen Bell / Work / Break
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      if (type === 'break') {
        osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        osc.frequency.exponentialRampToValueAtTime(523.25, ctx.currentTime + 0.4); // C5
      } else if (type === 'alert') {
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5); // A4
      } else {
        // 'zen-bell' or 'work'
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.3); // E5
        osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.6); // G5
      }

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.8);
    } catch {
      // Audio context error fallback
    }
  }

  // Play procedural ambient sounds
  public playAmbient(id: string, type: string, initialVolume: number) {
    if (this.activeNodes.has(id)) {
      this.setVolume(id, initialVolume);
      return;
    }

    try {
      const ctx = this.getContext();
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(initialVolume, ctx.currentTime);
      masterGain.connect(ctx.destination);

      let stopFn = () => {};

      if (type === 'rain' || type === 'whitenoise' || type === 'thunder') {
        // Pink / Pink noise generator
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = buffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          output[i] *= 0.11;
          b6 = white * 0.115926;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = type === 'thunder' ? 'lowpass' : 'bandpass';
        filter.frequency.setValueAtTime(type === 'thunder' ? 300 : 1200, ctx.currentTime);
        filter.Q.setValueAtTime(1.0, ctx.currentTime);

        noise.connect(filter);
        filter.connect(masterGain);
        noise.start();

        stopFn = () => {
          try {
            noise.stop();
            noise.disconnect();
          } catch {}
        };
      } else if (type === 'fireplace') {
        // Low brown noise + crackle pops
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = data[i];
          data[i] *= 3.5;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, ctx.currentTime);

        noise.connect(filter);
        filter.connect(masterGain);
        noise.start();

        // Random pops for crackle
        const interval = setInterval(() => {
          if (!this.activeNodes.has(id)) return;
          if (Math.random() > 0.4) {
            const popOsc = ctx.createOscillator();
            const popGain = ctx.createGain();
            popOsc.type = 'triangle';
            popOsc.frequency.setValueAtTime(100 + Math.random() * 400, ctx.currentTime);
            popGain.gain.setValueAtTime(0.08 * Math.random(), ctx.currentTime);
            popGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
            popOsc.connect(popGain);
            popGain.connect(masterGain);
            popOsc.start();
            popOsc.stop(ctx.currentTime + 0.05);
          }
        }, 150);

        stopFn = () => {
          clearInterval(interval);
          try {
            noise.stop();
            noise.disconnect();
          } catch {}
        };
      } else if (type === 'waves' || type === 'forest') {
        // Modulated noise swell
        const bufferSize = ctx.sampleRate * 4;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, ctx.currentTime);

        const lfo = ctx.createOscillator();
        lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // 8s wave swell cycle

        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(300, ctx.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        noise.connect(filter);
        filter.connect(masterGain);

        noise.start();
        lfo.start();

        stopFn = () => {
          try {
            noise.stop();
            lfo.stop();
          } catch {}
        };
      } else {
        // Generic fallback ambient tone
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.connect(masterGain);
        osc.start();
        stopFn = () => {
          try {
            osc.stop();
          } catch {}
        };
      }

      this.activeNodes.set(id, { gain: masterGain, stop: stopFn });
    } catch {
      // Audio synth fallback
    }
  }
}

export const audioSynth = new AmbientSynthesizer();
