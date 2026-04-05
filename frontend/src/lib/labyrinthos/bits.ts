export function arrayBufferToBits(buf: ArrayBuffer): number[] {
  const bytes = new Uint8Array(buf);
  const bits: number[] = new Array(bytes.length * 8);
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    const base = i * 8;
    for (let j = 0; j < 8; j++) {
      bits[base + j] = (b >> (7 - j)) & 1;
    }
  }
  return bits;
}

export function bitsToBytes(bits: number[]): Uint8Array {
  const byteCount = Math.ceil(bits.length / 8);
  const out = new Uint8Array(byteCount);
  for (let i = 0; i < byteCount; i++) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      const idx = i * 8 + j;
      byte = (byte << 1) | (idx < bits.length ? (bits[idx] & 1) : 0);
    }
    out[i] = byte;
  }
  return out;
}
