export type InstrumentId = "guitar" | "bass" | "ukulele" | "chromatic";

export interface TunerString {
  label: string;
  note: string;
  freq: number;
}

export const INSTRUMENTS: Record<
  Exclude<InstrumentId, "chromatic">,
  { name: string; strings: TunerString[] }
> = {
  guitar: {
    name: "Gitar 6 senar (EADGBE)",
    strings: [
      { label: "E", note: "E2", freq: 82.41 },
      { label: "A", note: "A2", freq: 110.0 },
      { label: "D", note: "D3", freq: 146.83 },
      { label: "G", note: "G3", freq: 196.0 },
      { label: "B", note: "B3", freq: 246.94 },
      { label: "e", note: "E4", freq: 329.63 },
    ],
  },
  bass: {
    name: "Bass 4 senar (EADG)",
    strings: [
      { label: "E", note: "E1", freq: 41.2 },
      { label: "A", note: "A1", freq: 55.0 },
      { label: "D", note: "D2", freq: 73.42 },
      { label: "G", note: "G2", freq: 98.0 },
    ],
  },
  ukulele: {
    name: "Ukulele (GCEA)",
    strings: [
      { label: "G", note: "G4", freq: 392.0 },
      { label: "C", note: "C4", freq: 261.63 },
      { label: "E", note: "E4", freq: 329.63 },
      { label: "A", note: "A4", freq: 440.0 },
    ],
  },
};

export const INSTRUMENT_IDS: InstrumentId[] = [
  "guitar",
  "bass",
  "ukulele",
  "chromatic",
];

export const INSTRUMENT_NAMES: Record<InstrumentId, string> = {
  guitar: "Gitar",
  bass: "Bass",
  ukulele: "Ukulele",
  chromatic: "Chromatic",
};
