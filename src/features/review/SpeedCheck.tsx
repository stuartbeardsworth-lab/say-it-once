import { useState } from 'react';
import { Button } from '../../components/Button';
import type { SelfCheckResult } from '../../crypto/selfCheck';

// Review page only: how long unlocking takes on this phone with the real
// Argon2id settings, and whether encryption works here at all.

type State = { step: 'start' } | { step: 'running' } | { step: 'done'; result: SelfCheckResult } | { step: 'failed'; message: string };

export function SpeedCheck() {
  const [state, setState] = useState<State>({ step: 'start' });

  async function run() {
    setState({ step: 'running' });
    try {
      const { runSelfCheck } = await import('../../crypto/selfCheck');
      setState({ step: 'done', result: await runSelfCheck() });
    } catch (error) {
      setState({ step: 'failed', message: error instanceof Error ? error.message : String(error) });
    }
  }

  return (
    <section aria-labelledby="bb-speed">
      <h2 id="bb-speed">How fast is this phone?</h2>
      <p>
        Times one passphrase unlock with the settings Say It Once will use, and checks that encryption works on this
        device. Nothing is saved or sent. Try it on the oldest phone you can: it should take under two seconds.
      </p>
      <Button onPress={() => void run()} isDisabled={state.step === 'running'}>
        {state.step === 'running' ? 'Checking…' : 'Run the check'}
      </Button>
      <div role="status">
        {state.step === 'done' && (
          <p>
            Unlocking took <strong>{(state.result.unlockMs / 1000).toFixed(2)} seconds</strong> ({state.result.opsLimit} passes,{' '}
            {state.result.memLimitMiB} MB of memory). Encryption on this device:{' '}
            <strong>{state.result.roundTrip ? 'works' : 'did NOT work'}</strong>.
          </p>
        )}
      </div>
      <div role="alert">
        {state.step === 'failed' && (
          <p className="notice notice-error">The check couldn’t run on this device: {state.message}</p>
        )}
      </div>
    </section>
  );
}
