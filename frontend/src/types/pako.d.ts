declare module 'pako' {
  export function deflate(data: Uint8Array<ArrayBufferLike>): Uint8Array<ArrayBuffer>;
  export function inflate(data: Uint8Array<ArrayBufferLike>): Uint8Array<ArrayBuffer>;
}
