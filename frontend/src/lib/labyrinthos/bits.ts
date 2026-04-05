export function arrayBufferToBits(buf: ArrayBuffer): number[] {
  const bytes = new Uint8Array(buf);
  const bits: number[] = [];
  for (let b of bytes) {
    for (let i = 7; i >= 0; i--) {
      bits.push((b >> i) & 1);
    }
  }
  return bits;
}

export function bitsToBytes(bits: number[]): Uint8Array {
  const out = new Uint8Array(Math.ceil(bits.length / 8));
  for (let i = 0; i < bits.length; i++) {
    const byteIdx = i >> 3;
    out[byteIdx] = (out[byteIdx] << 1) | (bits[i] & 1);
  }
  // If bits length not multiple of 8, pad last byte's low bits (the leftover bits are already shifted left by missing positions)
  if (bits.length % 8 !== 0) {
    const remainder = 8 - (bits.length % 8);
    out[out.length - 1] <<= remainder;
  }
  return out;
}