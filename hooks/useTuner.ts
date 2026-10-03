"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Pitchfinder from "pitchfinder";
import { median } from "@/lib/pitch";

interface UseTunerResult {
  frequency: number | null;
  clarity: number;
  level: number;
  isListening: boolean;
  /** true hanya saat sinyal segar masuk (bukan nilai tahan/hangover) */
  live: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  /** Bekukan deteksi selama ms (mis. saat bunyi referensi diputar
      supaya tidak bocor ke mic dan menggerakkan jarum). */
  pausePreview: (ms: number) => void;
}

type Detector = (buf: Float32Array) => number | null;

export function useTuner(): UseTunerResult {
  const [frequency, setFrequency] = useState<number | null>(null);
  const [clarity, setClarity] = useState(0);
  const [level, setLevel] = useState(0);
  const [live, setLive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const historyRef = useRef<number[]>([]);
  const emaRef = useRef<number | null>(null);
  const lastShownRef = useRef<number | null>(null);
  const lastLevelAtRef = useRef(0);
  const liveRef = useRef(false);
  const suspendUntilRef = useRef(0);

  const pausePreview = useCallback((ms: number) => {
    suspendUntilRef.current = performance.now() + ms;
  }, []);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    historyRef.current = [];
    emaRef.current = null;
    lastShownRef.current = null;
    liveRef.current = false;
    suspendUntilRef.current = 0;
    setIsListening(false);
    setFrequency(null);
    setLive(false);
    setLevel(0);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      if (!window.isSecureContext && window.location.hostname !== "localhost") {
        setError("Mic butuh HTTPS. Aktifkan SSL di InfinityFree.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctx({ latencyHint: "interactive" });
      ctxRef.current = ctx;
      await ctx.resume();

      const src = ctx.createMediaStreamSource(stream);
      // Penguat input: mic laptop tanpa auto-gain sering pelan,
      // petikan gitar cepat meluruh di bawah ambang → jarum mati.
      const boost = ctx.createGain();
      boost.gain.value = 4;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096; // ±85ms @48kHz: cukup untuk E2, ringan di CPU
      src.connect(boost);
      boost.connect(analyser);

      // YIN dilonggarkan (default 0.1/0.1 terlalu ketat untuk petikan
      // pelan senar tinggi): false-positive dijaga oleh validasi silang
      // AMDF + median + koreksi oktaf di hilir.
      const yin: Detector = Pitchfinder.YIN({
        sampleRate: ctx.sampleRate,
        threshold: 0.2,
        probabilityThreshold: 0.05,
      });
      const PF = Pitchfinder as unknown as Record<string, unknown>;
      const amdf: Detector | null =
        typeof PF.AMDF === "function"
          ? (PF.AMDF as (o: { sampleRate: number }) => Detector)({
              sampleRate: ctx.sampleRate,
            })
          : null;

      const N = analyser.fftSize;
      const buf = new Float32Array(N);
      const clean = new Float32Array(N);

      // Pelacak noise floor ADAPTIF (ganti kalibrasi sekali-jalan yang rapuh:
      // kalau 0,5 detik pertama kepotong bunyi, ambang ketinggian selamanya).
      // Turun instan saat hening, naik pelan hanya saat sinyal lemah
      // (beku saat petikan keras) → pulih sendiri dari kalibrasi apes.
      let floor = -1;
      let gate = 0.006;
      // YIN itu O(n²): jalan tiap frame 60fps bikin CPU ngos-ngosan
      // (deteksi telat & tidak stabil). Cukup tiap ±90ms; jarum tetap
      // 60fps karena di-easing di UI.
      let lastDetectAt = 0;
      // Lewati 1 frame pertama tiap petikan: attack transient petikan
      // (+20–50 cents) bukan nada sebenarnya. (Dulu 2 frame — sustain
      // pendek senar tinggi keburu habis.)
      let attackSkip = 0;
      // Hangover: tahan bacaan terakhir 250ms setelah sinyal hilang
      // biar jarum tidak langsung jatuh (sustain senar B/e pendek).
      let lastLiveAt = 0;

      const loop = () => {
        analyser.getFloatTimeDomainData(buf);

        // Hapus DC-offset mic (biasanya bikin YIN gagal total) + hitung RMS.
        let mean = 0;
        for (let i = 0; i < N; i++) mean += buf[i];
        mean /= N;
        let sum = 0;
        for (let i = 0; i < N; i++) {
          const v = buf[i] - mean;
          clean[i] = v;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / N);

        if (floor < 0) {
          floor = rms;
        } else if (rms < floor) {
          floor = rms;
        } else if (rms < gate * 3) {
          floor += (rms - floor) * 0.002;
        }
        gate = Math.min(Math.max(floor * 2.5, 0.003), 0.04);

        const now = performance.now();
        if (now - lastLevelAtRef.current > 100) {
          lastLevelAtRef.current = now;
          setLevel(Math.min(1, rms * 4));
        }

        if (rms < gate) {
          // Masih dalam masa hangover → tahan bacaan, tandai tidak live.
          const holding =
            lastShownRef.current !== null && now - lastLiveAt < 250;
          attackSkip = 1; // petikan berikutnya lewati attack dulu
          if (!holding) {
            historyRef.current = [];
            emaRef.current = null;
            if (lastShownRef.current !== null) {
              lastShownRef.current = null;
              setFrequency(null);
            }
          }
          if (liveRef.current) {
            liveRef.current = false;
            setLive(false);
          }
          setClarity(0);
          rafRef.current = requestAnimationFrame(loop);
          return;
        }
        // Jeda preview: bunyi referensi sedang diputar → abaikan mic
        // supaya tidak bocor ke jarum. Bacaan ditahan, kunci tidak jalan.
        if (now < suspendUntilRef.current) {
          if (liveRef.current) {
            liveRef.current = false;
            setLive(false);
          }
          setClarity(0);
          rafRef.current = requestAnimationFrame(loop);
          return;
        }
        lastLiveAt = now;
        if (!liveRef.current) {
          liveRef.current = true;
          setLive(true);
        }

        if (now - lastDetectAt < 90) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }
        lastDetectAt = now;

        if (attackSkip > 0) {
          attackSkip--;
          rafRef.current = requestAnimationFrame(loop);
          return;
        }

        // Validasi silang YIN × AMDF: kalau keduanya valid tapi beda
        // >4%, frame dibuang (glitch sesaat) — bukan dirata-rata.
        // Kalau sepakat, dirata-rata → lebih akurat dari satu algoritma.
        const y = yin(clean);
        let a: number | null = null;
        if (amdf) {
          try {
            a = amdf(clean);
          } catch {
            a = null;
          }
        }
        const yOk = y !== null && y > 30 && y < 2000;
        const aOk = a !== null && a > 30 && a < 2000;
        let f: number | null = null;
        if (yOk && aOk) {
          const yv = y as number;
          const av = a as number;
          f = Math.abs(yv - av) / av < 0.04 ? (yv + av) / 2 : null;
        } else if (yOk) {
          f = y;
        } else if (aOk) {
          f = a;
        }

        if (f && f > 30 && f < 2000) {
          const hist = historyRef.current;
          if (hist.length > 0) {
            // Petikan baru: beda >6% (≈100 cents) → buang sisa nada lama
            // biar jarum tidak tertahan/goyang di antara dua nada.
            const ref = median(hist);
            if (Math.abs(f - ref) / ref > 0.06) {
              hist.length = 0;
              emaRef.current = null;
            }
          }
          hist.push(f);
          if (hist.length > 6) hist.shift();
          const med = median(hist);
          // EMA adaptif: sinyal kuat → responsif, sinyal lemah (sustain
          // meluruh) → redam lebih berat biar tidak goyang.
          const alpha = rms > 0.08 ? 0.45 : rms > 0.02 ? 0.3 : 0.18;
          const prevEma = emaRef.current;
          const ema = prevEma === null ? med : prevEma + alpha * (med - prevEma);
          emaRef.current = ema;
          const prev = lastShownRef.current;
          if (prev === null || Math.abs(ema - prev) > 0.05) {
            lastShownRef.current = ema;
            setFrequency(ema);
          }
          setClarity(1);
        } else {
          setClarity(0);
        }
        rafRef.current = requestAnimationFrame(loop);
      };

      historyRef.current = [];
      emaRef.current = null;
      lastShownRef.current = null;
      setIsListening(true);
      loop();
    } catch (e) {
      const msg =
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Izin mic ditolak. Klik ikon gembok di address bar lalu Allow."
          : e instanceof Error
            ? e.message
            : "Gagal akses mic.";
      setError(msg);
      setIsListening(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  return {
    frequency,
    clarity,
    level,
    live,
    isListening,
    error,
    start,
    stop,
    pausePreview,
  };
}
