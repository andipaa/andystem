/* Petikan senar realistis via sintesis fisik Karplus-Strong.
   Satu "delay line" diisi noise lalu diumpan-balik dengan redaman —
   hasilnya bunyi pluck (bukan synth), cocok untuk gitar/bass/ukulele.
   Murni Web Audio, tanpa file MP3, tetap ringan & offline-friendly. */

export type PluckVoice = "guitar" | "bass" | "ukulele";

interface VoiceOpts {
  damping: number;
  smoothPasses: number;
  seconds: number;
}

const VOICES: Record<PluckVoice, VoiceOpts> = {
  // Gitar: bright sedang, sustain sedang
  guitar: { damping: 0.996, smoothPasses: 1, seconds: 2.0 },
  // Bass: gelap, sustain panjang
  bass: { damping: 0.9982, smoothPasses: 3, seconds: 2.6 },
  // Ukulele: terang (nilon), sustain pendek
  ukulele: { damping: 0.9935, smoothPasses: 0, seconds: 1.4 },
};

export const VOICE_SECONDS: Record<PluckVoice, number> = {
  guitar: 2.0,
  bass: 2.6,
  ukulele: 1.4,
};

let ctx: AudioContext | null = null;
const cache = new Map<string, AudioBuffer>();

function getCtx(): AudioContext {
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function renderPluck(
  ac: AudioContext,
  freq: number,
  voice: PluckVoice
): AudioBuffer {
  const key = `${voice}:${freq.toFixed(2)}:${ac.sampleRate}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const { damping, smoothPasses, seconds } = VOICES[voice];
  const sr = ac.sampleRate;
  const len = Math.floor(sr * seconds);
  const buf = ac.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);

  // Panjang garis tunda = 1 periode nada
  const N = Math.max(2, Math.round(sr / freq));
  const line = new Float32Array(N);
  for (let i = 0; i < N; i++) line[i] = Math.random() * 2 - 1;

  // Pass penghalusan = kontrol terang/gelapnya petikan
  for (let p = 0; p < smoothPasses; p++) {
    for (let i = 0; i < N; i++) {
      line[i] = 0.5 * (line[i] + line[(i + 1) % N]);
    }
  }

  // Karplus-Strong: y[n] = damping * 0.5 * (y[n-N] + y[n-N-1])
  let idx = 0;
  let peak = 0;
  for (let n = 0; n < len; n++) {
    const cur = line[idx];
    const next = line[(idx + 1) % N];
    line[idx] = damping * 0.5 * (cur + next);
    data[n] = cur;
    const a = Math.abs(cur);
    if (a > peak) peak = a;
    idx++;
    if (idx === N) idx = 0;
  }

  // Normalisasi + fade-out 150ms biar tidak klik di ujung
  const norm = peak > 0 ? 0.9 / peak : 1;
  const fade = Math.floor(sr * 0.15);
  for (let n = 0; n < len; n++) {
    let v = data[n] * norm;
    if (n > len - fade) v *= (len - n) / fade;
    data[n] = v;
  }

  cache.set(key, buf);
  // Batasi cache biar tidak membengkak
  if (cache.size > 24) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  return buf;
}

export function playReference(
  freq: number,
  opts?: { voice?: PluckVoice; volume?: number }
) {
  try {
    const ac = getCtx();
    const voice = opts?.voice ?? "guitar";
    const buf = renderPluck(ac, freq, voice);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const master = ac.createGain();
    master.gain.value = opts?.volume ?? 0.9;
    src.connect(master).connect(ac.destination);
    src.start();
  } catch {
    /* abaikan */
  }
}

/* Dipanggil dari gesture klik (mis. tombol Mulai Stem) supaya
   AudioContext bunyi notifikasi sudah jalan saat dibutuhkan nanti. */
export function unlockAudio() {
  try {
    getCtx();
  } catch {
    /* abaikan */
  }
}

/* Bunyi ceklis "ding-ding" saat stem dinyatakan PAS & stabil.
   Dua nada lonceng (E6 → B6) dengan harmonik, total ±0,9 detik. */
export function playChime(volume = 0.45) {
  try {
    const ac = getCtx();
    const t0 = ac.currentTime + 0.01;
    const notes: Array<{ freq: number; at: number }> = [
      { freq: 1318.51, at: 0 }, // E6
      { freq: 1975.53, at: 0.16 }, // B6
    ];
    for (const { freq, at } of notes) {
      const t = t0 + at;
      const master = ac.createGain();
      master.gain.setValueAtTime(0.0001, t);
      master.gain.exponentialRampToValueAtTime(volume, t + 0.02);
      master.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      master.connect(ac.destination);
      for (const [mult, g] of [
        [1, 0.7],
        [2, 0.22],
        [3, 0.08],
      ] as Array<[number, number]>) {
        const osc = ac.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq * mult;
        const og = ac.createGain();
        og.gain.value = g;
        osc.connect(og).connect(master);
        osc.start(t);
        osc.stop(t + 0.75);
      }
    }
  } catch {
    /* abaikan */
  }
}
