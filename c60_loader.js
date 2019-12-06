// into the global scope during local developmnet
window.CESIUM_BASE_URL = "/map3d/js/develop/Cesium/Source";
import * as Cesium from "./Cesium.js";
window.Cesium = Cesium;

// Since ES6 modules have no guaranteed load order,
// only call startup if it's already defined but hasn't been called yet
//if (!window.startupCalled && typeof window.startup === 'function') {
    //debugger;

    /*global self*/
    let scope;
    if (typeof window !== 'undefined') {
        window.Cesium = Cesium;
        scope = window;
    } else if (typeof self !== 'undefined') {
        self.Cesium = Cesium;
        scope = self;
    } else if(typeof module !== 'undefined') {
        module.exports = Cesium;
        scope = module;
    } else {
        console.error('Unable to load Cesium.');
    }
    if(scope.waitCesium)
        scope.waitCesium()

    if(window.startup)
        window.startup(Cesium);
//}
