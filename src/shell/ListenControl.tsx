import { useEffect } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { Button } from '../components/Button';
import { pageBlocks, useReadAloud } from '../features/listen/speech';
import type { Location } from '../router';

// "Listen" in the header reads the page aloud, for people who would rather
// hear it than read it (docs/spec.md, "Reading aids"). While it reads, a bar
// under the header offers Pause and Stop. Moving to another screen stops it.

export function useListen(location: Location, main: () => HTMLElement | null) {
  const speech = useReadAloud();
  const { stop } = speech;

  useEffect(() => {
    stop();
    // Only a change of screen should stop the reading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  return {
    ...speech,
    listen() {
      const root = main();
      if (root) speech.start(pageBlocks(root));
    },
  };
}

export type Listen = ReturnType<typeof useListen>;

export function ListenButton({ listen }: { listen: Listen }) {
  if (!listen.supported) return null;
  const on = listen.state !== 'idle';
  return (
    <AriaButton className="header-button" onPress={on ? listen.stop : listen.listen}>
      <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 10v4h4l5 4V6L8 10H4z" fill="currentColor" stroke="none" />
        <path d="M16 9.5c1.1 1.1 1.1 3.9 0 5M18.5 7c2.7 2.7 2.7 7.3 0 10" />
      </svg>
      {on ? 'Stop' : 'Listen'}
    </AriaButton>
  );
}

export function ListenBar({ listen }: { listen: Listen }) {
  if (listen.state === 'idle') return null;
  return (
    <div className="listen-bar no-print" role="region" aria-label="Reading aloud">
      <div className="container listen-bar-inner">
        <p>{listen.state === 'paused' ? 'Paused.' : 'Reading this page aloud.'}</p>
        <div className="listen-bar-actions">
          {listen.state === 'paused' ? (
            <Button onPress={listen.resume}>Carry on</Button>
          ) : (
            <Button onPress={listen.pause}>Pause</Button>
          )}
          <Button onPress={listen.stop}>Stop</Button>
        </div>
      </div>
    </div>
  );
}
