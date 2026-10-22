export const MAX_BYTES = 2 * 1024 * 1024;

export function sniffType(buf: Buffer): string | null {
  if (!buf || buf.length < 4) return null;
  // Check PDF signature: %PDF (0x25 0x50 0x44 0x46)
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "pdf";
  // Check ZIP signature for DOCX: PK.. (0x50 0x4B 0x03 0x04)
  if (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) return "docx";
  return null;
}
