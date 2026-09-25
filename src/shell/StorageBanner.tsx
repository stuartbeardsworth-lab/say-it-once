import { Button } from '../components/Button';
import { useStore } from '../store/StoreContext';

// Shown on every screen while nothing can be saved, so no one types into
// a void (docs/architecture.md, "Start-up check").
export function StorageBanner() {
  const { status, reopen } = useStore();
  if (status.kind !== 'unavailable') return null;
  return (
    <div role="alert" className="notice notice-error">
      <p className="notice-title">Say It Once can’t save on this device at the moment</p>
      <p>{status.problem.message}</p>
      <p>You can still read what is already here. Nothing new will be kept until this is fixed.</p>
      <Button variant="secondary" onPress={reopen}>
        Try again
      </Button>
    </div>
  );
}
