/**
 * Minimal MessagePack reader for the vidyut-kosha registry (registry.msgpack).
 * Supports the subset written by rmp-serde: nil, booleans, integers, strings,
 * arrays and maps (no binary, float or extension types are used by the registry).
 */

const decoder = new TextDecoder('utf-8');

export class MsgpackReader {
  pos = 0;
  private view: DataView;

  constructor(private bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  private u8(): number {
    return this.bytes[this.pos++];
  }

  private u16(): number {
    const v = this.view.getUint16(this.pos);
    this.pos += 2;
    return v;
  }

  private u32(): number {
    const v = this.view.getUint32(this.pos);
    this.pos += 4;
    return v;
  }

  private str(len: number): string {
    const s = decoder.decode(this.bytes.subarray(this.pos, this.pos + len));
    this.pos += len;
    return s;
  }

  /** Reads an array header and returns the number of elements. */
  readArrayHeader(): number {
    const b = this.u8();
    if ((b & 0xf0) === 0x90) return b & 0x0f;
    if (b === 0xdc) return this.u16();
    if (b === 0xdd) return this.u32();
    throw new Error(`msgpack: expected array at ${this.pos - 1} (0x${b.toString(16)})`);
  }

  /** Reads a map header and returns the number of key/value pairs. */
  readMapHeader(): number {
    const b = this.u8();
    if ((b & 0xf0) === 0x80) return b & 0x0f;
    if (b === 0xde) return this.u16();
    if (b === 0xdf) return this.u32();
    throw new Error(`msgpack: expected map at ${this.pos - 1} (0x${b.toString(16)})`);
  }

  /** Reads any value. */
  read(): any {
    const b = this.u8();
    if (b <= 0x7f) return b;
    if (b >= 0xe0) return b - 0x100;
    if ((b & 0xe0) === 0xa0) return this.str(b & 0x1f);
    if ((b & 0xf0) === 0x90) return this.readArrayBody(b & 0x0f);
    if ((b & 0xf0) === 0x80) return this.readMapBody(b & 0x0f);
    switch (b) {
      case 0xc0: return null;
      case 0xc2: return false;
      case 0xc3: return true;
      case 0xcc: return this.u8();
      case 0xcd: return this.u16();
      case 0xce: return this.u32();
      case 0xcf: {
        const hi = this.u32();
        const lo = this.u32();
        return hi * 2 ** 32 + lo;
      }
      case 0xd0: { const v = this.view.getInt8(this.pos); this.pos += 1; return v; }
      case 0xd1: { const v = this.view.getInt16(this.pos); this.pos += 2; return v; }
      case 0xd2: { const v = this.view.getInt32(this.pos); this.pos += 4; return v; }
      case 0xd3: {
        const hi = this.view.getInt32(this.pos);
        const lo = this.view.getUint32(this.pos + 4);
        this.pos += 8;
        return hi * 2 ** 32 + lo;
      }
      case 0xd9: return this.str(this.u8());
      case 0xda: return this.str(this.u16());
      case 0xdb: return this.str(this.u32());
      case 0xdc: return this.readArrayBody(this.u16());
      case 0xdd: return this.readArrayBody(this.u32());
      case 0xde: return this.readMapBody(this.u16());
      case 0xdf: return this.readMapBody(this.u32());
      default:
        throw new Error(`msgpack: unsupported type 0x${b.toString(16)} at ${this.pos - 1}`);
    }
  }

  private readArrayBody(n: number): any[] {
    const out = new Array(n);
    for (let i = 0; i < n; i++) out[i] = this.read();
    return out;
  }

  private readMapBody(n: number): Map<any, any> {
    const out = new Map();
    for (let i = 0; i < n; i++) {
      const k = this.read();
      out.set(k, this.read());
    }
    return out;
  }
}
