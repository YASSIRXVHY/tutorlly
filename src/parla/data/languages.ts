/** The 11 languages taught on Parla. Twelve tutors cover them (Spanish has two). */

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  /** The headline exam for this language, used in microcopy and replies. */
  exam: string;
}

export const LANGUAGES: Language[] = [
  { code: "es", name: "Spanish", nativeName: "Español", exam: "DELE" },
  { code: "fr", name: "French", nativeName: "Français", exam: "DELF / DALF" },
  { code: "de", name: "German", nativeName: "Deutsch", exam: "Goethe / ÖSD" },
  { code: "it", name: "Italian", nativeName: "Italiano", exam: "CILS" },
  { code: "ja", name: "Japanese", nativeName: "日本語", exam: "JLPT" },
  { code: "ko", name: "Korean", nativeName: "한국어", exam: "TOPIK" },
  { code: "zh", name: "Mandarin", nativeName: "中文", exam: "HSK" },
  { code: "ar", name: "Arabic", nativeName: "العربية", exam: "MSA proficiency" },
  { code: "pt", name: "Portuguese", nativeName: "Português", exam: "CELPE-Bras" },
  { code: "ru", name: "Russian", nativeName: "Русский", exam: "ТРКИ / TORFL" },
  { code: "en", name: "English", nativeName: "English", exam: "IELTS / TOEFL" },
];

export function languageByCode(code: string): Language | undefined {
  return LANGUAGES.find((l) => l.code === code);
}

export function languageByName(name: string): Language | undefined {
  const q = name.trim().toLowerCase();
  return LANGUAGES.find(
    (l) =>
      l.name.toLowerCase() === q ||
      l.nativeName.toLowerCase() === q ||
      l.code === q
  );
}
