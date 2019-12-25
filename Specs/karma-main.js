/*global __karma__*/
import customizeJasmine from './customizeJasmine.js';

var included = '';
var excluded = '';
var webglValidation = false;
var webglStub = false;
var release = false;

if (__karma__.config.args) {
    included = __karma__.config.args[0];
    excluded = __karma__.config.args[1];
    webglValidation = __karma__.config.args[2];
    webglStub = __karma__.config.args[3];
    release = __karma__.config.args[4];
}

if (release) {
    window.CESIUM_BASE_URL = 'base/Build/Cesium';
} else {
    window.CESIUM_BASE_URL = 'base/Source';
}

jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
customizeJasmine(jasmine.getEnv(), included, excluded, webglValidation, webglStub, release);
