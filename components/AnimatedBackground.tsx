"use client";

const DUST = [
  { left: "42%", top: "18%", size: 4, dur: 9, delay: -1 },
  { left: "48%", top: "30%", size: 3, dur: 11, delay: -4 },
  { left: "55%", top: "14%", size: 5, dur: 13, delay: -7 },
  { left: "38%", top: "42%", size: 3, dur: 10, delay: -3 },
  { left: "60%", top: "36%", size: 4, dur: 12, delay: -9 },
  { left: "50%", top: "52%", size: 3, dur: 9, delay: -6 },
  { left: "45%", top: "62%", size: 4, dur: 14, delay: -2 },
  { left: "57%", top: "58%", size: 3, dur: 11, delay: -8 },
  { left: "33%", top: "24%", size: 3, dur: 12, delay: -5 },
  { left: "65%", top: "22%", size: 4, dur: 10, delay: -10 },
  { left: "52%", top: "8%", size: 3, dur: 13, delay: -12 },
  { left: "44%", top: "70%", size: 4, dur: 9, delay: -11 },
];

const LEDS = [
  "#f87171",
  "#fbbf24",
  "#34d399",
  "#22d3ee",
  "#a78bfa",
  "#f472b6",
  "#f87171",
  "#34d399",
];

export default function AnimatedBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 overflow-hidden bg-[#06030c]"
    >
      {/* Haze ungu dari atas panggung */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 50% 0%, rgba(124,58,237,.30), transparent 70%)",
        }}
      />

      {/* Spotlight utama (putih hangat, goyang pelan) */}
      <div
        className="anim-spot absolute -top-10 left-1/2 h-[75vh] w-72"
        style={{
          background:
            "linear-gradient(to bottom, rgba(255,244,214,.55), rgba(255,244,214,.07) 70%, transparent)",
        }}
      />
      {/* Beam moving-head kiri (magenta) */}
      <div
        className="anim-spot absolute -top-10 left-[12%] h-[70vh] w-40"
        style={{
          background:
            "linear-gradient(to bottom, rgba(232,121,249,.5), rgba(232,121,249,.06) 70%, transparent)",
          animationDuration: "12s",
          animationDelay: "-4s",
        }}
      />
      {/* Beam moving-head kanan (cyan) */}
      <div
        className="anim-spot absolute -top-10 left-[88%] h-[70vh] w-40"
        style={{
          background:
            "linear-gradient(to bottom, rgba(34,211,238,.45), rgba(34,211,238,.06) 70%, transparent)",
          animationDuration: "14s",
          animationDelay: "-9s",
        }}
      />

      {/* Truss + deret lampu panggung */}
      <div className="absolute inset-x-0 top-0 flex flex-col items-center">
        <div className="h-2 w-full bg-black/70" />
        <div className="flex gap-6 pt-2">
          {LEDS.map((c, i) => (
            <span
              key={i}
              className="anim-led inline-block h-2.5 w-2.5 rounded-full"
              style={{
                background: c,
                boxShadow: `0 0 12px 3px ${c}`,
                animationDelay: `${-i * 0.45}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Debu melayang di berkas cahaya */}
      {DUST.map((d, i) => (
        <span
          key={i}
          className="anim-dust absolute rounded-full bg-amber-100"
          style={{
            left: d.left,
            top: d.top,
            width: d.size,
            height: d.size,
            animationDuration: `${d.dur}s`,
            animationDelay: `${d.delay}s`,
          }}
        />
      ))}

      {/* Pantulan cahaya lantai panggung */}
      <div
        className="absolute inset-x-0 bottom-0 h-44"
        style={{
          background:
            "linear-gradient(to top, rgba(217,70,239,.20), rgba(124,58,237,.06) 60%, transparent)",
        }}
      />

      {/* Siluet penonton */}
      <svg
        viewBox="0 0 400 90"
        preserveAspectRatio="xMidYMax slice"
        className="anim-crowd absolute inset-x-0 bottom-0 h-24 w-full"
      >
        <g fill="#0a0614">
          <rect x="0" y="70" width="400" height="20" />
          {[12, 42, 75, 108, 140, 172, 205, 238, 270, 303, 336, 368, 392].map(
            (x, i) => (
              <circle key={x} cx={x} cy={62 - (i % 3) * 4} r={11} />
            )
          )}
          {/* Tangan-tangan terangkat */}
          <rect x="30" y="18" width="8" height="40" rx="4" transform="rotate(-12 34 38)" />
          <rect x="96" y="12" width="8" height="44" rx="4" transform="rotate(10 100 34)" />
          <rect x="188" y="16" width="8" height="42" rx="4" transform="rotate(-8 192 37)" />
          <rect x="262" y="12" width="8" height="44" rx="4" transform="rotate(12 266 34)" />
          <rect x="330" y="18" width="8" height="40" rx="4" transform="rotate(-10 334 38)" />
          <rect x="150" y="26" width="7" height="32" rx="3.5" transform="rotate(14 153 42)" />
          <rect x="228" y="28" width="7" height="30" rx="3.5" transform="rotate(-14 231 43)" />
        </g>
      </svg>
    </div>
  );
}
