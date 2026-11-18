export type Section = "READING" | "LISTENING";
export type Lang = "km" | "en";

export interface ExamRules {
  questionsPerSection: Record<Section, number>;
  sectionMinutes: Record<Section, number>;
  sectionMaxPoints: number;
  pointsPerQuestion: number;
  sectionOrder: Section[];
  allowBackNavigation: boolean;
  allowFlagging: boolean;
  allowEarlyFinishSection: boolean;
  listeningReplayAllowed: boolean;
  unansweredScore: number;
}

export interface Option {
  position: number;
  text_ko: string;
  text_km: string;
  text_en: string;
  is_correct: boolean;
}

export interface Stimulus {
  id: string;
  type: "PASSAGE" | "AUDIO" | "IMAGE";
  text_ko: string | null;
  text_km: string | null;
  text_en: string | null;
  audio_file: string | null;
  image_file: string | null;
}

export interface Question {
  id: string;
  pack_id: string;
  section: Section;
  item_type: string;
  stimulus_id: string | null;
  stem_ko: string;
  stem_km: string;
  stem_en: string;
  explanation_km: string;
  explanation_en: string;
  industry_tags: string[];
  edition: string;
  difficulty: number;
  status: string;
  is_sample: boolean;
  options: Option[];
}

export interface VocabItem {
  id: string;
  pack_id: string;
  korean: string;
  pos: string;
  km: string;
  en: string;
  example_ko: string;
  example_km: string;
  example_en: string;
  audio_file: string | null;
  industry_tags: string[];
  status: string;
  is_sample: boolean;
}

export interface DialogueLine {
  speaker: string;
  ko: string;
  km: string;
  en: string;
  audio_file: string;
}

export interface Unit {
  id: string;
  pack_id: string;
  order: number;
  title_ko: string;
  title_km: string;
  title_en: string;
  vocab_ids: string[];
  grammar: { ko: string; km: string; en: string };
  dialogue: { lines: DialogueLine[] };
  check_question_ids: string[];
}

export const GRAMMAR_CATEGORIES = ["particle", "ending", "connector", "expression", "modifier"] as const;
export type GrammarCategory = (typeof GRAMMAR_CATEGORIES)[number];

export const HANGUL_GROUPS = ["consonant", "double_consonant", "vowel", "compound_vowel", "batchim"] as const;
export type HangulGroup = (typeof HANGUL_GROUPS)[number];

export interface HangulItem {
  id: string;
  pack_id: string;
  group: HangulGroup;
  letter: string; // for example "ㄱ"
  name_ko: string; // for example "기역"
  roman: string; // for example "g / k"
  sound_en: string;
  sound_km: string;
  syllable: string; // the letter with ㅏ (or the vowel with ㅇ), the text of the first audio file
  audio_file: string;
  example_ko: string;
  example_km: string;
  example_en: string;
  example_audio_file: string;
  tip_km: string;
  tip_en: string;
  status: string;
  is_sample: boolean;
}

export const NUMBER_GROUPS = ["sino", "native", "counter", "usage"] as const;
export type NumberGroup = (typeof NUMBER_GROUPS)[number];

export interface NumberItem {
  id: string;
  pack_id: string;
  group: NumberGroup;
  written: string; // the numeral or a short label, for example "3" or "3:30"
  korean: string; // read aloud
  km: string;
  en: string;
  note_km: string;
  note_en: string;
  audio_file: string;
  status: string;
  is_sample: boolean;
}

export interface GrammarExample {
  ko: string;
  km: string;
  en: string;
}

export interface GrammarPattern {
  id: string;
  pack_id: string;
  level: 1 | 2 | 3;
  category: GrammarCategory;
  pattern: string;
  title_km: string;
  title_en: string;
  form_km: string;
  form_en: string;
  explanation_km: string;
  explanation_en: string;
  examples: GrammarExample[];
  status: string;
  is_sample: boolean;
}

export interface PackPayload {
  id: string;
  name: string;
  version: number;
  published_at: string;
  stimuli: Stimulus[];
  questions: Question[];
  vocab: VocabItem[];
  units: Unit[];
  /** Missing in packs downloaded before grammar existed. */
  grammar?: GrammarPattern[];
  /** Missing in packs downloaded before Hangul and numbers existed. */
  hangul?: HangulItem[];
  numbers?: NumberItem[];
}

export interface PackInfo {
  id: string;
  name: string;
  version: number;
  checksum: string;
  published_at: string;
  bytes: number | null;
  audio_files: string[];
}

export interface Settings {
  language: Lang | null;
  fontStep: 0 | 1 | 2;
  dark: boolean;
  wifiOnly: boolean;
  analyticsOptIn: boolean;
}

export const INDUSTRY_TAGS = ["chemicals", "metals", "food", "electronics", "workplace-safety", "general", "construction", "agriculture", "fishery"] as const;
