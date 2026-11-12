// Turning speech transcripts and photo text (OCR) into cow numbers.
// The app never adds these automatically: they are shown to the trimmer to check first.

const DIGIT_WORDS: Record<string, string> = {
  nul: '0', zero: '0', oh: '0',
  een: '1', één: '1', one: '1',
  twee: '2', two: '2',
  drie: '3', three: '3',
  vier: '4', four: '4', for: '4',
  vijf: '5', five: '5',
  zes: '6', six: '6',
  zeven: '7', seven: '7',
  acht: '8', eight: '8',
  negen: '9', nine: '9',
};

/** Words that separate one cow from the next when speaking a list. */
const SEPARATORS = /\b(?:en|and|volgende|next|dan|then|komma|comma)\b|[,;.\n]/i;

/**
 * "1234 en 5678" → ["1234", "5678"]; "12 34" → ["1234"]; "een twee drie vier" → ["1234"].
 * Digits inside one spoken chunk are joined, because recognisers often split long numbers.
 */
export function numbersFromSpeech(transcript: string): string[] {
  const out: string[] = [];
  for (const chunk of transcript.toLowerCase().split(SEPARATORS)) {
    if (!chunk) continue;
    const digits = chunk
      .split(/\s+/)
      .map((w) => (/^\d+$/.test(w) ? w : DIGIT_WORDS[w.replace(/[^\p{L}]/gu, '')] ?? ''))
      .join('');
    if (digits.length >= 1 && !out.includes(digits)) out.push(digits);
  }
  return out;
}

/**
 * OCR text from an ear-tag photo → candidate numbers (3+ digits), longest first.
 * A line starting with "NL" keeps the country code (e.g. "NL 123456789").
 */
export function numbersFromPhotoText(text: string): string[] {
  const found: string[] = [];
  const add = (n: string) => { if (n && !found.includes(n)) found.push(n); };
  for (const raw of text.toUpperCase().split(/\n+/)) {
    const line = raw.replace(/[O]/g, '0').replace(/[IL|](?=\d)/g, '1').trim();
    const nl = line.match(/^N1?L?\s*([\d\s]{3,})$/) || line.match(/^NL\s*([\d\s]{3,})$/);
    if (nl) { add(`NL ${nl[1].replace(/\s+/g, '')}`); continue; }
    // every run of digits (spaces inside allowed) with at least 3 digits
    for (const m of line.matchAll(/\d[\d\s]*\d|\d/g)) {
      const d = m[0].replace(/\s+/g, '');
      if (d.length >= 3) add(d);
    }
  }
  return found.sort((a, b) => b.replace(/\D/g, '').length - a.replace(/\D/g, '').length);
}
