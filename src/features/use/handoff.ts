// Hands Find's results to Use my record ("Use these results"). Kept in
// memory only, for the moment between the two screens; never stored.

let pending: string[] | null = null;

export function handOverResults(ids: string[]) {
  pending = [...ids];
}

/** Takes the results handed over, if any, so they are used once. */
export function takeResults(): string[] | null {
  const ids = pending;
  pending = null;
  return ids;
}
