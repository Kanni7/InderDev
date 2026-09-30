import type { SVGProps } from "react";
import type { Condition } from "./theme";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function Sun(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <circle cx="12" cy="12" r="4.2" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const r = (a * Math.PI) / 180;
        return (
          <line
            key={a}
            x1={12 + Math.cos(r) * 7}
            y1={12 + Math.sin(r) * 7}
            x2={12 + Math.cos(r) * 8.8}
            y2={12 + Math.sin(r) * 8.8}
          />
        );
      })}
    </svg>
  );
}

export function Cloud(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <path d="M7 18h9.5a3.5 3.5 0 0 0 .3-6.98A5 5 0 0 0 7.2 10 4 4 0 0 0 7 18Z" />
    </svg>
  );
}

export function Rain(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <path d="M7 14h9.5a3.5 3.5 0 0 0 .3-6.98A5 5 0 0 0 7.2 6 4 4 0 0 0 7 14Z" />
      <line x1="8.5" y1="17" x2="7.5" y2="20" />
      <line x1="12" y1="17" x2="11" y2="20.5" />
      <line x1="15.5" y1="17" x2="14.5" y2="20" />
    </svg>
  );
}

export function Storm(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <path d="M7 13h9.5a3.5 3.5 0 0 0 .3-6.98A5 5 0 0 0 7.2 5 4 4 0 0 0 7 13Z" />
      <path d="M12.5 14l-2.5 4h3l-2 3.5" />
    </svg>
  );
}

export function Fog(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <path d="M7 12h9.5a3.5 3.5 0 0 0 .3-6.98A5 5 0 0 0 7.2 4 4 4 0 0 0 7 12Z" />
      <line x1="4" y1="16" x2="20" y2="16" />
      <line x1="6" y1="19" x2="18" y2="19" />
    </svg>
  );
}

export function Moon(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />
    </svg>
  );
}

export function conditionIcon(c: Condition) {
  switch (c) {
    case "sunny": return Sun;
    case "cloudy": return Cloud;
    case "rainy": return Rain;
    case "storm": return Storm;
    case "fog": return Fog;
    case "night": return Moon;
  }
}

/* ---- UI + metric icons ---- */
export function Menu(p: IconProps) {
  return (<svg viewBox="0 0 24 24" {...base} {...p}><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="14" y2="17"/></svg>);
}
export function Bell(p: IconProps) {
  return (<svg viewBox="0 0 24 24" {...base} {...p}><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2.5H4.5L6 16Z"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>);
}
export function Pin(p: IconProps) {
  return (<svg viewBox="0 0 24 24" {...base} {...p}><path d="M12 21s-6-5.2-6-10a6 6 0 0 1 12 0c0 4.8-6 10-6 10Z"/><circle cx="12" cy="11" r="2"/></svg>);
}
export function Chevron(p: IconProps) {
  return (<svg viewBox="0 0 24 24" {...base} {...p}><path d="m9 6 6 6-6 6"/></svg>);
}
export function Send(p: IconProps) {
  return (<svg viewBox="0 0 24 24" {...base} {...p}><path d="M5 12 20 5l-4 15-4-6-7-2Z"/></svg>);
}
export function Close(p: IconProps) {
  return (<svg viewBox="0 0 24 24" {...base} {...p}><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>);
}
export function Sparkle(p: IconProps) {
  return (<svg viewBox="0 0 24 24" {...base} {...p}><path d="M12 3c.6 3.8 1.7 4.9 5.5 5.5-3.8.6-4.9 1.7-5.5 5.5-.6-3.8-1.7-4.9-5.5-5.5C10.3 7.9 11.4 6.8 12 3Z"/><path d="M18.5 14c.3 1.9.9 2.5 2.8 2.8-1.9.3-2.5.9-2.8 2.8-.3-1.9-.9-2.5-2.8-2.8 1.9-.3 2.5-.9 2.8-2.8Z"/></svg>);
}
export function Check(p: IconProps) {
  return (<svg viewBox="0 0 24 24" {...base} {...p}><path d="m5 12.5 4.5 4.5L19 7"/></svg>);
}

/* small metric glyphs - generic line marks */
export function Dot(p: IconProps) {
  return (<svg viewBox="0 0 24 24" {...base} {...p}><circle cx="12" cy="12" r="7"/></svg>);
}
