export async function sha256(data: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function xorBits(bits: number[], password: string): number[] {
  const pwdBytes = new TextEncoder().encode(password);
  const keystream: number[] = [];
  for (let i = 0; i < bits.length; i++) {
    const b = pwdBytes[i % pwdBytes.length];
    const bit = (b >> (i % 8)) & 1;
    keystream.push(bit);
  }
  return bits.map((bit, i) => bit ^ keystream[i]);
}