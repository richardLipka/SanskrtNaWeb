import { describe, it, expect } from 'vitest';
import { safeUpdateScript, isScriptManual, getScriptText } from '../transliteration/engine.ts';
import { ScriptItem } from '../types/schema.ts';

describe('Manual Transliteration Protection', () => {
  it('creates a new auto entry when none exists', () => {
    const entry = safeUpdateScript(undefined, 'yogaḥ');
    expect(entry.text).toBe('yogaḥ');
    expect(entry.mode).toBe('auto');
    expect(entry.lastAutoText).toBe('yogaḥ');
    expect(isScriptManual(entry)).toBe(false);
  });

  it('updates an entry if it is in auto mode and unchanged by user', () => {
    const current: ScriptItem = {
      text: 'yoga',
      mode: 'auto',
      lastAutoText: 'yoga'
    };

    const updated = safeUpdateScript(current, 'yogaḥ');
    expect(updated.text).toBe('yogaḥ');
    expect(updated.mode).toBe('auto');
    expect(updated.lastAutoText).toBe('yogaḥ');
  });

  it('NEVER overwrites an entry explicitly marked as manual (e.g. padaccheda)', () => {
    // Teacher manually separated compounds with hyphens
    const manualPadaccheda: ScriptItem = {
      text: 'yogaḥ citta-vṛtti-nirodhaḥ',
      mode: 'manual',
      lastAutoText: ''
    };

    // Automatic transliteration without word-separation
    const autoResult = 'yogaścittavṛttinirodhaḥ';

    const attemptedUpdate = safeUpdateScript(manualPadaccheda, autoResult);
    expect(attemptedUpdate.text).toBe('yogaḥ citta-vṛtti-nirodhaḥ');
    expect(attemptedUpdate.mode).toBe('manual');
    expect(isScriptManual(attemptedUpdate)).toBe(true);
  });

  it('automatically detects when user altered text and prevents overwrite', () => {
    const originalAuto: ScriptItem = {
      text: 'jóga',
      mode: 'auto',
      lastAutoText: 'jóga'
    };

    // User manually tuned pronunciation to 'jógah'
    const userModified: ScriptItem = {
      ...originalAuto,
      text: 'jógah (tradiční znění)'
    };

    // Next time auto-generator runs:
    const nextAuto = 'jóga nová verze';
    const result = safeUpdateScript(userModified, nextAuto);

    expect(result.text).toBe('jógah (tradiční znění)');
    expect(result.mode).toBe('manual');
  });

  it('allows overwrite only when force flag is explicitly true', () => {
    const manual: ScriptItem = {
      text: 'ručně psaný text',
      mode: 'manual',
      lastAutoText: ''
    };

    const forced = safeUpdateScript(manual, 'nový přepis', true);
    expect(forced.text).toBe('nový přepis');
    expect(forced.mode).toBe('auto');
  });

  it('helper getScriptText works for both string and ScriptItem', () => {
    expect(getScriptText('prostý text')).toBe('prostý text');
    expect(getScriptText({ text: 'v objektu', mode: 'manual' })).toBe('v objektu');
    expect(getScriptText(undefined)).toBe('');
  });
});
