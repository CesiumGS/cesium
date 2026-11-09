// Where the sky data store is: outside the repository, beside the frames
// store (§13.29). Packs live under `packs/<name>/`.
import { homedir } from "node:os";
import { join } from "node:path";
import process from "node:process";

/** SKY_DATA_DIR, else ~/.cesium-bench/sky. */
export function skyStoreDirectory() {
  return process.env.SKY_DATA_DIR ?? join(homedir(), ".cesium-bench", "sky");
}

/** The pack the dev server offers: SKY_PACK's name, else "default". */
export function chosenPackDirectory() {
  return join(skyStoreDirectory(), "packs", process.env.SKY_PACK ?? "default");
}
