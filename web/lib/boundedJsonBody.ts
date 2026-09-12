export type BoundedJsonResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: 'invalid' | 'too-large' };

export async function readBoundedJson<T>(
  stream: ReadableStream<Uint8Array> | null,
  maximumBytes: number,
): Promise<BoundedJsonResult<T>> {
  if (!stream) return { ok: false, reason: 'invalid' };
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maximumBytes) {
        await reader.cancel('body-too-large').catch(() => undefined);
        return { ok: false, reason: 'too-large' };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return { ok: true, value: JSON.parse(text) as T };
  } catch {
    return { ok: false, reason: 'invalid' };
  } finally {
    reader.releaseLock();
  }
}
