"use client";

import type { TunerString } from "@/lib/notes";

interface Props {
  strings: TunerString[];
  selected: number;
  autoMode: boolean;
  onSelect: (i: number) => void;
  onToggleAuto: () => void;
  onPreview: (freq: number) => void;
}

const STRING_GRADIENTS = [
  "from-amber-300 to-orange-500",
  "from-lime-300 to-emerald-500",
  "from-teal-300 to-cyan-500",
  "from-sky-300 to-blue-500",
  "from-violet-300 to-purple-500",
  "from-fuchsia-300 to-pink-500",
];

export default function StringSelector({
  strings,
  selected,
  autoMode,
  onSelect,
  onToggleAuto,
  onPreview,
}: Props) {
  return (
    <div className="w-full rounded-3xl border border-white/15 bg-white/10 p-4 shadow-xl shadow-indigo-950/30 backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-white/80">
          Senar — ketuk untuk bunyi & kunci
        </span>
        <button
          onClick={onToggleAuto}
          className={`rounded-full px-4 py-1 text-sm font-bold shadow transition ${
            autoMode
              ? "bg-gradient-to-r from-emerald-300 to-cyan-300 text-emerald-950"
              : "bg-white/15 text-white/80 hover:bg-white/25"
          }`}
        >
          Auto: {autoMode ? "ON" : "OFF"}
        </button>
      </div>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${strings.length}, 1fr)` }}
      >
        {strings.map((s, i) => {
          const active = i === selected;
          return (
            <button
              key={s.note + i}
              onClick={() => {
                onSelect(i);
                onPreview(s.freq);
              }}
              className={`rounded-2xl border px-1 py-3 text-center transition active:scale-95 ${
                active
                  ? `border-transparent bg-gradient-to-b ${STRING_GRADIENTS[i % STRING_GRADIENTS.length]} text-slate-950 shadow-lg`
                  : "border-white/10 bg-black/30 text-white hover:bg-black/50"
              }`}
            >
              <div className="text-xl font-black">{s.label}</div>
              <div
                className={`text-[11px] font-semibold ${active ? "text-slate-800" : "text-white/50"}`}
              >
                {s.note}
              </div>
              <div className="mt-1 text-sm">🔊</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
