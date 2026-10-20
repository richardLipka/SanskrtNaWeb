export interface GrammarTermDetail {
  sanskrit: string;
  sanskritDeva: string;
  cs: string;
  en: string;
  shortCs: string;
  shortEn: string;
  color: string;
}

export interface CaseTermEntry {
  sanskrit: string;
  sanskritDeva: string;
  label: string;
  short: string;
  caseNumber?: number;
  explanation: string;
  color: string;
}

export interface GenderTermEntry {
  sanskrit: string;
  sanskritDeva: string;
  label: string;
  short: string;
  explanation: string;
}

export interface NumberTermEntry {
  sanskrit: string;
  sanskritDeva: string;
  label: string;
  short: string;
  explanation: string;
}

export interface PosTermEntry {
  sanskrit: string;
  sanskritDeva?: string;
  label: string;
  short: string;
  color: string;
  explanation: string;
}

export interface VerbPersonEntry {
  sanskrit: string;
  label: string;
  short: string;
}

export interface VerbVoiceEntry {
  sanskrit: string;
  label: string;
  short: string;
}

export interface LakaraEntry {
  sanskrit: string;
  sanskritDeva: string;
  label: string;
  short: string;
  tenseMeaning: string;
  explanation: string;
}

export interface ChandasWeightEntry {
  label: string;
  symbol: string;
  explanation: string;
}

export interface CompoundTypeEntry {
  sanskrit: string;
  label: string;
  explanation: string;
}

export interface SandhiTypeEntry {
  sanskrit: string;
  label: string;
  explanation: string;
}

export interface GrammarSectionTitles {
  pos: string;
  root: string;
  stem: string;
  gender: string;
  case: string;
  number: string;
  person: string;
  voice: string;
  tenseMood: string;
  compound: string;
  sandhi: string;
  meter: string;
  unspecified: string;
}

export interface LinguisticDictionary {
  language: string;
  vibhaktis: Record<string, CaseTermEntry>;
  genders: Record<string, GenderTermEntry>;
  numbers: Record<string, NumberTermEntry>;
  pos: Record<string, PosTermEntry>;
  verbPersons: Record<string, VerbPersonEntry>;
  verbVoices: Record<string, VerbVoiceEntry>;
  lakaras: Record<string, LakaraEntry>;
  chandasWeights: Record<'L' | 'G', ChandasWeightEntry>;
  compoundTypes: Record<string, CompoundTypeEntry>;
  sandhiTypes: Record<string, SandhiTypeEntry>;
  titles: GrammarSectionTitles;
}

export interface FormattedGrammarResult {
  fullLabel: string;
  shortBadge: string;
  categoryColor: string;
  details: Array<{ title: string; value: string }>;
}
