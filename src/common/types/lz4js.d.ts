declare module 'lz4js' {
  export function encode(input: Uint8Array | Buffer): Uint8Array;
  export function decode(input: Uint8Array | Buffer): Uint8Array;
}
