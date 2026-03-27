/**
 * Compute the SHA-256 hash of a string as a base64url encoded string
 * Works in node 15 and above, and in browsers
 * @returns base64url hash of `input`
 */
export async function sha256(input: string): Promise<string> {
  const crypto = globalThis.crypto;
  if (!crypto) {
    throw new Error("WebCrypto not available");
  }
  const result = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)),
  );
  const base64 = result.toBase64({ alphabet: "base64url", omitPadding: true });
  console.log("base64", base64);
  return base64;
}

/* eslint-disable-next-line no-extend-native */
Uint8Array.prototype.toBase64 ??= function toBase64(options) {
  // polyfill needed for Node and older browsers
  let result = btoa(String.fromCharCode(...this));
  if (options?.alphabet === "base64url") {
    result = result.replace(/\+/g, "-").replace(/\//g, "_");
  }
  if (options?.omitPadding) {
    result = result.replace(/=/g, "");
  }
  return result;
};

declare global {
  interface Uint8Array {
    toBase64(options: {
      alphabet?: "base64" | "base64url";
      omitPadding?: boolean;
    }): string;
  }
}
