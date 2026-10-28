export interface Rgb { r: number; g: number; b: number }
export const DEFAULT_AMBIENT: Rgb = { r: 232, g: 70, b: 108 }; // rose

/** Average colour of RGBA pixel data, softened so the glow never gets harsh. */
export function averageColor(data: ArrayLike<number>): Rgb {
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
  }
  if (!n) return DEFAULT_AMBIENT;
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
}
/** Blend towards the brand rose so near-black scenes still glow warmly. */
export function softenColor(c: Rgb, mix = 0.25): Rgb {
  const m = (a: number, b: number) => Math.round(a * (1 - mix) + b * mix);
  return { r: m(c.r, DEFAULT_AMBIENT.r), g: m(c.g, DEFAULT_AMBIENT.g), b: m(c.b, DEFAULT_AMBIENT.b) };
}
