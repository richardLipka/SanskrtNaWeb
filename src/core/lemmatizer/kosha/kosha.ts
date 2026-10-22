/**
 * Browser implementation of vidyut-kosha lookups over the Vidyut data archive
 * (data-0.4.0.zip: kosha/padas.fst + kosha/registry.msgpack).
 *
 * The npm WebAssembly build of Vidyut does not include vidyut-kosha, so this module reads
 * the same files directly. It ports `Kosha::get_all` and `Packer::unpack` from
 * vidyut-kosha 0.4 (src/kosha.rs, src/packing.rs):
 *  - FST keys are either complete words or stem prefixes whose value points to a paradigm
 *    (suffix table); duplicate values hang below a key behind two bytes in [0, 65);
 *  - a value is a 32-bit PackedEntry: 2 bits part of speech + 30 bits payload.
 * All texts are SLP1.
 */

import { Fst, FstNode } from './fst.ts';
import { MsgpackReader } from './msgpack.ts';

const DUPES_PER_BYTE = 65;

const LINGAS = ['Pum', 'Stri', 'Napumsaka'] as const;
const VIBHAKTIS = ['Prathama', 'Dvitiya', 'Trtiya', 'Caturthi', 'Panchami', 'Sasthi', 'Saptami', 'Sambodhana'] as const;
const VACANAS = ['Eka', 'Dvi', 'Bahu'] as const;
const PRAYOGAS = ['Kartari', 'Karmani'] as const; // Bhave is stored as Karmani
const LAKARAS = ['Lat', 'Lit', 'Lut', 'Lrt', 'Let', 'Lot', 'Lan', 'VidhiLin', 'AshirLin', 'Lun', 'Lrn'] as const;
const PURUSHAS = ['Prathama', 'Madhyama', 'Uttama'] as const;
const AVYAYA_SUP_ID = LINGAS.length * VIBHAKTIS.length * VACANAS.length; // 72

const POS_SUBANTA = 0;
const POS_SUBANTA_PREFIX = 1;
const POS_TINANTA = 2;
const POS_TINANTA_PREFIX = 3;

export interface KoshaDhatu {
  id: number;
  aupadeshika: string;
  gana: string;
  prefixes: string[];
  /** Root without markers, e.g. "BU", "praBU" */
  cleanText: string;
  arthaSa?: string;
  arthaEn?: string;
}

export interface KoshaStem {
  id: number;
  /** Basic stems carry their text; derived (kṛdanta) stems are described by root + suffix */
  kind: 'basic' | 'krdanta';
  text?: string;
  lingas?: string[];
  dhatu?: KoshaDhatu;
  krt?: string;
}

export type KoshaPada =
  | { kind: 'subanta'; stem: KoshaStem; linga: string; vibhakti: string; vacana: string }
  | { kind: 'avyaya'; stem: KoshaStem }
  | { kind: 'tinanta'; dhatu: KoshaDhatu; prayoga: string; lakara: string; purusha: string; vacana: string };

interface SubantaSuffix { text: string; linga: string; vibhakti: string; vacana: string }
interface TinantaSuffix { text: string; prayoga: string; lakara: string; purusha: string; vacana: string }

const encoder = new TextEncoder();

function enumName(v: any): string {
  // rmp-serde writes unit enum variants as strings, data variants as single-key maps
  if (typeof v === 'string') return v;
  if (v instanceof Map) return String(v.keys().next().value);
  return String(v);
}

export class Kosha {
  private readonly fst: Fst;
  readonly count: number;
  private readonly krts: Array<{ krt: string }>;
  private readonly dhatus: KoshaDhatu[];
  /** Pratipadikas: kind 0 = basic (a = index into basicTexts), 1 = kṛdanta (a = dhatu id, b = krt id) */
  private readonly pKind: Uint8Array;
  private readonly pA: Int32Array;
  private readonly pB: Int32Array;
  private readonly basicTexts: string[];
  /** Basic stem text → pratipadika ids */
  private readonly basicIndex: Map<string, number[]>;
  private readonly lingas: Map<number, string[]>;
  private readonly subantaSuffixes: SubantaSuffix[][];
  private readonly tinantaSuffixes: TinantaSuffix[][];

  constructor(fstBytes: Uint8Array, registryBytes: Uint8Array) {
    this.fst = new Fst(fstBytes);
    const r = new MsgpackReader(registryBytes);
    const parts = r.readArrayHeader();
    if (parts !== 8) throw new Error(`kosha registry: expected 8 parts, got ${parts}`);

    this.count = r.read();
    this.krts = (r.read() as any[]).map((k) => ({ krt: enumName(k[0] instanceof Map ? k[0].values().next().value : k[0]) }));

    const rawDhatus = r.read() as any[];
    const meta = r.read() as any[];
    this.dhatus = rawDhatus.map((d, id) => {
      const body = d instanceof Map ? d.values().next().value : d;
      const m = meta[id] || [];
      return {
        id,
        aupadeshika: String(body?.[0] ?? ''),
        gana: enumName(body?.[1] ?? ''),
        prefixes: Array.isArray(body?.[4]) ? body[4] : [],
        cleanText: String(m[0] ?? body?.[0] ?? ''),
        arthaSa: m[1] || undefined,
        arthaEn: m[3] || undefined
      };
    });

    // Pratipadikas (≈1.5 M entries): decoded straight into typed arrays
    const n = r.readArrayHeader();
    this.pKind = new Uint8Array(n);
    this.pA = new Int32Array(n);
    this.pB = new Int32Array(n);
    this.basicTexts = [];
    this.basicIndex = new Map();
    for (let i = 0; i < n; i++) {
      r.readMapHeader();
      const variant = r.read() as string;
      const body = r.read() as any[];
      if (variant === 'Basic') {
        const text = String(body[0]);
        this.pKind[i] = 0;
        this.pA[i] = this.basicTexts.length;
        this.basicTexts.push(text);
        const ids = this.basicIndex.get(text);
        if (ids) ids.push(i); else this.basicIndex.set(text, [i]);
      } else {
        this.pKind[i] = 1;
        this.pA[i] = body[0];
        this.pB[i] = body[1];
      }
    }

    const lingaMap = r.read() as Map<number, any[]>;
    this.lingas = new Map();
    for (const [id, m] of lingaMap) this.lingas.set(Number(id), (m?.[0] || []).map(enumName));

    this.subantaSuffixes = (r.read() as any[]).map((p) => (p[0] as any[]).map((e) => ({
      text: e[0], linga: enumName(e[1]), vibhakti: enumName(e[2]), vacana: enumName(e[3])
    })));
    this.tinantaSuffixes = (r.read() as any[]).map((p) => (p[0] as any[]).map((e) => ({
      text: e[0], prayoga: enumName(e[1]), lakara: enumName(e[2]), purusha: enumName(e[3]), vacana: enumName(e[4])
    })));
  }

  /** Number of basic (dictionary) stems. */
  get basicStemCount(): number {
    return this.basicTexts.length;
  }

  stem(id: number): KoshaStem {
    if (this.pKind[id] === 0) {
      return { id, kind: 'basic', text: this.basicTexts[this.pA[id]], lingas: this.lingas.get(id) || [] };
    }
    return { id, kind: 'krdanta', dhatu: this.dhatus[this.pA[id]], krt: this.krts[this.pB[id]]?.krt };
  }

  /** Basic stems with exactly this text (SLP1), e.g. "Darma". */
  basicStems(textSlp1: string): KoshaStem[] {
    return (this.basicIndex.get(textSlp1) || []).map((id) => this.stem(id));
  }

  private unpack(packed: number, out: KoshaPada[]) {
    const pos = packed & 0b11;
    const payload = Math.floor(packed / 4);
    if (pos === POS_SUBANTA) {
      const supId = payload & 0x7f;
      const stem = this.stem(Math.floor(payload / 128));
      if (supId === AVYAYA_SUP_ID) {
        out.push({ kind: 'avyaya', stem });
      } else {
        out.push({
          kind: 'subanta',
          stem,
          linga: LINGAS[Math.floor(supId / 24)],
          vibhakti: VIBHAKTIS[Math.floor(supId / 3) % 8],
          vacana: VACANAS[supId % 3]
        });
      }
    } else if (pos === POS_TINANTA) {
      const tinId = payload & 0xff;
      const dhatu = this.dhatus[Math.floor(payload / 256)];
      const perPrayoga = LAKARAS.length * 9;
      out.push({
        kind: 'tinanta',
        dhatu,
        prayoga: PRAYOGAS[Math.floor(tinId / perPrayoga)],
        lakara: LAKARAS[Math.floor(tinId / 9) % LAKARAS.length],
        purusha: PURUSHAS[Math.floor(tinId / 3) % 3],
        vacana: VACANAS[tinId % 3]
      });
    }
  }

  private forSuffix(packed: number, suffix: string, out: KoshaPada[]) {
    const pos = packed & 0b11;
    const payload = Math.floor(packed / 4);
    if (pos === POS_SUBANTA_PREFIX) {
      const stem = this.stem(payload & 0x1fffff);
      for (const e of this.subantaSuffixes[Math.floor(payload / 2 ** 21)] || []) {
        if (e.text === suffix) out.push({ kind: 'subanta', stem, linga: e.linga, vibhakti: e.vibhakti, vacana: e.vacana });
      }
    } else if (pos === POS_TINANTA_PREFIX) {
      const dhatu = this.dhatus[payload & 0x3ffff];
      for (const e of this.tinantaSuffixes[Math.floor(payload / 2 ** 18)] || []) {
        if (e.text === suffix) out.push({ kind: 'tinanta', dhatu, prayoga: e.prayoga, lakara: e.lakara, purusha: e.purusha, vacana: e.vacana });
      }
    }
  }

  /** Visits the values stored behind the two duplicate bytes below `node`. */
  private eachDuplicate(node: FstNode, out0: number, visit: (packed: number) => void) {
    for (let c1 = 0; c1 < DUPES_PER_BYTE; c1++) {
      const i1 = this.fst.findInput(node, c1);
      if (i1 < 0) return;
      const t1 = this.fst.transition(node, i1);
      const n1 = this.fst.node(t1.addr);
      for (let c2 = 0; c2 < DUPES_PER_BYTE; c2++) {
        const i2 = this.fst.findInput(n1, c2);
        if (i2 < 0) return;
        const t2 = this.fst.transition(n1, i2);
        const n2 = this.fst.node(t2.addr);
        if (n2.isFinal) visit((out0 + t1.output + t2.output + n2.finalOutput) >>> 0);
      }
    }
  }

  /**
   * All analyses of a word form (SLP1), e.g. "Darmasya" → Darma, masc. genitive singular.
   * Forms are stored before sandhi, so final visarga is "s" ("devas", not "devaH").
   */
  getAll(keySlp1: string): KoshaPada[] {
    const out: KoshaPada[] = [];
    const key = encoder.encode(keySlp1);
    let node = this.fst.root();
    let acc = 0;
    for (let i = 0; i < key.length; i++) {
      const ti = this.fst.findInput(node, key[i]);
      if (ti < 0) return out;
      const t = this.fst.transition(node, ti);
      acc += t.output;
      node = this.fst.node(t.addr);

      if (node.isFinal) {
        // a stem prefix: look the remaining text up in its paradigm
        const suffix = keySlp1.slice(i + 1);
        this.forSuffix((acc + node.finalOutput) >>> 0, suffix, out);
        this.eachDuplicate(node, acc, (packed) => this.forSuffix(packed, suffix, out));
      }
    }
    if (node.isFinal) {
      const packed = (acc + node.finalOutput) >>> 0;
      const pos = packed & 0b11;
      if (pos === POS_SUBANTA || pos === POS_TINANTA) this.unpack(packed, out);
      this.eachDuplicate(node, acc, (p) => {
        const ps = p & 0b11;
        if (ps === POS_SUBANTA || ps === POS_TINANTA) this.unpack(p, out);
      });
    }
    return out;
  }

  /** True when the form has at least one analysis. */
  has(keySlp1: string): boolean {
    return this.getAll(keySlp1).length > 0;
  }
}

/**
 * Reads one file from a ZIP archive (stored or deflate), using the central directory.
 */
export async function extractZipEntry(zip: ArrayBuffer | Uint8Array, name: string): Promise<Uint8Array> {
  const bytes = zip instanceof Uint8Array ? zip : new Uint8Array(zip);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 0xffff - 22); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('ZIP: end of central directory not found');
  const entries = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  for (let n = 0; n < entries; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const method = view.getUint16(p + 10, true);
    const csize = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localOffset = view.getUint32(p + 42, true);
    const entryName = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    if (entryName === name) {
      const lNameLen = view.getUint16(localOffset + 26, true);
      const lExtraLen = view.getUint16(localOffset + 28, true);
      const start = localOffset + 30 + lNameLen + lExtraLen;
      const data = bytes.subarray(start, start + csize);
      if (method === 0) return data.slice();
      if (method !== 8) throw new Error(`ZIP: unsupported compression ${method} for ${name}`);
      const stream = new Blob([data as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`ZIP: ${name} not found`);
}

/** Builds a Kosha from the Vidyut data archive (data-0.4.0.zip). */
export async function koshaFromZip(zip: ArrayBuffer | Uint8Array | Blob): Promise<Kosha> {
  const buf = zip instanceof Blob ? new Uint8Array(await zip.arrayBuffer()) : zip;
  const [fst, registry] = await Promise.all([
    extractZipEntry(buf, 'kosha/padas.fst'),
    extractZipEntry(buf, 'kosha/registry.msgpack')
  ]);
  return new Kosha(fst, registry);
}
