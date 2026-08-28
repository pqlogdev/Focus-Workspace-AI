// Web Audio API Procedural Ambient Sound Synthesizer & Notification Chimes

class AmbientSynthesizer {
  private ctx: AudioContext | null = null;
  private activeNodes: Map<string, { gain: GainNode; stop: () => void }> = new Map();
  private customAudioElements: Map<string, HTMLAudioElement> = new Map();

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
    const clampedVol = Math.max(0, Math.min(1, volume));
    const node = this.activeNodes.get(id);
    if (node && this.ctx) {
      node.gain.gain.setTargetAtTime(clampedVol, this.ctx.currentTime, 0.1);
    }
    const audioEl = this.customAudioElements.get(id);
    if (audioEl) {
      audioEl.volume = clampedVol;
    }
  }

  public stopAmbient(id: string) {
    const node = this.activeNodes.get(id);
    if (node) {
      node.stop();
      this.activeNodes.delete(id);
    }
    const audioEl = this.customAudioElements.get(id);
    if (audioEl) {
      try {
        audioEl.pause();
        audioEl.currentTime = 0;
      } catch {}
      this.customAudioElements.delete(id);
    }
  }

  public stopAll() {
    this.activeNodes.forEach((node) => node.stop());
    this.activeNodes.clear();
    this.customAudioElements.forEach((el) => {
      try {
        el.pause();
        el.currentTime = 0;
      } catch {}
    });
    this.customAudioElements.clear();
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

  // Binaural Beat generator (stereo carrier wave + delta frequency offset)
  public playBinaural(freqHz: number = 40, volume: number = 0.3) {
    const id = 'binaural-synth';
    if (this.activeNodes.has(id)) {
      this.setVolume(id, volume);
      return;
    }

    try {
      const ctx = this.getContext();
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(volume * 0.4, ctx.currentTime);
      masterGain.connect(ctx.destination);

      const baseCarrier = 216; // Pure warm fundamental carrier
      const leftFreq = baseCarrier;
      const rightFreq = baseCarrier + Math.max(1, Math.min(60, freqHz));

      const oscLeft = ctx.createOscillator();
      const oscRight = ctx.createOscillator();
      oscLeft.type = 'sine';
      oscRight.type = 'sine';
      oscLeft.frequency.setValueAtTime(leftFreq, ctx.currentTime);
      oscRight.frequency.setValueAtTime(rightFreq, ctx.currentTime);

      // Stereo splitter / panner
      if (ctx.createStereoPanner) {
        const panL = ctx.createStereoPanner();
        const panR = ctx.createStereoPanner();
        panL.pan.setValueAtTime(-0.95, ctx.currentTime);
        panR.pan.setValueAtTime(0.95, ctx.currentTime);

        oscLeft.connect(panL);
        panL.connect(masterGain);

        oscRight.connect(panR);
        panR.connect(masterGain);
      } else {
        oscLeft.connect(masterGain);
        oscRight.connect(masterGain);
      }

      oscLeft.start();
      oscRight.start();

      const stopFn = () => {
        try {
          oscLeft.stop();
          oscRight.stop();
          oscLeft.disconnect();
          oscRight.disconnect();
          masterGain.disconnect();
        } catch {}
      };

      this.activeNodes.set(id, { gain: masterGain, stop: stopFn });
    } catch (e) {
      console.warn('Binaural beat synthesis error:', e);
    }
  }

  public stopBinaural() {
    this.stopAmbient('binaural-synth');
  }

  // Play procedural or custom URL ambient sounds
  public playAmbient(id: string, type: string, initialVolume: number, url?: string) {
    const clampedVol = Math.max(0, Math.min(1, initialVolume));

    // 1. If a custom URL is provided (uploaded audio file data URL or audio stream URL)
    if (url && (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:'))) {
      if (this.customAudioElements.has(id)) {
        const audioEl = this.customAudioElements.get(id);
        if (audioEl) {
          audioEl.volume = clampedVol;
          if (audioEl.paused) {
            audioEl.play().catch(() => {});
          }
        }
        return;
      }

      try {
        const audio = new Audio(url);
        audio.loop = true;
        audio.volume = clampedVol;
        audio.crossOrigin = 'anonymous';
        audio.play().catch((e) => {
          console.log('Custom ambient audio play prevented or error:', e);
        });
        this.customAudioElements.set(id, audio);
        return;
      } catch (err) {
        console.warn('Failed to initialize ambient audio element:', err);
      }
    }

    // 2. Procedural Web Audio API synthesis
    if (this.activeNodes.has(id)) {
      this.setVolume(id, initialVolume);
      return;
    }

    try {
      const ctx = this.getContext();
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(clampedVol, ctx.currentTime);
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
        filter.frequency.setValueAtTime(type === 'thunder' ? 280 : 1200, ctx.currentTime);
        filter.Q.setValueAtTime(1.0, ctx.currentTime);

        noise.connect(filter);
        filter.connect(masterGain);
        noise.start();

        // Occasional thunder rumble
        let thunderInterval: any = null;
        if (type === 'thunder') {
          thunderInterval = setInterval(() => {
            if (!this.activeNodes.has(id)) return;
            if (Math.random() > 0.6) {
              const thOsc = ctx.createOscillator();
              const thGain = ctx.createGain();
              thOsc.type = 'triangle';
              thOsc.frequency.setValueAtTime(60 + Math.random() * 40, ctx.currentTime);
              thOsc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 1.8);
              thGain.gain.setValueAtTime(0.2, ctx.currentTime);
              thGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
              thOsc.connect(thGain);
              thGain.connect(masterGain);
              thOsc.start();
              thOsc.stop(ctx.currentTime + 1.8);
            }
          }, 4000);
        }

        stopFn = () => {
          if (thunderInterval) clearInterval(thunderInterval);
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
          if (Math.random() > 0.35) {
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
      } else if (type === 'waves') {
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
      } else if (type === 'cafe') {
        // Cafe murmur: lowpass filtered warm chatter texture + gentle cup clinks
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let b0 = 0, b1 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.95 * b0 + white * 0.05;
          b1 = 0.90 * b1 + white * 0.10;
          data[i] = (b0 + b1) * 0.7;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(550, ctx.currentTime);
        filter.Q.setValueAtTime(1.5, ctx.currentTime);

        noise.connect(filter);
        filter.connect(masterGain);
        noise.start();

        // Subtle ceramic cup/spoon clink interval
        const clinkInterval = setInterval(() => {
          if (!this.activeNodes.has(id)) return;
          if (Math.random() > 0.75) {
            const clinkOsc = ctx.createOscillator();
            const clinkGain = ctx.createGain();
            clinkOsc.type = 'sine';
            clinkOsc.frequency.setValueAtTime(2400 + Math.random() * 1200, ctx.currentTime);
            clinkGain.gain.setValueAtTime(0.02 * Math.random(), ctx.currentTime);
            clinkGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
            clinkOsc.connect(clinkGain);
            clinkGain.connect(masterGain);
            clinkOsc.start();
            clinkOsc.stop(ctx.currentTime + 0.15);
          }
        }, 2200);

        stopFn = () => {
          clearInterval(clinkInterval);
          try {
            noise.stop();
            noise.disconnect();
          } catch {}
        };
      } else if (type === 'forest') {
        // Forest breeze + gentle bird chirps
        const bufferSize = ctx.sampleRate * 3;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(600, ctx.currentTime);
        filter.Q.setValueAtTime(0.8, ctx.currentTime);

        noise.connect(filter);
        filter.connect(masterGain);
        noise.start();

        // Occasional bird warble chirp
        const birdInterval = setInterval(() => {
          if (!this.activeNodes.has(id)) return;
          if (Math.random() > 0.65) {
            const bOsc = ctx.createOscillator();
            const bGain = ctx.createGain();
            bOsc.type = 'sine';
            const baseF = 2800 + Math.random() * 1200;
            bOsc.frequency.setValueAtTime(baseF, ctx.currentTime);
            bOsc.frequency.linearRampToValueAtTime(baseF + 600, ctx.currentTime + 0.08);
            bOsc.frequency.linearRampToValueAtTime(baseF + 200, ctx.currentTime + 0.16);

            bGain.gain.setValueAtTime(0.035, ctx.currentTime);
            bGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);

            bOsc.connect(bGain);
            bGain.connect(masterGain);
            bOsc.start();
            bOsc.stop(ctx.currentTime + 0.22);
          }
        }, 1800);

        stopFn = () => {
          clearInterval(birdInterval);
          try {
            noise.stop();
            noise.disconnect();
          } catch {}
        };
      } else if (type === 'crickets') {
        // Gentle night crickets periodic bursts
        const cricketInterval = setInterval(() => {
          if (!this.activeNodes.has(id)) return;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(4500, ctx.currentTime);

          gain.gain.setValueAtTime(0.04, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09);

          osc.connect(gain);
          gain.connect(masterGain);
          osc.start();
          osc.stop(ctx.currentTime + 0.09);
        }, 320);

        stopFn = () => {
          clearInterval(cricketInterval);
        };
      } else {
        // Generic fallback ambient tone (warm soothing drone)
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(144, ctx.currentTime);
        osc.connect(masterGain);
        osc.start();
        stopFn = () => {
          try {
            osc.stop();
            osc.disconnect();
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
