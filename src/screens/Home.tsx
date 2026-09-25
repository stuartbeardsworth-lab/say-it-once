import { DeviceOnlyBanner } from '../shell/DeviceOnlyBanner';

export function Home() {
  return (
    <>
      <h1 tabIndex={-1}>Keep everything together, so you don&rsquo;t have to start again.</h1>
      <DeviceOnlyBanner />
      <p>
        Say It Once helps you keep a record of what happened, how it affects you, and your appointments,
        treatment, costs and letters. When you need to, you can share the parts you choose.
      </p>
      <p>Adding to your record arrives in the next stage of the build.</p>
    </>
  );
}
