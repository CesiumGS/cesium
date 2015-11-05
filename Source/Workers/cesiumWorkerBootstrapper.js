/*global require,importScripts,self*/
"use strict";

importScripts('Cesium-WebWorkers.js');

self.onmessage = function(event) {
    var data = event.data;
    var worker = require(data.workerModule);
    self.onmessage = worker;
};
