/** The SHA-256 of `bytes`, as lower-case hex (`crypto.subtle`, in Node and the browser). */
export async function sha256Hex(
  bytes: ArrayBuffer | Uint8Array,
): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  let hex = "";
  for (const b of new Uint8Array(digest)) {
    hex += b.toString(16).padStart(2, "0");
  }
  return hex;
}
