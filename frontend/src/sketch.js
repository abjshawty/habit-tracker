import React from 'react';
import { Path, G, Defs, ClipPath, Rect } from 'react-native-svg';

export const SK = {
  INK: '#1a1814',
  PAPER: '#f5f3ef',
  MUTED: 'rgba(26,24,20,0.45)',
  FAINT: 'rgba(26,24,20,0.18)',
  ACCENT: '#3d8c7c',
};

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function SketchCircle({ cx, cy, r, stroke = SK.INK, strokeWidth = 1.2, fill = 'none', seed = 1 }) {
  const rand = seeded(seed);
  const j = () => (rand() - 0.5) * 1.6;
  const n = 16;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * (r + j()), cy + Math.sin(a) * (r + j())]);
  }
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ') + ' Z';
  return <Path d={d} stroke={stroke} strokeWidth={strokeWidth} fill={fill} strokeLinejoin="round" />;
}

export function SketchHatch({ x, y, w, h, stroke = SK.INK, spacing = 4, seed = 1, opacity = 1 }) {
  const rand = seeded(seed);
  const rad = (-30 * Math.PI) / 180;
  const len = Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad));
  const count = Math.ceil((w + h) / spacing);
  const clipId = `hc-${seed}-${Math.round(x)}-${Math.round(y)}`;
  const lines = [];
  for (let i = -count; i < count; i++) {
    const t = i * spacing + (rand() - 0.5) * 1.5;
    const x1 = x + t;
    const y1 = y;
    const x2 = x1 + Math.cos(rad) * len;
    const y2 = y1 + Math.sin(rad) * len;
    const r2 = seeded(seed + i + 1000);
    const mx = (x1 + x2) / 2 + (r2() - 0.5) * 2;
    const my = (y1 + y2) / 2 + (r2() - 0.5) * 2;
    lines.push(
      <Path
        key={i}
        d={`M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`}
        stroke={stroke}
        strokeWidth={0.9}
        fill="none"
        strokeLinecap="round"
      />
    );
  }
  return (
    <G opacity={opacity}>
      <Defs>
        <ClipPath id={clipId}>
          <Rect x={x} y={y} width={w} height={h} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>{lines}</G>
    </G>
  );
}

export function SketchCheck({ cx, cy, size = 10, stroke = SK.ACCENT, strokeWidth = 2, seed = 1 }) {
  const rand = seeded(seed);
  const j = () => (rand() - 0.5) * 1.2;
  const d = [
    `M ${(cx - size + j()).toFixed(1)} ${(cy + j()).toFixed(1)}`,
    `L ${(cx - size / 3 + j()).toFixed(1)} ${(cy + size * 0.7 + j()).toFixed(1)}`,
    `L ${(cx + size + j()).toFixed(1)} ${(cy - size * 0.9 + j()).toFixed(1)}`,
  ].join(' ');
  return (
    <Path d={d} stroke={stroke} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  );
}
