// This file load the ES6 unbuilt version of Cesium
// into the global scope during local developmnet
import * as Cesium from "../../../Source/Cesium.js";
window.Cesium = Cesium;

// Since ES6 modues have no gauranteed load order,
// only call startup if it's already defined but hasn't been called yet
if (!window.startupCalled && typeof window.startup === 'function') {
    window.startup(Cesium);
}
