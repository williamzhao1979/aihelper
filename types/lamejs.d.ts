declare module 'lamejs' {
  export class Mp3Encoder {
    constructor(channels: number, sampleRate: number, kbps: number);
    encodeBuffer(buffer: Int16Array): Uint8Array;
    flush(): Uint8Array;
  }
}

declare module 'lamejs-121-bug' {
  export class Mp3Encoder {
    constructor(channels: number, sampleRate: number, kbps: number);
    encodeBuffer(buffer: Int16Array): Uint8Array;
    flush(): Uint8Array;
  }
} 