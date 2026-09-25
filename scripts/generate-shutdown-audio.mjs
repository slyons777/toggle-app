/**
 * TEMPORARY DEVELOPMENT AUDIO — not final Shutdown sound design.
 * Generates threshold wash and sweep texture placeholders locally.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../www/audio');
const SAMPLE_RATE = 44100;

function writeWav(path, samples, channels = 2) {
  const numSamples = samples.length / channels;
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * channels * 2, 28);
  buffer.writeUInt16LE(channels * 2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }
  writeFileSync(path, buffer);
}

function stereo(left, right) {
  const out = new Float32Array(left.length * 2);
  for (let i = 0; i < left.length; i++) {
    out[i * 2] = left[i];
    out[i * 2 + 1] = right[i];
  }
  return out;
}

function pinkNoise(n) {
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    out[i] = (b0 + b1 + b2 + white * 0.3104856) * 0.11;
  }
  return out;
}

function envelope(n, attack, sustain, release) {
  const env = new Float32Array(n);
  const a = Math.floor(attack * n);
  const r = Math.floor(release * n);
  for (let i = 0; i < n; i++) {
    if (i < a) env[i] = i / a;
    else if (i > n - r) env[i] = (n - i) / r;
    else env[i] = sustain;
  }
  return env;
}

function lowpass(input, cutoffHz) {
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const dt = 1 / SAMPLE_RATE;
  const alpha = dt / (rc + dt);
  const out = new Float32Array(input.length);
  out[0] = input[0];
  for (let i = 1; i < input.length; i++) {
    out[i] = out[i - 1] + alpha * (input[i] - out[i - 1]);
  }
  return out;
}

function makeThresholdEnter() {
  const seconds = 3.8;
  const n = Math.floor(SAMPLE_RATE * seconds);
  const env = envelope(n, 0.08, 0.55, 0.37);
  const noise = pinkNoise(n);
  const swell = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    swell[i] = Math.sin(2 * Math.PI * 0.35 * t) * 0.18 + Math.sin(2 * Math.PI * 0.9 * t) * 0.06;
  }
  const mono = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    mono[i] = (noise[i] * 0.55 + swell[i]) * env[i] * 0.42;
  }
  const filtered = lowpass(mono, 900);
  const left = filtered.map((v, i) => v * (0.92 + 0.08 * Math.sin(i / 900)));
  const right = filtered.map((v, i) => v * (0.92 + 0.08 * Math.cos(i / 900)));
  return stereo(left, right);
}

function makeThresholdExit() {
  const seconds = 2.2;
  const n = Math.floor(SAMPLE_RATE * seconds);
  const env = envelope(n, 0.05, 0.35, 0.6);
  const noise = pinkNoise(n);
  const mono = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    mono[i] = noise[i] * env[i] * 0.28;
  }
  const filtered = lowpass(mono, 700);
  return stereo(filtered, filtered.map(v => v * 0.96));
}

function makeSweepTexture() {
  const seconds = 14;
  const n = Math.floor(SAMPLE_RATE * seconds);
  const noise = pinkNoise(n);
  const tone = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    tone[i] = Math.sin(2 * Math.PI * 110 * t) * 0.04 + Math.sin(2 * Math.PI * 112 * t) * 0.04;
  }
  const mono = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    mono[i] = (noise[i] * 0.35 + tone[i]) * 0.5;
  }
  const filtered = lowpass(mono, 1400);
  return stereo(filtered, filtered);
}

mkdirSync(outDir, { recursive: true });
writeWav(join(outDir, 'threshold-enter.wav'), makeThresholdEnter());
writeWav(join(outDir, 'threshold-exit.wav'), makeThresholdExit());
writeWav(join(outDir, 'sweep-texture.wav'), makeSweepTexture());
console.log('Generated temporary Shutdown transition audio in www/audio/');
