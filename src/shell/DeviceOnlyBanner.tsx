// Shown on Home and Privacy & backup while the record is kept only on this
// device (docs/architecture.md, "Device-only start").
export function DeviceOnlyBanner() {
  return (
    <aside aria-label="Where your record is kept" className="notice notice-info">
      <p className="notice-title">Only on this phone</p>
      <p>If the phone or browser data is lost, so is your record.</p>
    </aside>
  );
}
