/**
 * Read-only reader for finite state transducers in the format of the Rust `fst` crate
 * (BurntSushi/fst, format version 1–3), as used by vidyut-kosha's padas.fst.
 *
 * This is a direct port of `fst::raw::Node` decoding: nodes are stored back to front, a node's
 * address is the position of its last (state) byte, and outputs are summed along the path.
 */

// fst::raw::common_inputs::COMMON_INPUTS_INV
const COMMON_INPUTS_INV = new Uint8Array([
  116, 101, 47, 111, 97, 115, 114, 105, 112, 99, 110, 119, 46, 104, 108, 109, 45, 100, 117, 48, 49, 50, 103, 61,
  58, 98, 102, 51, 121, 53, 38, 95, 52, 118, 57, 54, 55, 56, 107, 37, 63, 120, 67, 68, 65, 83, 70, 73, 66, 69,
  106, 80, 84, 122, 82, 78, 77, 43, 76, 79, 113, 72, 71, 87, 85, 86, 44, 89, 75, 74, 90, 88, 81, 59, 41, 40, 126,
  91, 93, 36, 33, 39, 42, 64, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
  24, 25, 26, 27, 28, 29, 30, 31, 32, 34, 35, 60, 62, 92, 94, 96, 123, 124, 125, 127, 128, 129, 130, 131, 132, 133,
  134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155,
  156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177,
  178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199,
  200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221,
  222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243,
  244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255
]);

const EMPTY_ADDRESS = 0;
const TRANS_INDEX_THRESHOLD = 32;

export enum StateKind {
  EmptyFinal,
  OneTransNext,
  OneTrans,
  AnyTrans
}

export interface FstNode {
  kind: StateKind;
  /** Address of the node (its state byte) */
  start: number;
  /** Address just before the node's first byte; transitions are relative to it */
  end: number;
  isFinal: boolean;
  ntrans: number;
  tsize: number;
  osize: number;
  finalOutput: number;
  /** AnyTrans: 1 when the transition count is stored in its own byte */
  ntransLen: number;
  /** One-transition nodes: input length (0 when the input is a common input) */
  inputLen: number;
  commonInput: number;
}

export interface FstTransition {
  input: number;
  output: number;
  addr: number;
}

export class Fst {
  readonly version: number;
  readonly rootAddr: number;
  readonly length: number;

  constructor(private readonly data: Uint8Array) {
    if (data.length < 36) throw new Error('FST: data too short');
    this.version = this.readU64(0);
    if (this.version < 1 || this.version > 3) throw new Error(`FST: unsupported version ${this.version}`);
    const end = this.version <= 2 ? data.length : data.length - 4; // v3 ends with a CRC32
    this.rootAddr = this.readU64(end - 8);
    this.length = this.readU64(end - 16);
  }

  private readU64(at: number): number {
    let n = 0;
    for (let i = 7; i >= 0; i--) n = n * 256 + this.data[at + i];
    return n;
  }

  private unpackUint(at: number, nbytes: number): number {
    let n = 0;
    for (let i = nbytes - 1; i >= 0; i--) n = n * 256 + this.data[at + i];
    return n;
  }

  private unpackDelta(at: number, tsize: number, nodeEnd: number): number {
    const delta = this.unpackUint(at, tsize);
    return delta === EMPTY_ADDRESS ? EMPTY_ADDRESS : nodeEnd - delta;
  }

  root(): FstNode {
    return this.node(this.rootAddr);
  }

  node(addr: number): FstNode {
    const d = this.data;
    if (addr === EMPTY_ADDRESS) {
      return { kind: StateKind.EmptyFinal, start: 0, end: 0, isFinal: true, ntrans: 0, tsize: 0, osize: 0, finalOutput: 0, ntransLen: 0, inputLen: 0, commonInput: 0 };
    }
    const v = d[addr];
    const top = (v & 0b1100_0000) >> 6;

    if (top === 0b11 || top === 0b10) {
      const idx = v & 0b0011_1111;
      const commonInput = idx === 0 ? -1 : COMMON_INPUTS_INV[idx - 1];
      const inputLen = commonInput < 0 ? 1 : 0;
      if (top === 0b11) {
        return { kind: StateKind.OneTransNext, start: addr, end: addr - inputLen, isFinal: false, ntrans: 1, tsize: 0, osize: 0, finalOutput: 0, ntransLen: 0, inputLen, commonInput };
      }
      const sizes = d[addr - inputLen - 1];
      const tsize = sizes >> 4;
      const osize = sizes & 0x0f;
      return {
        kind: StateKind.OneTrans, start: addr, end: addr - inputLen - 1 - tsize - osize,
        isFinal: false, ntrans: 1, tsize, osize, finalOutput: 0, ntransLen: 0, inputLen, commonInput
      };
    }

    // AnyTrans
    const isFinal = (v & 0b0100_0000) !== 0;
    const inState = v & 0b0011_1111;
    const ntransLen = inState === 0 ? 1 : 0;
    let ntrans = inState;
    if (inState === 0) {
      const n = d[addr - 1];
      ntrans = n === 1 ? 256 : n;
    }
    const sizes = d[addr - ntransLen - 1];
    const tsize = sizes >> 4;
    const osize = sizes & 0x0f;
    const indexSize = this.version >= 2 && ntrans > TRANS_INDEX_THRESHOLD ? 256 : 0;
    const totalTransSize = ntrans + ntrans * tsize + indexSize;
    let finalOutput = 0;
    if (osize > 0 && isFinal) {
      const at = addr - ntransLen - 1 - totalTransSize - ntrans * osize - osize;
      finalOutput = this.unpackUint(at, osize);
    }
    const end = addr - ntransLen - 1 - totalTransSize - ntrans * osize - (isFinal ? osize : 0);
    return { kind: StateKind.AnyTrans, start: addr, end, isFinal, ntrans, tsize, osize, finalOutput, ntransLen, inputLen: 0, commonInput: -1 };
  }

  /** Index of the transition for input byte `b`, or -1. */
  findInput(node: FstNode, b: number): number {
    const d = this.data;
    switch (node.kind) {
      case StateKind.EmptyFinal:
        return -1;
      case StateKind.OneTransNext:
      case StateKind.OneTrans: {
        const inp = node.commonInput >= 0 ? node.commonInput : d[node.start - 1];
        return inp === b ? 0 : -1;
      }
      default: {
        const indexSize = this.version >= 2 && node.ntrans > TRANS_INDEX_THRESHOLD ? 256 : 0;
        if (indexSize) {
          const start = node.start - node.ntransLen - 1 - indexSize;
          const i = d[start + b];
          return i >= node.ntrans ? -1 : i;
        }
        const start = node.start - node.ntransLen - 1 - node.ntrans;
        for (let j = 0; j < node.ntrans; j++) {
          if (d[start + j] === b) return node.ntrans - j - 1;
        }
        return -1;
      }
    }
  }

  transition(node: FstNode, i: number): FstTransition {
    const d = this.data;
    switch (node.kind) {
      case StateKind.OneTransNext: {
        const input = node.commonInput >= 0 ? node.commonInput : d[node.start - 1];
        return { input, output: 0, addr: node.end - 1 };
      }
      case StateKind.OneTrans: {
        const input = node.commonInput >= 0 ? node.commonInput : d[node.start - 1];
        const output = node.osize === 0
          ? 0
          : this.unpackUint(node.start - node.inputLen - 1 - node.tsize - node.osize, node.osize);
        const addr = this.unpackDelta(node.start - node.inputLen - 1 - node.tsize, node.tsize, node.end);
        return { input, output, addr };
      }
      case StateKind.AnyTrans: {
        const indexSize = this.version >= 2 && node.ntrans > TRANS_INDEX_THRESHOLD ? 256 : 0;
        const input = d[node.start - node.ntransLen - 1 - indexSize - i - 1];
        const taAt = node.start - node.ntransLen - 1 - indexSize - node.ntrans - i * node.tsize - node.tsize;
        const addr = this.unpackDelta(taAt, node.tsize, node.end);
        let output = 0;
        if (node.osize > 0) {
          const totalTransSize = node.ntrans + node.ntrans * node.tsize + indexSize;
          output = this.unpackUint(node.start - node.ntransLen - 1 - totalTransSize - i * node.osize - node.osize, node.osize);
        }
        return { input, output, addr };
      }
      default:
        throw new Error('FST: EmptyFinal has no transitions');
    }
  }

  /** Exact lookup: the output value for `key`, or null. */
  get(key: Uint8Array): number | null {
    let node = this.root();
    let out = 0;
    for (const b of key) {
      const i = this.findInput(node, b);
      if (i < 0) return null;
      const t = this.transition(node, i);
      out += t.output;
      node = this.node(t.addr);
    }
    return node.isFinal ? out + node.finalOutput : null;
  }
}
