/**
 * Normalizes multilingual search text across English, French, and Arabic:
 * - Strips Arabic diacritics (tashkeel) and tatweel
 * - Normalizes Alif variants (أ/إ/آ/ٱ -> ا), Ta Marbuta (ة -> ه), and Alif Maqsura (ى -> ي)
 * - Strips French/Latin combining diacritics for accent-tolerant search
 */
export function normalizeSearchText(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase()
    .trim();
}
