"use client";

import { freqToCents } from "@/lib/pitch";

interface Props {
  detected: number | null;
  targetFreq: number;
  targetName: string;
  isListening: boolean;
}

const SEGS = 21;
const MID = 10;

/* Layar LED gaya panggung konser: frekuensi presisi + cents + bar segmen.
   Marquee berjalan saat standby, angka menyala saat mendengarkan. */
export default function StageDisplay({
  detected,
  targetFreq,
  targetName,
  isListening,
}: Props) {
  const hasSignal = isListening && detected !== null && detected > 0;
  const cents = hasSignal ? freqToCents(detected!, targetFreq) : 0;
  const clamped = Math.max(-50, Math.min(50, cents));
  const lit = Math.round((Math.abs(clamped) / 50) * MID);
  const segColor =
    Math.abs(clamped) <= 5
      ? "#34d399"
      : Math.abs(clamped) <= 25
        ? "#fcd34d"
        : "#fb7185";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-300/20 bg-black/70 shadow-[0_0_30px_rgba(52,211,153,0.12)]">
      {/* Baris status */}
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-[11px] font-bold tracking-widest">
        <span className="flex items-center gap-1.5 text-white/70">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              isListening ? "anim-livedot bg-red-500" : "bg-white/25"
            }`}
            style={
              isListening
                ? { boxShadow: "0 0 8px 2px rgba(239,68,68,.8)" }
                : undefined
            }
          />
          {isListening ? (
            <span className="text-red-300">● LIVE</span>
          ) : (
            <span className="text-white/40">STANDBY</span>
          )}
        </span>
        <span className="rounded bg-white/10 px-2 py-0.5 text-amber-200">
          TARGET {targetName}
        </span>
      </div>

      {/* Layar utama */}
      {hasSignal ? (
        <div className="relative px-4 py-3 text-center">
          <div
            className="font-mono text-5xl font-black tabular-nums text-emerald-300"
            style={{ textShadow: "0 0 12px rgba(52,211,153,.8)" }}
          >
            {detected!.toFixed(1)}
            <span className="text-xl text-emerald-300/70"> Hz</span>
          </div>
          <div
            className="mt-1 font-mono text-2xl font-bold tabular-nums"
            style={{ color: segColor, textShadow: `0 0 10px ${segColor}` }}
          >
            {clamped >= 0 ? "+" : ""}
            {clamped.toFixed(0)}¢
          </div>
          {/* Bar segmen LED */}
          <div className="mx-auto mt-2 flex max-w-xs justify-center gap-[3px]">
            {Array.from({ length: SEGS }).map((_, i) => {
              const on =
                clamped === 0
                  ? i === MID
                  : clamped < 0
                    ? i < MID && MID - i <= lit
                    : i > MID && i - MID <= lit;
              return (
                <span
                  key={i}
                  className="h-4 w-2 rounded-[2px]"
                  style={{
                    background: on ? segColor : "rgba(255,255,255,.08)",
                    boxShadow: on ? `0 0 6px ${segColor}` : undefined,
                  }}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden whitespace-nowrap py-3">
          <div className="anim-marquee inline-block font-mono text-sm font-bold tracking-[0.3em] text-fuchsia-300/80">
            {"★ ANDYSTEM ★ STEM GITAR ★ PETIK SENAR ★ IKUTI JARUM SAMPAI PAS ".repeat(
              3
            )}
          </div>
        </div>
      )}

      {/* Scanlines */}
      <div className="led-scan pointer-events-none absolute inset-0" />
    </div>
  );
}
