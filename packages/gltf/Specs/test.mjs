import { numberOfComponentsForType } from "@cesium/gltf";
import assert from "node:assert";

// NodeJS smoke screen test
assert(numberOfComponentsForType("VEC3") === 3);
