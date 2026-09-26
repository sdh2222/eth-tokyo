import { useId, type ChangeEvent } from "react";

// A dotted slider (the reference the team shared): a track of small dots that get denser
// and darker up to the handle, and a white handle. The input underneath is a native range
// input, so keyboard, touch and screen readers work as usual. Styles: .v-slider in v.css.

const COLS = 48;
const ROWS = 3;
const GAP = 8;

// A fixed pseudo-random value per dot, so the texture is dithered but does not flicker.
function grain(index: number): number {
  const x = Math.sin(index * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function DotSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  display?: string;
}) {
  const id = useId();
  const span = max - min || 1;
  const t = Math.max(0, Math.min(1, (value - min) / span));
  const filled = t * COLS;
  const dots = [];
  for (let col = 0; col < COLS; col += 1) {
    for (let row = 0; row < ROWS; row += 1) {
      const index = col * ROWS + row;
      const on = col < filled;
      // Up to the handle the dots darken toward it; past it they stay faint.
      const ramp = on ? 0.18 + 0.82 * Math.pow((col + 1) / Math.max(filled, 1), 1.6) : 0;
      const opacity = on ? Math.min(1, ramp * (0.7 + 0.6 * grain(index))) : 0.18 + 0.1 * grain(index);
      dots.push(
        <circle
          key={index}
          cx={GAP / 2 + col * GAP}
          cy={GAP / 2 + row * GAP}
          r={on ? 1.6 : 1.1}
          className={on ? "v-slider-dot-on" : "v-slider-dot"}
          opacity={opacity}
        />,
      );
    }
  }
  return (
    <div className="v-slider">
      <div className="v-slider-head">
        <label htmlFor={id} className="v-label">
          {label}
        </label>
        <span className="v-num">{display ?? String(value)}</span>
      </div>
      <div className="v-slider-track">
        <svg viewBox={`0 0 ${COLS * GAP} ${ROWS * GAP}`} preserveAspectRatio="none" aria-hidden="true">
          {dots}
        </svg>
        <span className="v-slider-handle" data-at={Math.round(t * 100)} style={{ left: `calc(${t * 100}% - ${t * 28}px)` }} />
        <input
          id={id}
          className="v-slider-input"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(Number(event.target.value))}
        />
      </div>
    </div>
  );
}
