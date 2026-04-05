declare module 'pako' {
  export function deflate(data: Uint8Array): Uint8Array;
  export function inflate(data: Uint8Array): Uint8Array;
  export function gzip(data: Uint8Array): Uint8Array;
  export function ungzip(data: Uint8Array): Uint8Array;
  const pako: {
    deflate: typeof deflate;
    inflate: typeof inflate;
    gzip: typeof gzip;
    ungzip: typeof ungzip;
  };
  export default pako;
}
