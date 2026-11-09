/**
 * The reel's embedded data: one base64 block and an index of what's in it, both
 * inert text in the page until the reader starts the reel (vite.config.ts).
 */
export interface ReelData {
  /** The bytes at `path`, or undefined. */
  bytes(path: string): Uint8Array<ArrayBuffer> | undefined;
  /** A URL for the bytes at `path`, or undefined. */
  url(path: string): string | undefined;
  /** Frees the URLs. */
  dispose(): void;
}

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  glb: "model/gltf-binary",
  json: "application/json",
};

export function openData(): ReelData {
  const index = document.getElementById("reel-index")?.textContent;
  const block = document.getElementById("reel-data")?.textContent;
  if (!index || !block) {
    throw new Error("This copy of the page has no data for the reel in it.");
  }
  const entries = JSON.parse(index) as Record<string, [number, number]>;
  const binary = atob(block);
  const all = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    all[i] = binary.charCodeAt(i);
  }
  const urls = new Map<string, string>();
  const bytes = (path: string) => {
    const entry = entries[path];
    return entry
      ? (all.subarray(entry[0], entry[0] + entry[1]) as Uint8Array<ArrayBuffer>)
      : undefined;
  };
  return {
    bytes,
    url(path) {
      let url = urls.get(path);
      if (url) {
        return url;
      }
      const data = bytes(path);
      if (!data) {
        return undefined;
      }
      url = URL.createObjectURL(
        new Blob([data], {
          type: TYPES[path.split(".").pop()!] ?? "application/octet-stream",
        }),
      );
      urls.set(path, url);
      return url;
    },
    dispose() {
      for (const url of urls.values()) {
        URL.revokeObjectURL(url);
      }
      urls.clear();
    },
  };
}
