#!/usr/bin/env node

/**
 * Vidyut Harness Integration & Verification Test
 * Verifies:
 * 1. Package and binary existence
 * 2. WebAssembly instantiation
 * 3. Core functionality (Sandhi, Chandas, Vyakarana, Transliteration)
 * 4. License compliance
 */

import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runHarnessTests() {
  console.log('🧪 Spouštím testy ověřující stažení, funkčnost a nasazení Vidyut WASM...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✓ ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ CHYBA: ${testName}`);
      failed++;
    }
  }

  // TEST 1: Ověření přítomnosti souborů a licence
  console.log('Krok 1: Kontrola souborů a licence MIT:');
  const basePath = join(__dirname, '../../node_modules/@siva-sh/vidyut');
  const wasmPath = join(basePath, 'browser/vidyut_bg.wasm');
  const licensePath = join(basePath, 'LICENSE-MIT');

  try {
    await access(wasmPath);
    assert(true, 'WASM binární soubor vidyut_bg.wasm existuje');
  } catch {
    assert(false, 'WASM binární soubor vidyut_bg.wasm chybí');
  }

  try {
    const lic = await readFile(licensePath, 'utf-8');
    assert(lic.includes('ambuda.org') && lic.includes('MIT License'), 'Licenční soubor LICENSE-MIT obsahuje MIT licenci a copyright ambuda.org');
  } catch {
    assert(false, 'Licenční soubor LICENSE-MIT chybí');
  }

  // TEST 2: Inicializace WebAssembly
  console.log('\nKrok 2: Inicializace WebAssembly modulu:');
  let vidyut = null;
  try {
    vidyut = await import('@siva-sh/vidyut');
    const wasmUrl = (await import('@siva-sh/vidyut/wasm-url')).default;
    const wasmBuffer = await readFile(wasmUrl);
    await vidyut.default({ module_or_path: wasmBuffer });
    assert(true, 'WebAssembly modul se úspěšně načetl a inicializoval v paměti');
  } catch (err) {
    assert(false, `Inicializace WebAssembly selhala: ${err.message}`);
    process.exit(1);
  }

  // TEST 3: Test transliterace
  console.log('\nKrok 3: Test transliterace (vidyut-lipi):');
  try {
    const slp1 = vidyut.transliterate('yogaḥ', vidyut.Scheme.Iast, vidyut.Scheme.Slp1);
    const deva = vidyut.transliterate(slp1, vidyut.Scheme.Slp1, vidyut.Scheme.Devanagari);
    assert(slp1 === 'yogaH', `Transliterace IAST -> SLP1 (očekáváno: yogaH, získáno: ${slp1})`);
    assert(deva === 'योगः', `Transliterace SLP1 -> Devanagari (očekáváno: योगः, získáno: ${deva})`);
  } catch (err) {
    assert(false, `Test transliterace selhal: ${err.message}`);
  }

  // TEST 4: Test Sandhi spojování a štěpení (vidyut-sandhi)
  console.log('\nKrok 4: Test Sandhi pravidel (vidyut-sandhi):');
  try {
    const sandhi = new vidyut.Sandhi();
    const joined = sandhi.join('ca', 'iti');
    assert(joined === 'ceti', `Sandhi join: ca + iti -> ceti (získáno: ${joined})`);

    const splits = sandhi.splitAll('ceti');
    const hasCaIti = splits.some(s => s.first === 'ca' && (s.second === 'iti' || s.second === 'Iti') && s.isValid);
    assert(hasCaIti, 'Sandhi splitAll nalezlo správný rozklad pro "ceti" (ca + iti)');
    sandhi.free();
  } catch (err) {
    assert(false, `Test Sandhi selhal: ${err.message}`);
  }

  // TEST 5: Test metrické analýzy (vidyut-chandas)
  console.log('\nKrok 5: Test metrické analýzy (vidyut-chandas):');
  try {
    const chandas = new vidyut.Chandas();
    const res = chandas.classify('Darmakzetre kurukzetre');
    assert(res !== null && res.aksharas && res.aksharas.length > 0, 'Úspěšná klasifikace verše a rozklad na slabiky s váhami L/G');
    chandas.free();
  } catch (err) {
    assert(false, `Test Chandas selhal: ${err.message}`);
  }

  // TEST 6: Test gramatického generátoru (vidyut-prakriya)
  console.log('\nKrok 6: Test páṇiniovské gramatiky (vidyut-prakriya):');
  try {
    const vyakarana = new vidyut.Vyakarana();
    const forms = vyakarana.deriveTinantas({
      dhatu: { aupadeshika: 'BU', gana: 'Bhvadi', prefixes: [], sanadi: [] },
      lakara: 'Lat',
      prayoga: 'Kartari',
      purusha: 'Prathama',
      vacana: 'Eka',
      skip_at_agama: false
    });
    assert(forms[0]?.text === 'Bavati', `Odvození prézentu 3. os. pro √bhū -> bhavati (získáno: ${forms[0]?.text})`);
    assert(forms[0]?.history && forms[0].history.length > 0, `Nalezeno ${forms[0]?.history.length} aplikovaných Páṇiniho súter v derivation tree`);
    vyakarana.free();
  } catch (err) {
    assert(false, `Test Vyakarana selhal: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log(`📊 Výsledky integračního testu: ${passed} prošlo, ${failed} selhalo.`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runHarnessTests();
