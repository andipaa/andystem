const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

export function freqToCents(detected: number, target: number): number {
  if (!detected || !target || detected <= 0 || target <= 0) return 0;
  return 1200 * Math.log2(detected / target);
}

export interface ClosestNote {
  name: string;
  midi: number;
  targetFreq: number;
  cents: number;
}

export function closestChromatic(freq: number): ClosestNote | null {
  if (!freq || freq <= 0) return null;
  const midi = Math.round(69 + 12 * Math.log2(freq / 440));
  const targetFreq = 440 * Math.pow(2, (midi - 69) / 12);
  const name = NOTE_NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
  return { name, midi, targetFreq, cents: freqToCents(freq, targetFreq) };
}

export type TuneStatus = "pas" | "dekat" | "kendor" | "kencengan" | "diam";

export function statusFromCents(cents: number, hasSignal: boolean): TuneStatus {
  if (!hasSignal) return "diam";
  const a = Math.abs(cents);
  if (a <= 5) return "pas";
  if (a <= 25) return "dekat";
  return cents < 0 ? "kendor" : "kencengan";
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export interface StringSnap {
  /** frekuensi setelah koreksi oktaf */
  freq: number;
  /** index senar yang paling cocok */
  index: number;
  cents: number;
}

/* Pilih faktor oktaf (½×, 1×, 2×) yang paling dekat ke target.
   YIN/AMDF kadang mengunci ke harmonik 2× / sub-harmonik ½×
   karena harmonik gitar kuat — tanpa koreksi, jarum bisa
   mentok +50 padahal senar sudah pas.
   Koreksi hanya dipakai kalau JAUH lebih cocok (selisih >150c),
   supaya nada yang memang sedikit meleset tidak "dilompatkan"
   ke senar lain. */
const OCTAVE_MARGIN = 150;

export function correctOctave(freq: number, target: number): number {
  if (!freq || freq <= 0 || !target || target <= 0) return freq;
  const direct = Math.abs(freqToCents(freq, target));
  const down = freqToCents(freq / 2, target);
  const up = freqToCents(freq * 2, target);
  // Seri imbang → utamakan koreksi turun (detektor lebih sering
  // salah ke oktaf atas daripada ke oktaf bawah).
  const oct = Math.abs(down) <= Math.abs(up) + 1 ? down : up;
  const octF = oct === down ? freq / 2 : freq * 2;
  return Math.abs(oct) + OCTAVE_MARGIN < direct ? octF : freq;
}

/* Versi multi-senar untuk mode Auto: cari (senar, oktaf) dengan
   jarak cents terkecil, dengan margin yang sama. */
export function snapToStrings(
  freq: number,
  targets: number[]
): StringSnap | null {
  if (!freq || freq <= 0 || targets.length === 0) return null;
  let direct: StringSnap | null = null;
  let oct: StringSnap | null = null;
  for (let i = 0; i < targets.length; i++) {
    const c1 = freqToCents(freq, targets[i]);
    if (!direct || Math.abs(c1) < Math.abs(direct.cents)) {
      direct = { freq, index: i, cents: c1 };
    }
    const cDown = freqToCents(freq / 2, targets[i]);
    const cUp = freqToCents(freq * 2, targets[i]);
    const cand =
      Math.abs(cDown) <= Math.abs(cUp) + 1
        ? { freq: freq / 2, index: i, cents: cDown }
        : { freq: freq * 2, index: i, cents: cUp };
    if (!oct || Math.abs(cand.cents) < Math.abs(oct.cents) - 1) {
      oct = cand;
    }
  }
  if (oct && (!direct || Math.abs(oct.cents) + OCTAVE_MARGIN < Math.abs(direct.cents))) {
    return oct;
  }
  return direct;
}
