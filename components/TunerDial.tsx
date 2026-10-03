"use client";

import { useEffect, useRef, useState } from "react";
import { freqToCents, statusFromCents, type TuneStatus } from "@/lib/pitch";
import { playChime } from "@/lib/tone";

interface Props {
  detected: number | null;
  targetFreq: number;
  targetName: string;
  soundOn: boolean;
  /** sinyal segar masuk (false saat bacaan ditahan/hangover) */
  fresh: boolean;
}

const STATUS_STYLE: Record<TuneStatus, { label: string; pill: string }> = {
  pas: { label: "PAS ✓", pill: "bg-emerald-400 text-emerald-950" },
  dekat: { label: "Hampir pas", pill: "bg-amber-300 text-amber-950" },
  kendor: { label: "KENDOR — kencengin ↓", pill: "bg-rose-400 text-rose-950" },
  kencengan: {
    label: "KEKENCENGAN — kendorin ↑",
    pill: "bg-sky-300 text-sky-950",
  },
  diam: { label: "Petik senar...", pill: "bg-white/20 text-white/80" },
};

export default function TunerDial({
  detected,
  targetFreq,
  targetName,
  soundOn,
  fresh,
}: Props) {
  const hasSignal = detected !== null && detected > 0;
  const cents = hasSignal ? freqToCents(detected!, targetFreq) : 0;
  const clamped = Math.max(-50, Math.min(50, cents));

  // Jarum di-easing via rAF menuju target → gerakan halus, tidak patah-patah.
  // Status ikut dihitung di loop yang sama dengan hysteresis:
  // sekali PAS, tetap PAS sampai nyimpang >9 cents (anti kedip di batas ±5).
  const [disp, setDisp] = useState(0);
  const [status, setStatus] = useState<TuneStatus>("diam");
  const [locked, setLocked] = useState(false);
  const liveRef = useRef({
    cents: 0,
    clamped: 0,
    hasSignal: false,
    fresh: false,
    targetFreq: 0,
    soundOn: true,
  });
  useEffect(() => {
    liveRef.current = { cents, clamped, hasSignal, fresh, targetFreq, soundOn };
  });
  const lockRef = useRef({
    stableMs: 0,
    lastT: 0,
    locked: false,
    target: 0,
  });
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const live = liveRef.current;
      const L = lockRef.current;
      setDisp((d) => {
        const nd = d + (live.clamped - d) * 0.22;
        return Math.abs(nd - live.clamped) < 0.03 ? live.clamped : nd;
      });
      setStatus((prev) => {
        const raw = statusFromCents(live.cents, live.hasSignal);
        if (raw === "pas") return "pas";
        if (prev === "pas" && live.hasSignal && Math.abs(live.cents) <= 9)
          return "pas";
        return raw;
      });
      // Kunci PAS: nada SEGAR bertahan dalam ±8 cents selama 500ms
      // → bunyi ceklis. Nilai tahan (hangover) tidak ikut mengakumulasi.
      // Tetap terkunci selama sisa gema; lepas saat hening, petikan baru
      // yang jauh meleset (>15), atau target diganti.
      if (live.targetFreq !== L.target) {
        L.target = live.targetFreq;
        L.stableMs = 0;
        if (L.locked) {
          L.locked = false;
          setLocked(false);
        }
      }
      const now = performance.now();
      const dt = Math.min(120, now - (L.lastT || now));
      L.lastT = now;
      const dev = Math.abs(live.cents);
      if (!live.fresh) {
        L.stableMs = 0;
        if (L.locked) {
          L.locked = false;
          setLocked(false);
        }
      } else if (dev <= 8) {
        L.stableMs += dt;
        if (!L.locked && L.stableMs >= 500) {
          L.locked = true;
          setLocked(true);
          if (live.soundOn) playChime();
        }
      } else {
        L.stableMs = 0;
        if (L.locked && dev > 15) {
          L.locked = false;
          setLocked(false);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const angle = (disp / 50) * 45;

  const isPas = status === "pas";

  return (
    <div className="w-full rounded-3xl border border-white/15 bg-white/10 p-6 text-center shadow-xl shadow-fuchsia-950/30 backdrop-blur">
      <div className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">
        Target
      </div>
      <div className="bg-gradient-to-r from-amber-200 via-fuchsia-300 to-cyan-200 bg-clip-text text-7xl font-black text-transparent drop-shadow">
        {targetName}
      </div>
      <div className="mt-1 text-sm text-white/70">
        {targetFreq.toFixed(2)} Hz
        {hasSignal && (
          <span className="ml-2 font-semibold text-white">
            → {detected!.toFixed(1)} Hz ({disp >= 0 ? "+" : ""}
            {disp.toFixed(0)}¢)
          </span>
        )}
      </div>

      {/* Jarum */}
      <svg viewBox="0 0 200 112" className="mx-auto mt-4 w-full max-w-xs">
        <defs>
          <linearGradient id="dialGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="35%" stopColor="#fcd34d" />
            <stop offset="50%" stopColor="#34d399" />
            <stop offset="65%" stopColor="#fcd34d" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="url(#dialGrad)"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.9"
        />
        <line
          x1="100"
          y1="100"
          x2={100 + 70 * Math.sin((angle * Math.PI) / 180)}
          y2={100 - 70 * Math.cos((angle * Math.PI) / 180)}
          stroke={isPas ? "#34d399" : "#ffffff"}
          strokeWidth="4"
          strokeLinecap="round"
          style={{
            filter: isPas
              ? "drop-shadow(0 0 6px #34d399)"
              : "drop-shadow(0 0 4px rgba(255,255,255,.7))",
          }}
        />
        <circle cx="100" cy="100" r="7" fill="#fff" />
        <circle cx="100" cy="100" r="3" fill="#7c3aed" />
        <text x="18" y="110" fill="rgba(255,255,255,.6)" fontSize="10">
          -50
        </text>
        <text x="172" y="110" fill="rgba(255,255,255,.6)" fontSize="10">
          +50
        </text>
      </svg>

      {/* Bar cents (mengikuti jarum yang sudah halus) */}
      <div className="relative mx-auto mt-2 h-2.5 w-full max-w-xs overflow-hidden rounded-full bg-black/40">
        <div className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-white/70" />
        <div
          className={`h-full rounded-full ${
            isPas
              ? "bg-emerald-300"
              : Math.abs(disp) <= 25
                ? "bg-amber-300"
                : "bg-rose-400"
          }`}
          style={{
            width: `${Math.abs(disp)}%`,
            marginLeft: disp < 0 ? `${50 - Math.abs(disp)}%` : "50%",
          }}
        />
      </div>

      <div
        className={`mx-auto mt-4 inline-block rounded-full px-5 py-1.5 text-base font-bold shadow ${STATUS_STYLE[status].pill}`}
      >
        {STATUS_STYLE[status].label}
      </div>
      {locked && (
        <div className="mx-auto mt-2 w-fit animate-pulse rounded-full bg-emerald-400 px-5 py-1.5 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-400/40">
          ✓ Terkunci — stem sudah pas, abaikan sisa gema
        </div>
      )}
    </div>
  );
}
