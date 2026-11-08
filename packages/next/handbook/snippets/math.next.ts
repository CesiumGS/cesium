// ---
import { vec3 } from "@cesium/next";

// Typed arrays. The required out comes first.
const a = vec3.vec3(1, 2, 3);
const b = vec3.vec3(4, 5, 6);
const sum = vec3.add(vec3.vec3(0, 0, 0), a, b);
// --- end
export { sum };
