export const ROWS = 6;
export const COLS = 22;

// Flagship color chips. Double-check 63-68 against docs.vestaboard.com/docs/charactercodes
export const COLORS = [
  { name: "Red", code: 63, hex: "#e5383b" },
  { name: "Orange", code: 64, hex: "#f77f00" },
  { name: "Yellow", code: 65, hex: "#fcbf49" },
  { name: "Green", code: 66, hex: "#2a9d4b" },
  { name: "Blue", code: 67, hex: "#2f6fdb" },
  { name: "Violet", code: 68, hex: "#8a4fd6" },
  { name: "White", code: 69, hex: "#f5f5f5" },
  { name: "Black", code: 70, hex: "#050505" },
];

const SYMBOLS: Record<string, number> = {
  "!": 37, "@": 38, "#": 39, "$": 40, "(": 41, ")": 42, "-": 44, "+": 46,
  "&": 47, "=": 48, ";": 49, ":": 50, "'": 52, '"': 53, "%": 54, ",": 55,
  ".": 56, "/": 59, "?": 60, "°": 62,
};
const REVERSE = Object.fromEntries(Object.entries(SYMBOLS).map(([k, v]) => [v, k]));

export function charToCode(ch: string): number | null {
  const c = ch.toUpperCase();
  if (c === " ") return 0;
  if (c.length === 1 && c >= "A" && c <= "Z") return c.charCodeAt(0) - 64;
  if (c >= "1" && c <= "9") return 26 + Number(c);
  if (c === "0") return 36;
  return SYMBOLS[c] ?? null;
}

export function codeToChar(n: number): string {
  if (n >= 1 && n <= 26) return String.fromCharCode(64 + n);
  if (n >= 27 && n <= 35) return String(n - 26);
  if (n === 36) return "0";
  return REVERSE[n] ?? "";
}

export const emptyBoard = (): number[][] =>
  Array.from({ length: ROWS }, () => Array(COLS).fill(0));

export function isValid(l: unknown): l is number[][] {
  return (
    Array.isArray(l) && l.length === ROWS &&
    l.every((r) => Array.isArray(r) && r.length === COLS &&
      r.every((n) => Number.isInteger(n) && n >= 0 && n <= 70))
  );
}

export const authorized = (req: Request) =>
  !!process.env.FAMILY_PASSCODE &&
  req.headers.get("x-passcode") === process.env.FAMILY_PASSCODE;
