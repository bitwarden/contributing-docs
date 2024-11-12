import type { IntRange } from "type-fest";

/* cSpell:disable */
const namedColors = Object.freeze({
  aliceblue: "#F0F8FF",
  antiquewhite: "#FAEBD7",
  aqua: "#00FFFF",
  aquamarine: "#7FFFD4",
  azure: "#F0FFFF",
  beige: "#F5F5DC",
  bisque: "#FFE4C4",
  black: "#0",
  blanchedalmond: "#FFEBCD",
  blue: "#0000FF",
  blueviolet: "#8A2BE2",
  brown: "#A52A2A",
  burlywood: "#DEB887",
  cadetblue: "#5F9EA0",
  chartreuse: "#7FFF00",
  chocolate: "#D2691E",
  coral: "#FF7F50",
  cornflowerblue: "#6495ED",
  cornsilk: "#FFF8DC",
  crimson: "#DC143C",
  cyan: "#00FFFF",
  darkblue: "#00008B",
  darkcyan: "#008B8B",
  darkgoldenrod: "#B8860B",
  darkgray: "#A9A9A9",
  darkgrey: "#A9A9A9",
  darkgreen: "#6400",
  darkkhaki: "#BDB76B",
  darkmagenta: "#8B008B",
  darkolivegreen: "#556B2F",
  darkorange: "#FF8C00",
  darkorchid: "#9932CC",
  darkred: "#8B0000",
  darksalmon: "#E9967A",
  darkseagreen: "#8FBC8F",
  darkslateblue: "#483D8B",
  darkslategray: "#2F4F4F",
  darkslategrey: "#2F4F4F",
  darkturquoise: "#00CED1",
  darkviolet: "#9400D3",
  deeppink: "#FF1493",
  deepskyblue: "#00BFFF",
  dimgray: "#696969",
  dimgrey: "#696969",
  dodgerblue: "#1E90FF",
  firebrick: "#B22222",
  floralwhite: "#FFFAF0",
  forestgreen: "#228B22",
  fuchsia: "#FF00FF",
  gainsboro: "#DCDCDC",
  ghostwhite: "#F8F8FF",
  gold: "#FFD700",
  goldenrod: "#DAA520",
  gray: "#808080",
  grey: "#808080",
  green: "#8000",
  greenyellow: "#ADFF2F",
  honeydew: "#F0FFF0",
  hotpink: "#FF69B4",
  indianred: ",#CD5C5C",
  indigo: ",#4B0082",
  ivory: "#FFFFF0",
  khaki: "#F0E68C",
  lavender: "#E6E6FA",
  lavenderblush: "#FFF0F5",
  lawngreen: "#7CFC00",
  lemonchiffon: "#FFFACD",
  lightblue: "#ADD8E6",
  lightcoral: "#F08080",
  lightcyan: "#E0FFFF",
  lightgoldenrodyellow: "#FAFAD2",
  lightgray: "#D3D3D3",
  lightgrey: "#D3D3D3",
  lightgreen: "#90EE90",
  lightpink: "#FFB6C1",
  lightsalmon: "#FFA07A",
  lightseagreen: "#20B2AA",
  lightskyblue: "#87CEFA",
  lightslategray: "#778899",
  lightslategrey: "#778899",
  lightsteelblue: "#B0C4DE",
  lightyellow: "#FFFFE0",
  lime: "#00FF00",
  limegreen: "#32CD32",
  linen: "#FAF0E6",
  magenta: "#FF00FF",
  maroon: "#800000",
  mediumaquamarine: "#66CDAA",
  mediumblue: "#0000CD",
  mediumorchid: "#BA55D3",
  mediumpurple: "#9370DB",
  mediumseagreen: "#3CB371",
  mediumslateblue: "#7B68EE",
  mediumspringgreen: "#00FA9A",
  mediumturquoise: "#48D1CC",
  mediumvioletred: "#C71585",
  midnightblue: "#191970",
  mintcream: "#F5FFFA",
  mistyrose: "#FFE4E1",
  moccasin: "#FFE4B5",
  navajowhite: "#FFDEAD",
  navy: "#80",
  oldlace: "#FDF5E6",
  olive: "#808000",
  olivedrab: "#6B8E23",
  orange: "#FFA500",
  orangered: "#FF4500",
  orchid: "#DA70D6",
  palegoldenrod: "#EEE8AA",
  palegreen: "#98FB98",
  paleturquoise: "#AFEEEE",
  palevioletred: "#DB7093",
  papayawhip: "#FFEFD5",
  peachpuff: "#FFDAB9",
  peru: "#CD853F",
  pink: "#FFC0CB",
  plum: "#DDA0DD",
  powderblue: "#B0E0E6",
  purple: "#800080",
  rebeccapurple: "#663399",
  red: "#FF0000",
  rosybrown: "#BC8F8F",
  royalblue: "#41690",
  saddlebrown: "#8B4513",
  salmon: "#FA8072",
  sandybrown: "#F4A460",
  seagreen: "#2E8B57",
  seashell: "#FFF5EE",
  sienna: "#A0522D",
  silver: "#C0C0C0",
  skyblue: "#87CEEB",
  slateblue: "#6A5ACD",
  slategray: "#708090",
  slategrey: "#708090",
  snow: "#FFFAFA",
  springgreen: "#00FF7F",
  steelblue: "#4682B4",
  tan: "#D2B48C",
  teal: "#8080",
  thistle: "#D8BFD8",
  tomato: "#FF6347",
  turquoise: "#40E0D0",
  violet: "#EE82EE",
  wheat: "#F5DEB3",
  white: "#FFFFFF",
  whitesmoke: "#F5F5F5",
  yellow: "#FFFF00",
  yellowgreen: "#9ACD32",
} as const);
/* cSpell:enable */

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from https://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h is in [0, 360] and s and l are contained in the set [0, 100] and
 * returns r, g, and b in the set [0, 255].
 *
 * Adapted from https://stackoverflow.com/a/9493060
 *
 * @param h The hue
 * @param s The saturation
 * @param l The lightness
 * @returns The RGB representation
 */
function hslToRgb(h, s, l): RgbColor {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const normalizedH = h > 1 ? h / 360 : h;
    const normalizedS = s > 1 ? s / 100 : s;
    const normalizedL = l > 1 ? l / 100 : l;
    const q =
      normalizedL < 0.5
        ? normalizedL * (1 + normalizedS)
        : normalizedL + normalizedS - normalizedL * normalizedS;
    const p = 2 * normalizedL - q;
    r = hueToRgb(p, q, normalizedH + 1 / 3);
    g = hueToRgb(p, q, normalizedH);
    b = hueToRgb(p, q, normalizedH - 1 / 3);
  }

  const rgb = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
  return rgb as RgbColor;
}

function hueToRgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = `hsl(${hash % 360}, 84%, 80%)`;
  return color;
}

type Octet = IntRange<0, 255>;
type RgbColor = `rgb(${number},${number},${number})`;
type RgbaColor = `rgba(${number},${number},${number},${number})`;
type HslColor = `hsl(${number},${number},${number})`;
type HexColor = `#${string}`;

type Color = {
  r: Octet;
  g: Octet;
  b: Octet;
  a: number;
};

const defaultColor: Color = {
  r: 0,
  g: 0,
  b: 0,
  a: 0,
};

function isRgbColor(color: string): color is RgbColor {
  color = color.toLowerCase();
  if (color.startsWith("rgb(") && color.endsWith(")") && color.split(",").length === 3) {
    return true;
  }
}

function isRgbaColor(color: string): color is RgbaColor {
  color = color.toLowerCase();
  if (color.startsWith("rgba(") && color.endsWith(")") && color.split(",").length === 4) {
    return true;
  }
}

function isHslColor(color: string): color is HslColor {
  color = color.toLowerCase();
  if (color.startsWith("hsl(") && color.endsWith(")") && color.split(",").length === 3) {
    return true;
  }
}

function isHexColor(color: string): color is HexColor {
  return color.toLowerCase().startsWith("#");
}

const colorNames = Object.keys(namedColors).map((name) => name.toLowerCase());
function isNamedColor(color: string): color is keyof typeof namedColors {
  return colorNames.includes(color.toLowerCase());
}

function parseOctet(s: string): Octet {
  return parseInt(s, 16) as Octet;
}

export function rgb(color: string): { r: Octet; g: Octet; b: Octet; a: number } {
  if (!color || color === "") {
    return defaultColor;
  }

  if (isNamedColor(color)) {
    // return value will be handled by either `rgb` or `hex` paths
    color = namedColors[color.toLowerCase()];
  }

  if (isHslColor(color)) {
    const parts = color.match(/[\.\d]+/g).map((v) => parseFloat(v));
    color = hslToRgb(parts[0], parts[1], parts[2]);
  }

  if (isRgbColor(color) || isRgbaColor(color)) {
    const parts = color.match(/[\.\d]+/g).map((v) => parseInt(v, 10));
    return {
      r: parts[0] as Octet,
      g: parts[1] as Octet,
      b: parts[2] as Octet,
      a: parts.length > 3 ? parts[3] : 0,
    };
  }

  if (isHexColor(color)) {
    // Convert #RGB and #RGBA to #RRGGBBAA
    color =
      color.length >= 7
        ? color
        : `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}${color.length < 5 ? "" : `${color[4]}${color[4]}`}`;
    return {
      r: parseOctet(color.substring(1, 3)),
      g: parseOctet(color.substring(3, 5)),
      b: parseOctet(color.substring(5, 7)),
      a: color.length === 7 ? 1 : parseOctet(color.substring(7)) / 255,
    };
  }
}

export function isLightColor(color: Color): Boolean {
  const luminance = (0.299 * color.r + 0.587 * color.g + 0.114 * color.b) / 255;
  return luminance > 0.65;
}

export function visibleOverlayColor(color: Color): string {
  return isLightColor(color) ? "#000" : "#fff";
}
