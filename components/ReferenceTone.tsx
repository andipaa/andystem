"use client";

import { useState } from "react";
import { playReference } from "@/lib/tone";

export default function ReferenceTone({
  freq,
  label,
}: {
  freq: number;
  label: string;
}) {
  const [playing, setPlaying] = useState(false);

  const play = () => {
    playReference(freq);
    setPlaying(true);
    setTimeout(() => setPlaying(false), 1700);
  };

  return (
    <button
      onClick={play}
      className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-100 hover:border-zinc-600"
    >
      {playing ? "⏸ Memutar..." : `🔊 Contoh nada ${label} (${freq.toFixed(1)} Hz)`}
    </button>
  );
}
