declare const container: HTMLElement;
// ---
import { Viewer } from "../../widgets/index.ts";

// A globe with imagery and controls, in one call.
const viewer = await Viewer.create(container);
// --- end
export { viewer };
