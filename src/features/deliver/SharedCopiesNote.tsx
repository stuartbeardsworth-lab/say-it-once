import { readableDate } from '../../domain/format';
import { useRecordId, useStore } from '../../store/StoreContext';
import { useLiveQuery } from '../../store/useLiveQuery';

// Shown in a delete confirmation when what is being deleted was in a report
// that left the app (docs/architecture.md, "What deletion cannot reach").
// Leave out itemIds to ask about a whole record (the one open, or recordId).

export function SharedCopiesNote({
  itemIds,
  recordId: forRecord,
}: {
  itemIds?: readonly (string | null | undefined)[];
  recordId?: string;
}) {
  const { store } = useStore();
  const openRecord = useRecordId();
  const recordId = forRecord ?? openRecord;
  const ids = itemIds?.filter((id): id is string => Boolean(id));
  const at = useLiveQuery(
    () => (recordId ? store.lastShared(recordId, ids) : Promise.resolve(null)),
    `shared:${recordId ?? ''}:${ids?.join(',') ?? '*'}`,
  );
  if (!at) return null;
  return (
    <p>
      {ids ? 'This was' : 'Parts of this record were'} in a report you shared or saved on {readableDate(at.slice(0, 10))}.
      Deleting it here can’t take back copies already given to someone.
    </p>
  );
}
