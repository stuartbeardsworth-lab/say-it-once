import { useFileUrl } from '../../store/useFileUrl';

/** Opens a stored file (a letter, a scan) in a new tab. */
export function FileLink({ fileId, children }: { fileId: string; children: string }) {
  const url = useFileUrl(fileId);
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener">
      {children}
      <span className="visually-hidden"> (opens in a new tab)</span>
    </a>
  );
}
