import { StorageProblem, toStorageProblem, type StorageProblemKind } from './problems';

// The single write queue (docs/architecture.md, "The write path"). Every
// change waits for the one before it to finish, so writes can never land
// out of order (fixes D6). A failed write is reported to whoever asked for
// it and does not stop later writes.

export class WriteQueue {
  private tail: Promise<unknown> = Promise.resolve();
  private simulatedFailure: StorageProblemKind | null = null;
  private refusal: StorageProblem | null = null;

  run<T>(job: () => Promise<T>): Promise<T> {
    const result = this.tail.then(() => {
      if (this.refusal) throw this.refusal;
      if (this.simulatedFailure) {
        const kind = this.simulatedFailure;
        this.simulatedFailure = null;
        throw new StorageProblem(kind);
      }
      return job();
    });
    this.tail = result.catch(() => undefined);
    return result.catch((error: unknown) => {
      throw toStorageProblem(error);
    });
  }

  /** Waits until every write queued so far has finished. */
  settled(): Promise<void> {
    return this.tail.then(() => undefined);
  }

  /** Refuse every write from now on, for example when storage is unusable. */
  refuse(problem: StorageProblem | null) {
    this.refusal = problem;
  }

  /** For the review page only: make the next write fail as if the browser refused it. */
  simulateNextFailure(kind: StorageProblemKind | null) {
    this.simulatedFailure = kind;
  }
}
