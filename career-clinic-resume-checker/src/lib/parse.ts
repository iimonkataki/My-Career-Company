export async function parseResume(buf: Buffer, type: string): Promise<{ text: string }> {
  return { text: buf.toString("utf8") };
}
