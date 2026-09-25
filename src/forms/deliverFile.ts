// Hands a file to the person: through the phone's share sheet where the
// browser offers it, otherwise as a download. The result says honestly what
// is known, because a download can't be confirmed from inside the page.

export type Delivery = 'shared' | 'cancelled' | 'downloading' | 'failed';

export async function deliverFile(contents: string, fileName: string, type: string): Promise<Delivery> {
  const file = new File([contents], fileName, { type });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // Some browsers claim they can share files and then refuse; fall back.
    }
  }
  try {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return 'downloading';
  } catch {
    return 'failed';
  }
}

export function deliveryMessage(result: Delivery, fileName: string, whatNext: string): string {
  switch (result) {
    case 'shared':
      return `Shared ${fileName}.`;
    case 'cancelled':
      return 'Nothing was shared.';
    case 'downloading':
      return `Your browser is saving ${fileName}. ${whatNext}`;
    case 'failed':
      return 'This browser couldn’t save the file. Try again, or try another browser.';
  }
}
