/**
 * Next hands route handlers a body stream even when the browser sent no body
 * (fetch(url, { method: "POST" })), so `request.body !== null` can't tell a
 * bodiless action from one with a payload. This reads until the first byte.
 *
 * Plain JS so both the BFF modules and node's test runner can import it.
 *
 * @param {Request} request
 * @returns {Promise<boolean>} true when the request carries no body bytes
 */
export async function bodyIsEmpty(request) {
  if (request.body === null) return true;
  const reader = request.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return true;
      if (value && value.byteLength > 0) {
        await reader.cancel().catch(() => undefined);
        return false;
      }
    }
  } catch {
    return false;
  } finally {
    reader.releaseLock();
  }
}
