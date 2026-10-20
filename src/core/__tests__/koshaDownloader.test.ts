import { describe, it, expect } from 'vitest';
import {
  VIDYUT_DATA_ARCHIVE_INFO,
  checkKoshaCacheStatus,
  inspectZipArchive
} from '../lemmatizer/vidyutKoshaDownloader.ts';

describe('Vidyut Kosha & Cheda Datasets Downloader', () => {
  it('exposes accurate archive metadata and dictionary inclusions', () => {
    expect(VIDYUT_DATA_ARCHIVE_INFO.version).toBe('0.4.0');
    expect(VIDYUT_DATA_ARCHIVE_INFO.url).toContain('data-0.4.0.zip');
    expect(VIDYUT_DATA_ARCHIVE_INFO.compressedSizeMb).toBeGreaterThan(15);
    expect(VIDYUT_DATA_ARCHIVE_INFO.dictionaries.length).toBeGreaterThanOrEqual(4);

    const names = VIDYUT_DATA_ARCHIVE_INFO.dictionaries.join(' ');
    expect(names).toContain('Monier-Williams');
    expect(names).toContain('Apte');
    expect(names).toContain('Śabda-Sāgara');
    expect(names).toContain('Vācaspatyam');
  });

  it('safely checks cache status when IndexedDB is not present in Node environment', async () => {
    const status = await checkKoshaCacheStatus();
    expect(status).toBeDefined();
    expect(status.isDownloaded).toBe(false);
  });

  it('inspects ZIP headers and extracts file list without external dependencies', async () => {
    // Construct a synthetic in-memory ZIP buffer with two local file headers
    // Header 1: kosha.tsv (9 bytes name)
    const name1 = new TextEncoder().encode('kosha.tsv');
    // Header 2: lexicon.bin (11 bytes name)
    const name2 = new TextEncoder().encode('lexicon.bin');

    const totalLen = (30 + name1.length) + (30 + name2.length);
    const buffer = new ArrayBuffer(totalLen);
    const view = new DataView(buffer);
    const uint8 = new Uint8Array(buffer);

    // Header 1 at offset 0
    view.setUint32(0, 0x04034b50, true); // PK\x03\x04
    view.setUint16(26, name1.length, true); // fileNameLength
    view.setUint16(28, 0, true); // extraFieldLength
    uint8.set(name1, 30);

    // Header 2 at offset 30 + name1.length
    const offset2 = 30 + name1.length;
    view.setUint32(offset2, 0x04034b50, true);
    view.setUint16(offset2 + 26, name2.length, true);
    view.setUint16(offset2 + 28, 0, true);
    uint8.set(name2, offset2 + 30);

    const fileList = await inspectZipArchive(buffer);
    expect(fileList).toContain('kosha.tsv');
    expect(fileList).toContain('lexicon.bin');
    expect(fileList.length).toBe(2);
  });
});
