declare const container: HTMLElement;
declare const yourIonToken: string;
// ---
import { Viewer } from "../../widgets/index.ts";

// Imagery from ion is on by default.
// Terrain is asked for by name.
const viewer = await Viewer.create(container, {
  accessToken: yourIonToken,
  globe: "terrain",
});
// --- end
export { viewer };
