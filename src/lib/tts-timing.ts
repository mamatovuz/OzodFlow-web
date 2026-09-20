export type WordTiming = { time: number; duration: number; text: string };
export type WordCue = WordTiming & { charIndex: number };

// Match the actual spoken words, never distribute words evenly over audio duration.
export function mapWordTimings(text: string, timings: WordTiming[]): WordCue[] {
  const normalize = (value: string) => value.replace(/[‘’ʻʼ`]/g, "'").toLowerCase();
  const source = normalize(text);
  let cursor = 0;
  const cues: WordCue[] = [];
  for (const timing of timings) {
    if (!Number.isFinite(timing.time) || timing.time < 0 || !timing.text) continue;
    const word = normalize(timing.text);
    const index = source.indexOf(word, cursor);
    if (index < 0) continue;
    cues.push({ ...timing, charIndex: index });
    cursor = index + word.length;
  }
  return cues.sort((a, b) => a.time - b.time);
}

export function cueAtTime(cues: WordCue[], seconds: number): WordCue | undefined {
  let low = 0;
  let high = cues.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    if (cues[mid].time <= seconds) { found = mid; low = mid + 1; }
    else high = mid - 1;
  }
  return found < 0 ? undefined : cues[found];
}
