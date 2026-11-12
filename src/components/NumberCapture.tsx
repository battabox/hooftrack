import { useRef, useState } from 'react';
import { useL, type Key } from '../lib/i18n';
import { numbersFromPhotoText, numbersFromSpeech } from '../lib/numberCapture';

type Status = { kind: 'idle' } | { kind: 'busy'; key: Key } | { kind: 'info' | 'error'; key: Key; vars?: Record<string, string> };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SpeechRecognitionCtor: any = typeof window !== 'undefined' ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : undefined;

/** Downscale and convert to high-contrast grayscale: helps OCR on yellow ear tags and keeps it fast. */
async function prepareImage(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = data.data;
    let min = 255, max = 0;
    for (let i = 0; i < px.length; i += 4) {
      const g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      px[i] = g;
      if (g < min) min = g;
      if (g > max) max = g;
    }
    const range = Math.max(1, max - min);
    for (let i = 0; i < px.length; i += 4) {
      const v = ((px[i] - min) / range) * 255; // stretch contrast
      px[i] = px[i + 1] = px[i + 2] = v;
    }
    ctx.putImageData(data, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * 🎤 / 📷 buttons. Found numbers go to onNumbers so the user can check them before using them.
 * single: for looking up one cow (shorter hints, only the first spoken number is used).
 */
export function NumberCapture({ onNumbers, single = false }: { onNumbers: (nums: string[]) => void; single?: boolean }) {
  const l = useL();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [choices, setChoices] = useState<string[]>([]);
  const recRef = useRef<{ stop: () => void } | null>(null);
  const busy = status.kind === 'busy';
  const listening = busy && (status.key === 'cap.listening' || status.key === 'cap.listeningOne');

  const listen = () => {
    if (!SpeechRecognitionCtor) { setStatus({ kind: 'error', key: 'cap.noSpeech' }); return; }
    if (recRef.current) { recRef.current.stop(); return; } // tap again = stop
    const rec = new SpeechRecognitionCtor();
    rec.lang = l.lang === 'nl' ? 'nl-NL' : 'en-GB';
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const text = Array.from(e.results as ArrayLike<ArrayLike<{ transcript: string }>>).map((r) => r[0].transcript).join(' ');
      const nums = numbersFromSpeech(text);
      if (nums.length) {
        onNumbers(single ? nums.slice(0, 1) : nums);
        setStatus({ kind: 'info', key: single ? 'cap.heardOne' : 'cap.heard', vars: { text } });
      }
      else setStatus({ kind: 'error', key: 'cap.noNumberHeard', vars: { text } });
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (e: any) => {
      const err = String(e?.error ?? 'unknown');
      setStatus(err === 'not-allowed' || err === 'service-not-allowed'
        ? { kind: 'error', key: 'cap.micDenied' }
        : err === 'no-speech' ? { kind: 'error', key: 'cap.noNumberHeard', vars: { text: '…' } }
        : { kind: 'error', key: 'cap.speechFailed', vars: { err } });
    };
    rec.onend = () => {
      recRef.current = null;
      setStatus((s) => (s.kind === 'busy' ? { kind: 'idle' } : s));
    };
    recRef.current = rec;
    setChoices([]);
    setStatus({ kind: 'busy', key: single ? 'cap.listeningOne' : 'cap.listening' });
    try { rec.start(); } catch { recRef.current = null; setStatus({ kind: 'error', key: 'cap.speechFailed', vars: { err: 'start' } }); }
  };

  const readPhoto = async (file: File) => {
    setChoices([]);
    setStatus({ kind: 'busy', key: 'cap.reading' });
    try {
      const [{ createWorker }, canvas] = await Promise.all([import('tesseract.js'), prepareImage(file)]);
      const worker = await createWorker('eng');
      try {
        // only digits (and NL) on ear tags; '11' = sparse text, tags have scattered numbers
        await worker.setParameters({
          tessedit_char_whitelist: '0123456789NL ',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tessedit_pageseg_mode: '11' as any,
        });
        const { data } = await worker.recognize(canvas);
        const nums = numbersFromPhotoText(data.text);
        if (nums.length) { setChoices(nums); setStatus({ kind: 'info', key: 'cap.pick' }); }
        else setStatus({ kind: 'error', key: 'cap.noneFound' });
      } finally {
        await worker.terminate();
      }
    } catch {
      setStatus({ kind: 'error', key: 'cap.photoFailed' });
    }
  };

  const btn = 'flex min-h-14 items-center justify-center rounded-xl border-2 border-neutral-950 px-2 text-center text-lg font-semibold leading-tight dark:border-white active:scale-[0.98]';

  return (
    <div className="mt-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={listen}
          disabled={busy && !listening}
          className={`${btn} ${listening ? 'animate-pulse bg-red-700 text-white border-red-700' : ''} disabled:opacity-40`}
        >
          {listening ? l.t('cap.stop') : single ? l.t('cap.speakOne') : l.t('cap.speak')}
        </button>
        <label className={`${btn} cursor-pointer ${busy ? 'pointer-events-none opacity-40' : ''}`}>
          {l.t('cap.photo')}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) readPhoto(f); }}
          />
        </label>
      </div>

      {status.kind !== 'idle' && (
        <p
          role="status"
          className={`mt-2 font-semibold ${status.kind === 'error' ? 'text-red-700 dark:text-red-400' : ''} ${status.kind === 'busy' ? 'animate-pulse' : ''}`}
        >
          {l.t(status.key, 'vars' in status ? status.vars : undefined)}
        </p>
      )}

      {choices.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {choices.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                onNumbers([n]);
                if (single) { setChoices([]); setStatus({ kind: 'idle' }); return; }
                setChoices((c) => c.filter((x) => x !== n));
                setStatus({ kind: 'info', key: 'cap.check' });
              }}
              className="min-h-14 rounded-xl border-2 border-green-800 bg-green-800 px-4 text-xl font-extrabold text-white"
            >
              + {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
