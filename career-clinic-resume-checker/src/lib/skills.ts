export function normalise(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}
