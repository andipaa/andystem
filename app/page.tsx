"use client";

import { useMemo, useState } from "react";
import { useTuner } from "@/hooks/useTuner";
import {
  INSTRUMENTS,
  INSTRUMENT_IDS,
  INSTRUMENT_NAMES,
  type InstrumentId,
} from "@/lib/notes";
import { closestChromatic, correctOctave, snapToStrings } from "@/lib/pitch";
import {
  playChime,
  playReference,
  unlockAudio,
  VOICE_SECONDS,
  type PluckVoice,
} from "@/lib/tone";
import TunerDial from "@/components/TunerDial";
import StringSelector from "@/components/StringSelector";
import AnimatedBackground from "@/components/AnimatedBackground";
import StageDisplay from "@/components/StageDisplay";

const INSTRUMENT_STYLES: Record<InstrumentId, string> = {
  guitar: "from-amber-300 to-orange-500 text-orange-950",
  bass: "from-sky-300 to-blue-500 text-blue-950",
  ukulele: "from-emerald-300 to-teal-500 text-emerald-950",
  chromatic: "from-fuchsia-300 to-purple-500 text-purple-950",
};

export default function Home() {
  const [instrument, setInstrument] = useState<InstrumentId>("guitar");
  const [selected, setSelected] = useState(0);
  const [autoMode, setAutoMode] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const { frequency, live, level, isListening, error, start, stop, pausePreview } =
    useTuner();

  const voice: PluckVoice =
    instrument === "bass"
      ? "bass"
      : instrument === "ukulele"
        ? "ukulele"
        : "guitar";

  const strings = useMemo(
    () => (instrument === "chromatic" ? [] : INSTRUMENTS[instrument].strings),
    [instrument]
  );

  // Tentukan target + frekuensi tampil (sudah koreksi oktaf).
  // Tanpa ini, detektor yang mengunci ke harmonik 2× bikin jarum
  // mentok +50 padahal senar sudah pas.
  const { targetFreq, targetName, activeIndex, displayFreq } = useMemo(() => {
    if (instrument === "chromatic") {
      const c = frequency ? closestChromatic(frequency) : null;
      return {
        targetFreq: c?.targetFreq ?? 440,
        targetName: c?.name ?? "A4",
        activeIndex: -1,
        displayFreq: frequency,
      };
    }
    if (autoMode) {
      if (!frequency) {
        const s = strings[Math.min(selected, strings.length - 1)];
        return {
          targetFreq: s.freq,
          targetName: s.note,
          activeIndex: selected,
          displayFreq: null,
        };
      }
      const snap = snapToStrings(
        frequency,
        strings.map((s) => s.freq)
      )!;
      return {
        targetFreq: strings[snap.index].freq,
        targetName: strings[snap.index].note,
        activeIndex: snap.index,
        displayFreq: snap.freq,
      };
    }
    const s = strings[Math.min(selected, strings.length - 1)];
    return {
      targetFreq: s.freq,
      targetName: s.note,
      activeIndex: selected,
      displayFreq: frequency ? correctOctave(frequency, s.freq) : null,
    };
  }, [instrument, strings, selected, autoMode, frequency]);

  return (
    <main className="min-h-screen text-white">
      <AnimatedBackground />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 p-4">
        <header className="pt-5 text-center">
          <h1 className="bg-gradient-to-r from-amber-200 via-fuchsia-300 to-cyan-200 bg-clip-text text-4xl font-black tracking-tight text-transparent">
            🎸 andystem
          </h1>
          <p className="mt-1 text-sm text-white/70">
            Petik senar dekat mic, ikuti jarum sampai PAS
          </p>
        </header>

        <StageDisplay
          detected={displayFreq}
          targetFreq={targetFreq}
          targetName={targetName}
          isListening={isListening}
        />

        {/* Pilih instrumen */}
        <div className="grid grid-cols-4 gap-2">
          {INSTRUMENT_IDS.map((id) => (
            <button
              key={id}
              onClick={() => {
                setInstrument(id);
                setSelected(0);
              }}
              className={`rounded-2xl px-2 py-2.5 text-sm font-bold shadow transition active:scale-95 ${
                instrument === id
                  ? `bg-gradient-to-br ${INSTRUMENT_STYLES[id]}`
                  : "border border-white/10 bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              {INSTRUMENT_NAMES[id]}
            </button>
          ))}
        </div>

        {/* Tombol mic + toggle bunyi ceklis */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              unlockAudio();
              if (isListening) stop();
              else void start();
            }}
          className={`flex-1 rounded-full py-4 text-lg font-black shadow-lg transition active:scale-[0.98] ${
            isListening
              ? "bg-gradient-to-r from-rose-500 to-orange-400 text-white shadow-rose-500/40"
              : "bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 text-emerald-950 shadow-emerald-400/30 hover:brightness-105"
          }`}
        >
          {isListening ? (
            <span className="inline-flex items-center justify-center gap-2">
              <span className="eq" aria-hidden>
                <span />
                <span />
                <span />
                <span />
              </span>
              Stop Mic
            </span>
          ) : (
            "🎤 Mulai Stem"
          )}
        </button>
          <button
            onClick={() => {
              const next = !soundOn;
              setSoundOn(next);
              if (next) {
                // Preview: ketuk 🔔 langsung bunyi → ketahuan kalau audio jalan.
                unlockAudio();
                playChime(0.4);
              }
            }}
            title="Bunyi ceklis saat stem pas"
            className={`shrink-0 rounded-full px-4 text-lg shadow-lg transition active:scale-95 ${
              soundOn
                ? "bg-gradient-to-br from-amber-200 to-fuchsia-300 text-fuchsia-950"
                : "border border-white/10 bg-white/10 text-white/50"
            }`}
          >
            {soundOn ? "🔔" : "🔕"}
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-300/30 bg-rose-500/20 p-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        {/* Level mic + panduan sinyal */}
        {isListening && (
          <>
            <div className="h-2 w-full overflow-hidden rounded-full bg-black/40">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-amber-200 to-fuchsia-300 transition-all"
                style={{ width: `${Math.round(level * 100)}%` }}
              />
            </div>
            {frequency === null && (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-center text-xs text-white/70">
                {level > 0.04
                  ? "Terdengar suara tapi nadanya belum kebaca — dekatkan gitar ±10 cm ke mic & petik lebih keras."
                  : "Belum ada suara masuk — besarkan volume mic / dekatkan gitar ke mic lalu petik satu senar."}
              </div>
            )}
          </>
        )}

        <TunerDial
          detected={displayFreq}
          targetFreq={targetFreq}
          targetName={targetName}
          soundOn={soundOn}
          fresh={live && displayFreq !== null}
        />

        {instrument !== "chromatic" && (
          <StringSelector
            strings={strings}
            selected={autoMode ? activeIndex : selected}
            autoMode={autoMode}
            onSelect={(i) => {
              setSelected(i);
              setAutoMode(false);
            }}
            onToggleAuto={() => setAutoMode((v) => !v)}
            onPreview={(f) => {
              playReference(f, { voice });
              // Bekukan deteksi selama bunyi + ekornya supaya tidak
              // bocor ke mic dan menggerakkan jarum.
              pausePreview(VOICE_SECONDS[voice] * 1000 + 400);
            }}
          />
        )}

        <footer className="pb-6 pt-2 text-center text-[11px] text-white/40">
          andystem — stem gitar online
        </footer>
      </div>
    </main>
  );
}
