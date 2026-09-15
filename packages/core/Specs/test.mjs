import { Cartesian3 } from "@cesium/core";
import assert from "node:assert";

// NodeJS smoke screen test
const cartesian = Cartesian3.fromDegrees(-75.59777, 40.03883);
assert(cartesian instanceof Cartesian3);
