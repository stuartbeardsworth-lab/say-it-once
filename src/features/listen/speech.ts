import { useEffect, useRef, useState } from 'react';

// Reading aloud with the phone's or computer's own voice (the Web Speech
// API). Nothing is sent anywhere, and it works offline where the device has
// a voice installed, as phones do.

export type SpeechState = 'idle' | 'speaking' | 'paused';

// The parts of a page worth hearing, in reading order (docs/spec.md,
// "Reading aids"): headings, text, hints, labels and summaries.
const blockSelector =
  'h1, h2, h3, h4, p, li, label, legend, summary, dt, dd, th, td, .task-card-title, .task-card-detail, .field-hint';
const maxBlocks = 60;

/** The text of each block in `root` that's on screen, without repeats from blocks nested inside others. */
export function pageBlocks(root: HTMLElement): string[] {
  const blocks: string[] = [];
  for (const el of root.querySelectorAll<HTMLElement>(blockSelector)) {
    const outer = el.parentElement?.closest(blockSelector);
    if (outer && root.contains(outer)) continue;
    if (el.closest('[aria-hidden="true"], [hidden], .no-listen')) continue;
    // A collapsed section's contents aren't shown, so they aren't read.
    const details = el.closest('details');
    if (details && !details.open && !el.closest('summary')) continue;
    const text = (el.innerText ?? el.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (text) blocks.push(text);
    if (blocks.length === maxBlocks) break;
  }
  return blocks;
}

// Only voices the device says are built in (localService), so the words
// aren't sent to an online speech service. A British English voice if there
// is one, otherwise any built-in English voice, otherwise the device's own
// default.
function voice(): SpeechSynthesisVoice | undefined {
  const local = window.speechSynthesis.getVoices().filter((v) => v.localService);
  return local.find((v) => v.lang === 'en-GB') ?? local.find((v) => v.lang.startsWith('en'));
}

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

/** Speaks a list of blocks one after another, with pause, resume and stop. Stops when the component goes. */
export function useReadAloud() {
  const supported = speechSupported();
  const [state, setState] = useState<SpeechState>('idle');
  // Each start gets a number, so a cancelled reading's last "end" doesn't
  // mark a newer one as finished.
  const run = useRef(0);

  useEffect(
    () => () => {
      if (supported) window.speechSynthesis.cancel();
    },
    [supported],
  );

  function stop() {
    run.current++;
    if (supported) window.speechSynthesis.cancel();
    setState('idle');
  }

  function start(blocks: string[]) {
    if (!supported) return;
    const thisRun = ++run.current;
    window.speechSynthesis.cancel();
    const chosen = voice();
    blocks.forEach((text, i) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-GB';
      utterance.rate = 0.86;
      if (chosen) utterance.voice = chosen;
      if (i === blocks.length - 1) {
        utterance.onend = () => {
          if (run.current === thisRun) setState('idle');
        };
      }
      utterance.onerror = () => {
        if (run.current === thisRun) setState('idle');
      };
      window.speechSynthesis.speak(utterance);
    });
    setState(blocks.length ? 'speaking' : 'idle');
  }

  function pause() {
    window.speechSynthesis.pause();
    setState('paused');
  }

  function resume() {
    window.speechSynthesis.resume();
    setState('speaking');
  }

  return { supported, state, start, stop, pause, resume };
}
