const fs = require('fs');
const path = require('path');

// Helper to write PCM WAV file
function createWavBuffer(sampleRate, durationSec, generateSample) {
  const numSamples = Math.floor(sampleRate * durationSec);
  const blockAlign = 2 * 2; // 16-bit stereo
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // subchunk1 size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(2, 22); // Stereo
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // 16 bits per sample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const [leftSample, rightSample] = generateSample(t, i, numSamples);
    
    // Clamp to -1.0 to 1.0
    const clampedL = Math.max(-1, Math.min(1, leftSample));
    const clampedR = Math.max(-1, Math.min(1, rightSample));

    const intL = Math.floor(clampedL * 32767);
    const intR = Math.floor(clampedR * 32767);

    buffer.writeInt16LE(intL, offset);
    buffer.writeInt16LE(intR, offset + 2);
    offset += 4;
  }

  return buffer;
}

const sampleRate = 44100;
const outputDir = path.join(__dirname, '../public/audio');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 1. Midnight Coffee & Lofi Beats (Warm jazzy minor 7th chord progression + vinyl hiss)
console.log('Generating lofi-study.wav...');
const chords1 = [
  [261.63, 329.63, 392.00, 493.88], // Cmaj7
  [220.00, 261.63, 329.63, 392.00], // Am7
  [174.61, 220.00, 261.63, 329.63], // Fmaj7
  [196.00, 246.94, 293.66, 349.23], // G7
];
const lofiStudyWav = createWavBuffer(sampleRate, 16.0, (t) => {
  const chordIdx = Math.floor((t % 16) / 4);
  const chord = chords1[chordIdx];
  const chordTime = t % 4;
  
  // Soft Rhodes / Piano envelope
  let sound = 0;
  const decay = Math.exp(-chordTime * 0.8);
  chord.forEach((freq, idx) => {
    sound += Math.sin(2 * Math.PI * freq * t) * (0.12 / (idx + 1)) * decay;
    sound += Math.sin(2 * Math.PI * (freq * 2) * t) * 0.03 * decay;
  });

  // Gentle vinyl crackle
  const vinylNoise = (Math.random() * 2 - 1) * 0.008;
  const left = sound * 0.8 + vinylNoise;
  const right = sound * 0.8 + (Math.random() * 2 - 1) * 0.008;

  return [left, right];
});
fs.writeFileSync(path.join(outputDir, 'lofi-study.mp3'), lofiStudyWav);

// 2. Rainy Alleyway Synth Chill (Warm synth pad + gentle filter sweep)
console.log('Generating chill-lofi.wav...');
const chords2 = [
  [146.83, 220.00, 261.63, 329.63], // Dm7
  [164.81, 246.94, 293.66, 392.00], // Em7
  [174.61, 261.63, 329.63, 440.00], // Fmaj7
  [196.00, 246.94, 349.23, 392.00], // G7
];
const chillLofiWav = createWavBuffer(sampleRate, 16.0, (t) => {
  const chordIdx = Math.floor((t % 16) / 4);
  const chord = chords2[chordIdx];
  const padLFO = (Math.sin(2 * Math.PI * 0.25 * t) + 1) * 0.5;

  let soundL = 0;
  let soundR = 0;
  chord.forEach((freq, idx) => {
    soundL += Math.sin(2 * Math.PI * freq * t) * 0.1 * (0.8 + 0.2 * padLFO);
    soundR += Math.sin(2 * Math.PI * (freq * 1.002) * t) * 0.1 * (0.8 + 0.2 * padLFO);
  });

  return [soundL, soundR];
});
fs.writeFileSync(path.join(outputDir, 'chill-lofi.mp3'), chillLofiWav);

// 3. Study Session in Tokyo (Ambient electric piano)
console.log('Generating tokyo-ambient.wav...');
const tokyoWav = createWavBuffer(sampleRate, 16.0, (t) => {
  const chordIdx = Math.floor((t % 16) / 4);
  const chord = chords1[(chordIdx + 2) % 4];
  const pulse = Math.sin(2 * Math.PI * 2 * t);
  let sound = 0;
  chord.forEach((freq) => {
    sound += Math.sin(2 * Math.PI * freq * t) * 0.08 * (0.9 + 0.1 * pulse);
  });
  return [sound, sound];
});
fs.writeFileSync(path.join(outputDir, 'tokyo-ambient.mp3'), tokyoWav);

// 4. Celestial Piano & Gentle Strings
console.log('Generating calm-piano.wav...');
const pianoWav = createWavBuffer(sampleRate, 16.0, (t) => {
  const chordIdx = Math.floor((t % 16) / 4);
  const chord = chords2[chordIdx];
  const chordTime = t % 4;
  const decay = Math.exp(-chordTime * 0.6);
  let sound = 0;
  chord.forEach((freq) => {
    sound += Math.sin(2 * Math.PI * freq * t) * 0.1 * decay;
  });
  return [sound, sound];
});
fs.writeFileSync(path.join(outputDir, 'calm-piano.mp3'), pianoWav);

// 5. Tea Time Breeze (Acoustic chill)
console.log('Generating acoustic-chill.wav...');
const acousticWav = createWavBuffer(sampleRate, 16.0, (t) => {
  const chordIdx = Math.floor((t % 16) / 4);
  const chord = chords1[chordIdx];
  let sound = 0;
  chord.forEach((freq, idx) => {
    const pluck = Math.exp(-(t % 1) * 3);
    sound += Math.sin(2 * Math.PI * freq * t) * 0.09 * pluck;
  });
  return [sound, sound];
});
fs.writeFileSync(path.join(outputDir, 'acoustic-chill.mp3'), acousticWav);

// 6. Gentle Ocean Sunbeams (Ambient relax)
console.log('Generating ambient-relax.wav...');
const oceanWav = createWavBuffer(sampleRate, 16.0, (t) => {
  const chordIdx = Math.floor((t % 16) / 4);
  const chord = chords2[chordIdx];
  const swell = (Math.sin(2 * Math.PI * 0.125 * t) + 1) * 0.5;
  let sound = 0;
  chord.forEach((freq) => {
    sound += Math.sin(2 * Math.PI * freq * t) * 0.08 * swell;
  });
  return [sound, sound];
});
fs.writeFileSync(path.join(outputDir, 'ambient-relax.mp3'), oceanWav);

console.log('Successfully generated all self-hosted audio assets in public/audio!');
