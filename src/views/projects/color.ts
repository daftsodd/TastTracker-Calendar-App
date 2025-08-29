export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function hexToRgb(hex: string) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec((hex || '').trim());
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

export function rgba(hex: string, a = 0.12) {
  const c = hexToRgb(hex);
  if (!c) return undefined;
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${clamp(a, 0, 1)})`;
}

export function defaultListColor() {
  // pleasant pastel
  const hue = Math.floor(Math.random() * 360);
  return hslToHex(hue, 70, 85);
}

export function hslToHex(h: number, s: number, l: number) {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}
