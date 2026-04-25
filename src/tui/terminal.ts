/** Low-level terminal helpers using ANSI escape codes. */

export const ESC = "\x1b";

export const COLORS = {
  reset: `${ESC}[0m`,
  bold: `${ESC}[1m`,
  dim: `${ESC}[2m`,
  red: `${ESC}[31m`,
  green: `${ESC}[32m`,
  yellow: `${ESC}[33m`,
  blue: `${ESC}[34m`,
  magenta: `${ESC}[35m`,
  cyan: `${ESC}[36m`,
  white: `${ESC}[37m`,
  bgBlue: `${ESC}[44m`,
  bgGray: `${ESC}[100m`,
} as const;

export function enterAltScreen(): void {
  process.stdout.write(`${ESC}[?1049h`); // alt screen
  process.stdout.write(`${ESC}[?25l`); // hide cursor
}

export function exitAltScreen(): void {
  process.stdout.write(`${ESC}[?25h`); // show cursor
  process.stdout.write(`${ESC}[?1049l`); // exit alt screen
}

export function clearScreen(): void {
  process.stdout.write(`${ESC}[2J${ESC}[H`);
}

export function moveTo(row: number, col: number): void {
  process.stdout.write(`${ESC}[${row};${col}H`);
}

export function getTermSize(): { rows: number; cols: number } {
  return {
    rows: process.stdout.rows ?? 24,
    cols: process.stdout.columns ?? 80,
  };
}

export function enableRawMode(): void {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
  }
}

export function disableRawMode(): void {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
    process.stdin.pause();
  }
}

export function writeAt(row: number, col: number, text: string): void {
  moveTo(row, col);
  process.stdout.write(text);
}

// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC (\x1b) is required to strip ANSI colour codes
const ANSI_PATTERN = /\x1b\[[0-9;]*m/g;

export function padRight(str: string, len: number): string {
  const stripped = str.replace(ANSI_PATTERN, "");
  if (stripped.length >= len) return str;
  return str + " ".repeat(len - stripped.length);
}
